import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  Req,
  ForbiddenException,
  Delete,
} from '@nestjs/common';
import { ApplicationsService } from './applications.service.js';
import { CreateApplicationDto } from './dto/create-application.dto.js';
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto.js';
import { VerifyApplicationDto } from './dto/verify-application.dto.js';
import { SubmitApplicationDto } from './dto/submit-application.dto.js';
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
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { TenantGuard } from '../../common/guards/tenant.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Role } from '../../common/enums/roles.enum.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';

@Controller('applications')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Post()
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER, Role.COUNSELOR, Role.STUDENT)
  create(@Req() req: any, @Body() createApplicationDto: CreateApplicationDto) {
    const orgId = req.user.organizationId;
    const creatorId = req.user.sub;
    const creatorRole = req.user.role;
    const creatorEmail = req.user.email;
    return this.applicationsService.create(orgId, createApplicationDto, creatorId, creatorRole, creatorEmail);
  }

  @Get()
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER, Role.COUNSELOR, Role.EXAM_MANAGER)
  findAll(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('verificationStatus') verificationStatus?: string,
    @Query('stage') stage?: string,
    @Query('source') source?: string,
    @Query('counsellorId') counsellorId?: string,
    @Query('academicYear') academicYear?: string,
  ) {
    const orgId = req.user.organizationId;
    const paginationDto = new PaginationDto();
    paginationDto.page = page ? Math.max(1, parseInt(page, 10) || 1) : 1;
    paginationDto.limit = limit ? Math.min(1000, Math.max(1, parseInt(limit, 10) || 10)) : 10;
    return this.applicationsService.findAll(orgId, paginationDto, search, status, verificationStatus, {
      stage,
      source,
      counsellorId,
      academicYear,
    });
  }

  @Get('my/active')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER, Role.COUNSELOR, Role.STUDENT)
  async findActiveApplication(@Req() req: any) {
    const email = req.user.email;
    const orgId = req.user.organizationId;
    const application = await this.applicationsService.findActiveByEmail(email, orgId);
    if (
      req.user.role === Role.STUDENT &&
      application?.formStatus !== 'draft' &&
      application?.formStatus !== 'incomplete' &&
      (application?.shortlistStatus === 'Review' || application?.shortlistStatus === 'Not Eligible')
    ) {
      return { ...application, shortlistStatus: 'Shortlisted' };
    }
    return application;
  }

  @Get('*id')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER, Role.COUNSELOR, Role.STUDENT)
  async findOne(@Req() req: any, @Param('id') id: string | string[]) {
    const orgId = req.user.organizationId;
    const raw = Array.isArray(id) ? id.join('/') : id;
    const cleanId = decodeURIComponent(raw);
    const application = await this.applicationsService.findOne(cleanId, orgId);

    if (req.user.role === Role.STUDENT && application.email !== req.user.email) {
      throw new ForbiddenException('You are not authorized to view this application');
    }
    if (
      req.user.role === Role.STUDENT &&
      application?.formStatus !== 'draft' &&
      application?.formStatus !== 'incomplete' &&
      (application?.shortlistStatus === 'Review' || application?.shortlistStatus === 'Not Eligible')
    ) {
      return { ...application, shortlistStatus: 'Shortlisted' };
    }
    return application;
  }

  @Delete('*id')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN)
  async remove(@Req() req: any, @Param('id') id: string | string[]) {
    const orgId = req.user.organizationId;
    const raw = Array.isArray(id) ? id.join('/') : id;
    return this.applicationsService.remove(decodeURIComponent(raw), orgId);
  }

  // =========================================================================
  // SECTION UPDATES
  // =========================================================================

  @Patch(':applicationNo/personal')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER, Role.COUNSELOR, Role.STUDENT)
  async updatePersonal(@Req() req: any, @Param('applicationNo') appNo: string, @Body() dto: UpdatePersonalDto) {
    await this.validateStudentEditPermission(appNo, req.user.organizationId, req.user);
    return this.applicationsService.updatePersonal(appNo, req.user.organizationId, dto, req.user.sub);
  }

  @Patch(':applicationNo/preferences')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER, Role.COUNSELOR, Role.STUDENT)
  async updatePreferences(@Req() req: any, @Param('applicationNo') appNo: string, @Body() dto: UpdatePreferencesDto) {
    await this.validateStudentEditPermission(appNo, req.user.organizationId, req.user);
    return this.applicationsService.updatePreferences(appNo, req.user.organizationId, dto, req.user.sub);
  }

  @Patch(':applicationNo/education')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER, Role.COUNSELOR, Role.STUDENT)
  async updateEducation(@Req() req: any, @Param('applicationNo') appNo: string, @Body() dto: UpdateEducationDto) {
    await this.validateStudentEditPermission(appNo, req.user.organizationId, req.user);
    return this.applicationsService.updateEducation(appNo, req.user.organizationId, dto, req.user.sub);
  }

  @Patch(':applicationNo/entrance-tests')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER, Role.COUNSELOR, Role.STUDENT)
  async updateEntranceTests(@Req() req: any, @Param('applicationNo') appNo: string, @Body() dto: UpdateEntranceTestsDto) {
    await this.validateStudentEditPermission(appNo, req.user.organizationId, req.user);
    return this.applicationsService.updateEntranceTests(appNo, req.user.organizationId, dto, req.user.sub);
  }

  @Patch(':applicationNo/parents')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER, Role.COUNSELOR, Role.STUDENT)
  async updateParents(@Req() req: any, @Param('applicationNo') appNo: string, @Body() dto: UpdateParentsDto) {
    await this.validateStudentEditPermission(appNo, req.user.organizationId, req.user);
    return this.applicationsService.updateParents(appNo, req.user.organizationId, dto, req.user.sub);
  }

  @Patch(':applicationNo/addresses')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER, Role.COUNSELOR, Role.STUDENT)
  async updateAddresses(@Req() req: any, @Param('applicationNo') appNo: string, @Body() dto: UpdateAddressesDto) {
    await this.validateStudentEditPermission(appNo, req.user.organizationId, req.user);
    return this.applicationsService.updateAddresses(appNo, req.user.organizationId, dto, req.user.sub);
  }

  @Patch(':applicationNo/work-experience')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER, Role.COUNSELOR, Role.STUDENT)
  async updateWorkExperience(@Req() req: any, @Param('applicationNo') appNo: string, @Body() dto: UpdateWorkExperienceDto) {
    await this.validateStudentEditPermission(appNo, req.user.organizationId, req.user);
    return this.applicationsService.updateWorkExperience(appNo, req.user.organizationId, dto, req.user.sub);
  }

  @Patch(':applicationNo/extra-curriculars')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER, Role.COUNSELOR, Role.STUDENT)
  async updateExtraCurriculars(@Req() req: any, @Param('applicationNo') appNo: string, @Body() dto: UpdateExtraCurricularsDto) {
    await this.validateStudentEditPermission(appNo, req.user.organizationId, req.user);
    return this.applicationsService.updateExtraCurriculars(appNo, req.user.organizationId, dto, req.user.sub);
  }

  @Patch(':applicationNo/other-qualifications')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER, Role.COUNSELOR, Role.STUDENT)
  async updateOtherQualifications(@Req() req: any, @Param('applicationNo') appNo: string, @Body() dto: UpdateOtherQualificationsDto) {
    await this.validateStudentEditPermission(appNo, req.user.organizationId, req.user);
    return this.applicationsService.updateOtherQualifications(appNo, req.user.organizationId, dto, req.user.sub);
  }

  @Patch(':applicationNo/additional-info')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER, Role.COUNSELOR, Role.STUDENT)
  async updateAdditionalInfo(@Req() req: any, @Param('applicationNo') appNo: string, @Body() dto: UpdateAdditionalInfoDto) {
    await this.validateStudentEditPermission(appNo, req.user.organizationId, req.user);
    return this.applicationsService.updateAdditionalInfo(appNo, req.user.organizationId, dto, req.user.sub);
  }

  @Patch(':applicationNo/declaration')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER, Role.COUNSELOR, Role.STUDENT)
  async updateDeclaration(@Req() req: any, @Param('applicationNo') appNo: string, @Body() dto: UpdateDeclarationDto) {
    await this.validateStudentEditPermission(appNo, req.user.organizationId, req.user);
    return this.applicationsService.updateDeclaration(appNo, req.user.organizationId, dto, req.user.sub);
  }

  // Staff only: a student must not be able to mark their own fee as paid.
  @Patch(':applicationNo/payment')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER, Role.COUNSELOR)
  async updatePayment(@Req() req: any, @Param('applicationNo') appNo: string, @Body() dto: UpdatePaymentDto) {
    return this.applicationsService.updatePayment(appNo, req.user.organizationId, dto, req.user.sub);
  }

  @Patch(':applicationNo/gd-evaluation')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER, Role.COUNSELOR)
  updateGdEvaluation(@Req() req: any, @Param('applicationNo') appNo: string, @Body() dto: UpdateGdEvaluationDto) {
    return this.applicationsService.updateGdEvaluation(appNo, req.user.organizationId, dto, req.user.sub);
  }

  // =========================================================================
  // WORKFLOW
  // =========================================================================

  @Patch(':applicationNo/submit')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER, Role.COUNSELOR, Role.STUDENT)
  async submitApplication(
    @Req() req: any,
    @Param('applicationNo') appNo: string,
    @Body() dto: SubmitApplicationDto,
  ) {
    if (req.user.role === Role.STUDENT) {
      const app = await this.applicationsService.findOne(appNo, req.user.organizationId);
      if (app.email !== req.user.email) {
        throw new ForbiddenException('You are not authorized to submit this application');
      }
    }
    return this.applicationsService.submitApplication(appNo, req.user.organizationId, req.user.sub, dto);
  }

  /**
   * Saves the applicant's chosen account password (hashed) before the fee is paid,
   * so redirect gateways (Stripe / PayU / Paytm) never need the plaintext kept in the browser.
   */
  @Patch(':applicationNo/account-password')
  @Roles(Role.STUDENT)
  async setAccountPassword(
    @Req() req: any,
    @Param('applicationNo') appNo: string,
    @Body() dto: SubmitApplicationDto,
  ) {
    const app = await this.applicationsService.findOne(appNo, req.user.organizationId);
    if (app.email !== req.user.email) {
      throw new ForbiddenException('You are not authorized to update this application');
    }
    return this.applicationsService.setAccountPassword(appNo, req.user.organizationId, dto?.password);
  }

  @Patch(':applicationNo/status')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER) // Counselors cannot edit application status after submission
  updateStatus(
    @Req() req: any,
    @Param('applicationNo') appNo: string,
    @Body() updateDto: UpdateApplicationStatusDto,
  ) {
    const orgId = req.user.organizationId;
    const actorId = req.user.sub;
    return this.applicationsService.updateStatus(appNo, orgId, updateDto.status, actorId);
  }

  @Patch(':applicationNo/shortlist-status')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER, Role.EXAM_MANAGER)
  updateShortlistStatus(
    @Req() req: any,
    @Param('applicationNo') appNo: string,
    @Body() dto: { shortlistStatus: string },
  ) {
    const orgId = req.user.organizationId;
    const actorId = req.user.sub;
    return this.applicationsService.updateShortlistStatus(appNo, orgId, dto.shortlistStatus, actorId);
  }

  @Patch(':applicationNo/verify')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER)
  verifyApplication(
    @Req() req: any,
    @Param('applicationNo') appNo: string,
    @Body() dto: VerifyApplicationDto,
  ) {
    const orgId = req.user.organizationId;
    const actorId = req.user.sub;
    return this.applicationsService.verifyApplication(appNo, orgId, dto, actorId);
  }

  private async validateStudentEditPermission(appNo: string, orgId: string, reqUser: any) {
    if (reqUser.role === Role.STUDENT) {
      const app = await this.applicationsService.findOne(appNo, orgId);
      console.log(`[validateStudentEditPermission] App email: "${app.email}", User email: "${reqUser.email}"`);
      if (!app.email || !reqUser.email || app.email.toLowerCase().trim() !== reqUser.email.toLowerCase().trim()) {
        throw new ForbiddenException('You are not authorized to edit this application');
      }
      // Once the admissions team is reviewing or has decided, the applicant can no longer edit.
      if (['under_review', 'in_progress', 'accepted', 'approved', 'rejected'].includes((app.formStatus || '').toLowerCase())) {
        throw new ForbiddenException('This application is under review and can no longer be edited');
      }
      if (app.formStatus === 'submitted' && app.submittedAt) {
        const timeDiff = new Date().getTime() - new Date(app.submittedAt).getTime();
        const limit = 24 * 60 * 60 * 1000; // 24 hours
        if (timeDiff > limit) {
          throw new ForbiddenException('The 24-hour editing window for this submitted application has closed');
        }
      }
    }
  }
}
