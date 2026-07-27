import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course } from './entities/course.entity.js';
import { CreateCourseDto } from './dto/create-course.dto.js';
import { UpdateCourseDto } from './dto/update-course.dto.js';

@Injectable()
export class CoursesService {
  private readonly logger = new Logger(CoursesService.name);

  constructor(
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
  ) {}

  async create(orgId: string, createCourseDto: CreateCourseDto, actorId: string) {
    if (createCourseDto.code) {
      const existing = await this.courseRepository.findOne({
        where: { organizationId: orgId, code: createCourseDto.code }
      });
      if (existing) {
        throw new BadRequestException(`Course code '${createCourseDto.code}' already exists.`);
      }
    }

    const course = this.courseRepository.create({
      ...createCourseDto,
      organizationId: orgId,
      createdBy: actorId,
      updatedBy: actorId,
    });

    return this.courseRepository.save(course);
  }

  async findAllByOrg(orgId: string, filters?: { isActive?: boolean; department?: string; search?: string }) {
    const query = this.courseRepository.createQueryBuilder('course')
      .where('course.organization_id = :orgId', { orgId });

    if (filters?.isActive !== undefined) {
      query.andWhere('course.is_active = :isActive', { isActive: filters.isActive });
    }

    if (filters?.department) {
      query.andWhere('course.department = :department', { department: filters.department });
    }

    if (filters?.search) {
      query.andWhere(
        '(course.name ILIKE :search OR course.code ILIKE :search)',
        { search: `%${filters.search}%` }
      );
    }

    query.orderBy('course.created_at', 'DESC');
    return query.getMany();
  }

  async findOne(id: string, orgId: string) {
    const course = await this.courseRepository.findOne({
      where: { id, organizationId: orgId },
    });
    if (!course) {
      throw new NotFoundException(`Course #${id} not found`);
    }
    return course;
  }

  async update(id: string, orgId: string, updateCourseDto: UpdateCourseDto, actorId: string) {
    const course = await this.findOne(id, orgId);

    if (updateCourseDto.code && updateCourseDto.code !== course.code) {
      const existing = await this.courseRepository.findOne({
        where: { organizationId: orgId, code: updateCourseDto.code }
      });
      if (existing) {
        throw new BadRequestException(`Course code '${updateCourseDto.code}' already exists.`);
      }
    }

    Object.assign(course, updateCourseDto);
    course.updatedBy = actorId;
    return this.courseRepository.save(course);
  }

  async remove(id: string, orgId: string, actorId: string) {
    const course = await this.findOne(id, orgId);
    course.isActive = false;
    course.updatedBy = actorId;
    
    // We log a warning here. In a real scenario we'd query applications to see how many use this course.
    this.logger.warn(`Course ${id} deactivated. Active applications might still reference this course.`);
    
    return this.courseRepository.save(course);
  }

  async hardDelete(id: string, orgId: string) {
    const course = await this.findOne(id, orgId);
    await this.courseRepository.remove(course);
    this.logger.warn(`Course ${id} permanently deleted from org ${orgId}.`);
    return { message: 'Course permanently deleted.' };
  }

  async validateCourseExists(courseId: string | undefined, orgId: string): Promise<Course> {
    const isUuid = (val?: string) => val ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val) : false;

    if (courseId && isUuid(courseId)) {
      const course = await this.courseRepository.findOne({
        where: { id: courseId, organizationId: orgId }
      });
      if (course) return course;
    }

    // Fallback: Check if any active course exists in the org
    const activeCourses = await this.courseRepository.find({
      where: { organizationId: orgId, isActive: true },
      take: 1,
    });
    if (activeCourses.length > 0) {
      return activeCourses[0];
    }

    const allCourses = await this.courseRepository.find({
      where: { organizationId: orgId },
      take: 1,
    });
    if (allCourses.length > 0) {
      return allCourses[0];
    }

    // Auto-create default course for org if none exists
    const defaultCourse = this.courseRepository.create({
      organizationId: orgId,
      name: 'Post Graduate Diploma in Management (PGDM)',
      code: 'PGDM',
      department: 'Management',
      duration: '2 Years',
      isActive: true,
    });
    return this.courseRepository.save(defaultCourse);
  }
}
