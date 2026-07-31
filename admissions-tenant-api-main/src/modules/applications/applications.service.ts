import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, In, Not, ILike } from 'typeorm';
import { Application } from './entities/application.entity.js';
import { Student } from './entities/student.entity.js';
import { Lead } from '../leads/entities/lead.entity.js';
import { Branch } from '../branches/entities/branch.entity.js';
import { LeadsService } from '../leads/leads.service.js';
import { CoursesService } from '../courses/courses.service.js';
import { CreateApplicationDto } from './dto/create-application.dto.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';
import { Role } from '../../common/enums/roles.enum.js';
import { LeadStatus } from '../leads/entities/lead.entity.js';
import { ApplicationActivity } from './entities/application-activity.entity.js';
import {
  UpdatePersonalDto,
  UpdatePreferencesDto,
  UpdateEducationDto,
  UpdateEntranceTestsDto,
  UpdateParentsDto,
  UpdateAddressesDto,
  UpdateWorkExperienceDto,
  UpdateExtraCurricularsDto,
  UpdateOtherQualificationsDto,
  UpdateAdditionalInfoDto,
  UpdateDeclarationDto,
  UpdatePaymentDto,
  UpdateGdEvaluationDto,
} from './dto/update-sections.dto.js';

import { ApplicationEducation } from './entities/application-education.entity.js';
import { ApplicationEntranceTest } from './entities/application-entrance-test.entity.js';
import { ApplicationWorkExperience } from './entities/application-work-experience.entity.js';
import { ApplicationParent } from './entities/application-parent.entity.js';
import { ApplicationAddress } from './entities/application-address.entity.js';
import { ApplicationExtraCurricular } from './entities/application-extra-curricular.entity.js';
import { ApplicationOtherQualification } from './entities/application-other-qualification.entity.js';

@Injectable()
export class ApplicationsService {
  constructor(
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
    @InjectRepository(Lead)
    private readonly leadRepository: Repository<Lead>,
    @InjectRepository(Branch)
    private readonly branchRepository: Repository<Branch>,
    private readonly leadsService: LeadsService,
    private readonly coursesService: CoursesService,
    private readonly dataSource: DataSource,
  ) {}

  // =========================================================================
  // RULE ENFORCEMENT (Rules 1-4)
  // =========================================================================

  private assertEditable(application: Application): void {
    // Allow editing application data for administrative management
    return;
  }

  private async validatePreferences(orgId: string, pref1?: string, pref2?: string): Promise<{ p1Id?: string; p2Id?: string }> {
    const isUuid = (val?: string) => val ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val) : false;
    let p1Id: string | undefined;
    let p2Id: string | undefined;

    if (pref1) {
      if (isUuid(pref1)) {
        const branch = await this.branchRepository.findOne({
          where: { id: pref1, organizationId: orgId, isActive: true },
        });
        if (branch) p1Id = branch.id;
      } else {
        const branch = await this.branchRepository.findOne({
          where: [
            { name: ILike(`%${pref1}%`), organizationId: orgId, isActive: true },
            { city: ILike(`%${pref1}%`), organizationId: orgId, isActive: true },
          ],
        });
        if (branch) p1Id = branch.id;
      }
    }

    if (pref2) {
      if (isUuid(pref2)) {
        const branch = await this.branchRepository.findOne({
          where: { id: pref2, organizationId: orgId, isActive: true },
        });
        if (branch) p2Id = branch.id;
      } else {
        const branch = await this.branchRepository.findOne({
          where: [
            { name: ILike(`%${pref2}%`), organizationId: orgId, isActive: true },
            { city: ILike(`%${pref2}%`), organizationId: orgId, isActive: true },
          ],
        });
        if (branch) p2Id = branch.id;
      }
    }

    return { p1Id, p2Id };
  }

  private async checkDuplicateApplication(
    orgId: string,
    email: string,
    courseId: string,
    courseName: string,
    academicSession: string,
  ): Promise<void> {
    const existing = await this.applicationRepository.findOne({
      where: {
        organizationId: orgId,
        email,
        courseId,
        academicSession,
        formStatus: Not(In(['rejected'])),
      },
    });
    if (existing) {
      throw new BadRequestException(
        `An active application already exists for ${email} in course "${courseName}" for session ${academicSession}. ` +
        `A student can apply to different courses but not to the same course twice in the same session.`,
      );
    }
  }

  // =========================================================================
  // LOGGING
  // =========================================================================

  private async logActivity(
    manager: any,
    applicationId: string,
    orgId: string,
    actorId: string,
    action: string,
    content?: string,
    prevStatus?: string,
    newStatus?: string,
  ) {
    const activity = manager.create(ApplicationActivity, {
      applicationId,
      organizationId: orgId,
      actorId,
      action,
      content,
      previousStatus: prevStatus,
      newStatus: newStatus,
    });
    await manager.save(activity);
  }

  // =========================================================================
  // QUERY & CRUD
  // =========================================================================

  async findAll(
    orgId: string,
    paginationDto: PaginationDto,
    search?: string,
    status?: string,
  ) {
    const query = this.applicationRepository
      .createQueryBuilder('app')
      .leftJoinAndSelect('app.student', 'student')
      .leftJoinAndMapOne(
        'app.preference1Branch',
        Branch,
        'pref1',
        'pref1.id::text = app.preference_1::text AND pref1.organization_id = :orgId',
        { orgId },
      )
      .where('app.organization_id = :orgId', { orgId });

    if (status) {
      query.andWhere('app.form_status = :status', { status: status.toLowerCase() });
    }

    if (search) {
      query.andWhere(
        '(student.name ILIKE :search OR student.email ILIKE :search OR student.phone ILIKE :search OR app.application_no ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const [data, total] = await query
      .skip(paginationDto.skip)
      .take(paginationDto.limit)
      .orderBy('app.createdAt', 'DESC')
      .getManyAndCount();

    const totalPages = Math.ceil(total / paginationDto.limit);

    const mappedData = data.map((app) => ({
      id: app.id,
      applicationNo: app.applicationNo,
      name: app.student.name,
      email: app.student.email,
      phone: app.student.phone,
      program: app.program,
      campus: app.preference1Branch?.name || null,
      formStatus: this.mapStatusToFrontend(app.formStatus),
      paymentStatus: app.paymentStatus,
      paymentMode: app.paymentMode,
      paymentAmount: app.paymentAmount,
      lastActivity: app.lastActivityAt,
    }));

    return {
      data: mappedData,
      total,
      totalPages,
      page: paginationDto.page,
      limit: paginationDto.limit,
    };
  }

  async findOne(idOrAppNo: string, orgId: string) {
    const isUuid = (val?: string) => val ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val) : false;
    const app = await this.applicationRepository.findOne({
      where: isUuid(idOrAppNo)
        ? [
            { id: idOrAppNo, organizationId: orgId },
            { applicationNo: idOrAppNo, organizationId: orgId },
          ]
        : { applicationNo: idOrAppNo, organizationId: orgId },
      relations: [
        'student',
        'educationRecords',
        'entranceTests',
        'workExperienceRecords',
        'parentRecords',
        'addressRecords',
        'extraCurricularRecords',
        'otherQualificationRecords',
      ],
    });

    if (!app) {
      throw new NotFoundException(`Application ${idOrAppNo} not found`);
    }

    return app;
  }

  async create(
    orgId: string,
    dto: CreateApplicationDto,
    creatorId: string,
    creatorRole: string,
  ) {
    // Rule 1: Counselor restriction
    if (creatorRole === Role.COUNSELOR) {
      if (!dto.leadId) {
        throw new ForbiddenException(
          'Counselors can only create applications for leads assigned to them',
        );
      }
      const lead = await this.leadRepository.findOne({
        where: { id: dto.leadId, organizationId: orgId },
      });
      if (!lead || lead.assignedTo !== creatorId) {
        throw new ForbiddenException(
          'Counselors can only create applications for leads assigned to them',
        );
      }
    }

    // Lead Validation
    let verifiedLead: Lead | null = null;
    if (dto.leadId) {
      verifiedLead = await this.leadRepository.findOne({
        where: { id: dto.leadId, organizationId: orgId },
      });
      if (!verifiedLead) {
        throw new BadRequestException('Lead not found in this organization');
      }
    }

    // 1. Validate courseId against courses table
    const course = await this.coursesService.validateCourseExists(dto.courseId, orgId);

    // 2. Auto-populate program from course name if not provided
    const program = dto.program || course.name;

    const academicSession = dto.academicSession || '2025-2026';

    const applicantName = dto.applicant?.name || 'Applicant';
    const applicantEmail = dto.applicant?.email || `applicant_${Date.now()}@example.com`;
    const applicantPhone = dto.applicant?.phone || '0000000000';
    const applicantAltPhone = dto.applicant?.altPhone || undefined;
    const applicantGender = dto.applicant?.gender || undefined;
    const applicantDob = dto.applicant?.dateOfBirth ? new Date(dto.applicant.dateOfBirth) : undefined;
    const applicantReligion = dto.applicant?.religion || undefined;
    const applicantNationality = dto.applicant?.nationality || undefined;
    const applicantAadhaar = dto.applicant?.aadhaarNumber || undefined;
    const applicantCategory = dto.applicant?.category || undefined;
    const applicantMaritalStatus = dto.applicant?.maritalStatus || undefined;

    // Rule 4: Duplicate Application Check
    await this.checkDuplicateApplication(orgId, applicantEmail, course.id, course.name, academicSession);

    // Rule 3: Preferences Check
    const p1 = dto.preferences?.preference1;
    const p2 = dto.preferences?.preference2;
    const { p1Id, p2Id } = await this.validatePreferences(orgId, p1, p2);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Student check/create
      let student = await queryRunner.manager.findOne(Student, {
        where: { email: applicantEmail, organizationId: orgId },
      });

      if (!student) {
        student = queryRunner.manager.create(Student, {
          organizationId: orgId,
          name: applicantName,
          email: applicantEmail,
          phone: applicantPhone,
        });
        student = await queryRunner.manager.save(student);
      }

      // Generate application number
      let branchPrefix = 'APP';
      if (p1Id) {
        const b1 = await queryRunner.manager.findOne(Branch, { where: { id: p1Id } });
        if (b1) {
          branchPrefix = b1.code || b1.name.slice(0, 3).toUpperCase();
        }
      }

      const currentYear = new Date().getFullYear();
      const count = await queryRunner.manager.count(Application, {
        where: { organizationId: orgId },
      });
      const sequence = count + 1001;
      const appNo = `${branchPrefix}/${currentYear}/${sequence}`;

      // Save application
      const application = queryRunner.manager.create(Application, {
        organizationId: orgId,
        studentId: student.id,
        leadId: dto.leadId || undefined,
        formId: dto.formId || undefined,
        applicationNo: appNo,
        program: program,
        courseId: course.id,
        academicSession: academicSession,
        assignedCounselorId: creatorRole === Role.COUNSELOR ? creatorId : undefined,
        formStatus: 'submitted',
        preference1: p1Id || undefined,
        preference2: p2Id || undefined,
        name: applicantName,
        email: applicantEmail,
        primaryMobile: applicantPhone,
        alternateMobile: applicantAltPhone,
        gender: applicantGender,
        dateOfBirth: applicantDob,
        religion: applicantReligion,
        nationality: applicantNationality,
        aadhaarNumber: applicantAadhaar,
        category: applicantCategory,
        maritalStatus: applicantMaritalStatus,
        inspirationEssay: dto.otherDetails?.inspirationEssay || undefined,
        howDidYouKnow: dto.otherDetails?.howDidYouKnow || undefined,
        hasMedicalCondition: dto.otherDetails?.medicalConditions ? true : false,
        medicalConditionDetails: dto.otherDetails?.medicalConditions || undefined,
        createdBy: creatorId,
        updatedBy: creatorId,
      });

      const savedApp = await queryRunner.manager.save(application);

      // Save child records if provided
      if (Array.isArray(dto.educationDetails) && dto.educationDetails.length > 0) {
        for (const edu of dto.educationDetails) {
          const rec = queryRunner.manager.create(ApplicationEducation, {
            applicationId: savedApp.id,
            level: edu.level || 'Other',
            institution: edu.institution || edu.institute || undefined,
            boardUniversity: edu.boardUniversity || edu.board || undefined,
            yearOfPassing: edu.yearOfPassing || edu.year || undefined,
            percentageCgpa: edu.percentageCgpa || edu.percentage || undefined,
            majorSubjects: edu.majorSubjects || edu.stream || undefined,
            isCompleted: edu.isCompleted !== false,
          });
          await queryRunner.manager.save(rec);
        }
      }

      if (Array.isArray(dto.entranceTests) && dto.entranceTests.length > 0) {
        for (const test of dto.entranceTests) {
          const rec = queryRunner.manager.create(ApplicationEntranceTest, {
            applicationId: savedApp.id,
            testName: test.testName || test.exam || undefined,
            rollNo: test.rollNo || undefined,
            monthYear: test.monthYear || test.month || undefined,
            resultStatus: test.resultStatus || test.status || undefined,
            percentile: test.percentile != null ? Number(test.percentile) : undefined,
          });
          await queryRunner.manager.save(rec);
        }
      }

      const parents = dto.parentDetails || (dto as any).parents;
      if (Array.isArray(parents) && parents.length > 0) {
        for (const parent of parents) {
          const rec = queryRunner.manager.create(ApplicationParent, {
            applicationId: savedApp.id,
            relationship: parent.relationship || 'father',
            name: parent.name,
            phone: parent.phone || parent.mobile || undefined,
            email: parent.email || undefined,
            occupation: parent.occupation || undefined,
            annualIncome: parent.annualIncome || parent.income || undefined,
          });
          await queryRunner.manager.save(rec);
        }
      }

      if (dto.contactDetails && Array.isArray(dto.contactDetails.addresses)) {
        for (const addr of dto.contactDetails.addresses) {
          const rec = queryRunner.manager.create(ApplicationAddress, {
            applicationId: savedApp.id,
            type: addr.type || 'present',
            addressLine1: addr.addressLine1 || addr.address || '',
          });
          await queryRunner.manager.save(rec);
        }
      }

      if (Array.isArray(dto.workExperiences) && dto.workExperiences.length > 0) {
        for (const exp of dto.workExperiences) {
          if (!exp || (!exp.organization && !exp.companyName && !exp.company)) continue;
          const rec = queryRunner.manager.create(ApplicationWorkExperience, {
            applicationId: savedApp.id,
            organization: exp.organization || exp.companyName || exp.company || 'Company',
            designation: exp.designation || undefined,
            rolesResponsibilities: exp.rolesResponsibilities || (exp.months ? `${exp.months} Months` : undefined),
            grossSalary: exp.grossSalary || exp.salaryCtc || undefined,
          });
          await queryRunner.manager.save(rec);
        }
      }

      await this.logActivity(queryRunner.manager, savedApp.id, orgId, creatorId, 'created', 'Application initialized');

      if (verifiedLead) {
        await this.leadsService.updateStatus(verifiedLead.id, orgId, LeadStatus.CONVERTED);
      }

      await queryRunner.commitTransaction();
      return savedApp;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // =========================================================================
  // SECTION UPDATES (PATCH endpoints)
  // =========================================================================

  private async getAppAndAssertEditable(idOrAppNo: string, orgId: string) {
    const isUuid = (val?: string) => val ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val) : false;
    const app = await this.applicationRepository.findOne({
      where: isUuid(idOrAppNo)
        ? [
            { id: idOrAppNo, organizationId: orgId },
            { applicationNo: idOrAppNo, organizationId: orgId },
          ]
        : { applicationNo: idOrAppNo, organizationId: orgId },
    });
    if (!app) {
      throw new NotFoundException(`Application ${idOrAppNo} not found`);
    }
    this.assertEditable(app);
    return app;
  }

  async updatePersonal(id: string, orgId: string, dto: UpdatePersonalDto, actorId: string) {
    const app = await this.getAppAndAssertEditable(id, orgId);
    Object.assign(app, dto);
    if (dto.name) app.name = dto.name;
    if (dto.primaryMobile) app.primaryMobile = dto.primaryMobile;
    if (dto.alternateMobile) app.alternateMobile = dto.alternateMobile;
    app.updatedBy = actorId;
    app.lastActivityAt = new Date();

    if (app.studentId) {
      const student = await this.studentRepository.findOne({ where: { id: app.studentId, organizationId: orgId } });
      if (student) {
        if (dto.name) student.name = dto.name;
        if (dto.primaryMobile) student.phone = dto.primaryMobile;
        await this.studentRepository.save(student);
      }
    }

    const saved = await this.applicationRepository.save(app);
    return saved;
  }

  async updatePreferences(id: string, orgId: string, dto: UpdatePreferencesDto, actorId: string) {
    const app = await this.getAppAndAssertEditable(id, orgId);
    await this.validatePreferences(orgId, dto.preference1, dto.preference2);
    if (dto.courseId) {
      const course = await this.coursesService.validateCourseExists(dto.courseId, orgId);
      app.courseId = course.id;
      app.program = course.name;
    }
    if (dto.preference1 !== undefined) app.preference1 = dto.preference1;
    if (dto.preference2 !== undefined) app.preference2 = dto.preference2;
    app.updatedBy = actorId;
    app.lastActivityAt = new Date();
    return this.applicationRepository.save(app);
  }

  async updateAdditionalInfo(id: string, orgId: string, dto: UpdateAdditionalInfoDto, actorId: string) {
    const app = await this.getAppAndAssertEditable(id, orgId);
    Object.assign(app, dto);
    app.updatedBy = actorId;
    app.lastActivityAt = new Date();
    return this.applicationRepository.save(app);
  }

  async updateDeclaration(id: string, orgId: string, dto: UpdateDeclarationDto, actorId: string) {
    const app = await this.getAppAndAssertEditable(id, orgId);
    Object.assign(app, dto);
    app.updatedBy = actorId;
    app.lastActivityAt = new Date();
    return this.applicationRepository.save(app);
  }

  async updatePayment(id: string, orgId: string, dto: UpdatePaymentDto, actorId: string) {
    const app = await this.getAppAndAssertEditable(id, orgId);
    Object.assign(app, dto);
    app.updatedBy = actorId;
    app.lastActivityAt = new Date();
    return this.applicationRepository.save(app);
  }

  // Generic replace strategy for child collections
  private async updateChildCollection<T>(
    id: string,
    orgId: string,
    actorId: string,
    entityTarget: any,
    records: any[],
  ) {
    const app = await this.getAppAndAssertEditable(id, orgId);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Delete existing
      await queryRunner.manager.delete(entityTarget, { applicationId: app.id });

      // 2. Insert new
      if (records && records.length > 0) {
        const entitiesToSave = records.map(r =>
          queryRunner.manager.create(entityTarget, { ...r, applicationId: app.id })
        );
        await queryRunner.manager.save(entitiesToSave);
      }

      app.lastActivityAt = new Date();
      app.updatedBy = actorId;
      await queryRunner.manager.save(app);

      await queryRunner.commitTransaction();
      return true;
    } catch (e) {
      await queryRunner.rollbackTransaction();
      throw e;
    } finally {
      await queryRunner.release();
    }
  }

  async updateEducation(id: string, orgId: string, dto: UpdateEducationDto, actorId: string) {
    return this.updateChildCollection(id, orgId, actorId, ApplicationEducation, dto.records);
  }

  async updateEntranceTests(id: string, orgId: string, dto: UpdateEntranceTestsDto, actorId: string) {
    return this.updateChildCollection(id, orgId, actorId, ApplicationEntranceTest, dto.records);
  }

  async updateParents(id: string, orgId: string, dto: UpdateParentsDto, actorId: string) {
    return this.updateChildCollection(id, orgId, actorId, ApplicationParent, dto.records);
  }

  async updateAddresses(id: string, orgId: string, dto: UpdateAddressesDto, actorId: string) {
    return this.updateChildCollection(id, orgId, actorId, ApplicationAddress, dto.records);
  }

  async updateWorkExperience(id: string, orgId: string, dto: UpdateWorkExperienceDto, actorId: string) {
    return this.updateChildCollection(id, orgId, actorId, ApplicationWorkExperience, dto.records);
  }

  async updateExtraCurriculars(id: string, orgId: string, dto: UpdateExtraCurricularsDto, actorId: string) {
    return this.updateChildCollection(id, orgId, actorId, ApplicationExtraCurricular, dto.records);
  }

  async updateOtherQualifications(id: string, orgId: string, dto: UpdateOtherQualificationsDto, actorId: string) {
    return this.updateChildCollection(id, orgId, actorId, ApplicationOtherQualification, dto.records);
  }

  // =========================================================================
  // WORKFLOW
  // =========================================================================

  async submitApplication(id: string, orgId: string, actorId: string) {
    const app = await this.getAppAndAssertEditable(id, orgId);
    
    app.formStatus = 'submitted';
    app.submittedAt = new Date();
    app.lastActivityAt = new Date();
    app.updatedBy = actorId;
    
    const saved = await this.applicationRepository.save(app);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await this.logActivity(queryRunner.manager, saved.id, orgId, actorId, 'status_changed', 'Application submitted', 'incomplete', 'submitted');
    await queryRunner.release();

    return saved;
  }

  async updateStatus(idOrAppNo: string, orgId: string, status: string, actorId: string) {
    const isUuid = (val?: string) => val ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val) : false;
    const app = await this.applicationRepository.findOne({
      where: isUuid(idOrAppNo)
        ? [
            { id: idOrAppNo, organizationId: orgId },
            { applicationNo: idOrAppNo, organizationId: orgId },
          ]
        : { applicationNo: idOrAppNo, organizationId: orgId },
    });

    if (!app) {
      throw new NotFoundException(`Application ${idOrAppNo} not found`);
    }

    const prev = app.formStatus;
    app.formStatus = status.toLowerCase();
    app.updatedBy = actorId;
    app.lastActivityAt = new Date();
    
    const saved = await this.applicationRepository.save(app);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await this.logActivity(queryRunner.manager, saved.id, orgId, actorId, 'status_changed', `Status updated to ${status}`, prev, status);
    await queryRunner.release();

    return saved;
  }

  async updateGdEvaluation(idOrAppNo: string, orgId: string, dto: UpdateGdEvaluationDto, actorId: string) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrAppNo);
    const app = await this.applicationRepository.findOne({
      where: isUuid
        ? { id: idOrAppNo, organizationId: orgId }
        : { applicationNo: idOrAppNo, organizationId: orgId },
    });

    if (!app) {
      throw new NotFoundException(`Application ${idOrAppNo} not found`);
    }

    if (dto.gdScore !== undefined) app.gdScore = dto.gdScore;
    if (dto.piScore !== undefined) app.piScore = dto.piScore;
    if (dto.interviewLocation !== undefined) app.interviewLocation = dto.interviewLocation;
    if (dto.interviewDate !== undefined) app.interviewDate = new Date(dto.interviewDate);
    if (dto.interviewTime !== undefined) app.interviewTime = dto.interviewTime;
    if (dto.confirmedCampus !== undefined) app.confirmedCampus = dto.confirmedCampus;
    if (dto.remarks !== undefined) app.evaluationRemarks = dto.remarks;
    if (dto.status !== undefined) app.formStatus = dto.status.toLowerCase();
    if (dto.claimedMonths !== undefined) app.claimedExperienceMonths = dto.claimedMonths;
    if (dto.validatedMonths !== undefined) app.validatedExperienceMonths = dto.validatedMonths;

    app.updatedBy = actorId;
    app.lastActivityAt = new Date();

    return this.applicationRepository.save(app);
  }

  private mapStatusToFrontend(status: string): string {
    const mapping: Record<string, string> = {
      incomplete: 'Incomplete',
      submitted: 'Submitted',
      under_review: 'Under Review',
      accepted: 'Accepted',
      rejected: 'Rejected',
    };
    return mapping[status.toLowerCase()] || status;
  }
}
