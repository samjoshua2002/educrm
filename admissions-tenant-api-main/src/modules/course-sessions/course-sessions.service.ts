import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CourseSession } from './entities/course-session.entity.js';
import { CreateCourseSessionDto } from './dto/create-course-session.dto.js';
import { UpdateCourseSessionDto } from './dto/update-course-session.dto.js';
import { CoursesService } from '../courses/courses.service.js';
import { AcademicSessionsService } from '../academic-sessions/academic-sessions.service.js';

@Injectable()
export class CourseSessionsService {
  constructor(
    @InjectRepository(CourseSession)
    private readonly courseSessionRepository: Repository<CourseSession>,
    private readonly coursesService: CoursesService,
    private readonly academicSessionsService: AcademicSessionsService,
  ) {}

  async create(orgId: string, createDto: CreateCourseSessionDto, actorId: string) {
    await this.coursesService.validateCourseExists(createDto.courseId, orgId);
    
    // Validate session
    const session = await this.academicSessionsService.findOne(createDto.academicSessionId, orgId);
    if (!session.isActive) {
      throw new BadRequestException('Cannot link to an inactive academic session.');
    }

    const existing = await this.courseSessionRepository.findOne({
      where: { 
        organizationId: orgId, 
        courseId: createDto.courseId, 
        academicSessionId: createDto.academicSessionId 
      }
    });

    if (existing) {
      throw new BadRequestException('This course is already linked to this academic session.');
    }

    const cs = this.courseSessionRepository.create({
      ...createDto,
      organizationId: orgId,
      createdBy: actorId,
      updatedBy: actorId,
    });

    return this.courseSessionRepository.save(cs);
  }

  async findAllByOrg(orgId: string, filters?: { courseId?: string; academicSessionId?: string; isActive?: boolean }) {
    const query = this.courseSessionRepository.createQueryBuilder('cs')
      .leftJoinAndSelect('cs.course', 'course')
      .leftJoinAndSelect('cs.academicSession', 'academicSession')
      .where('cs.organization_id = :orgId', { orgId });

    if (filters?.courseId) {
      query.andWhere('cs.course_id = :courseId', { courseId: filters.courseId });
    }
    if (filters?.academicSessionId) {
      query.andWhere('cs.academic_session_id = :sessionId', { sessionId: filters.academicSessionId });
    }
    if (filters?.isActive !== undefined) {
      query.andWhere('cs.is_active = :isActive', { isActive: filters.isActive });
    }

    return query.getMany();
  }

  async findByCourseAndSession(courseId: string, sessionId: string, orgId: string) {
    return this.courseSessionRepository.findOne({
      where: { courseId, academicSessionId: sessionId, organizationId: orgId }
    });
  }

  async findOne(id: string, orgId: string) {
    const cs = await this.courseSessionRepository.findOne({
      where: { id, organizationId: orgId },
      relations: ['course', 'academicSession']
    });
    if (!cs) {
      throw new NotFoundException(`Course session #${id} not found`);
    }
    return cs;
  }

  async update(id: string, orgId: string, updateDto: UpdateCourseSessionDto, actorId: string) {
    const cs = await this.findOne(id, orgId);
    Object.assign(cs, updateDto);
    cs.updatedBy = actorId;
    return this.courseSessionRepository.save(cs);
  }

  async remove(id: string, orgId: string, actorId: string) {
    const cs = await this.findOne(id, orgId);
    cs.isActive = false;
    cs.updatedBy = actorId;
    return this.courseSessionRepository.save(cs);
  }
}
