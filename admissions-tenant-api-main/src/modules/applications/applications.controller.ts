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
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER, Role.COUNSELOR)
  findAll(
    @Req() req: any,
    @Query() paginationDto: PaginationDto,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    const orgId = req.user.organizationId;
    return this.applicationsService.findAll(orgId, paginationDto, search, status);
  }

  @Get('my/active')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER, Role.COUNSELOR, Role.STUDENT)
  findActiveApplication(@Req() req: any) {
    const email = req.user.email;
    const orgId = req.user.organizationId;
    return this.applicationsService.findActiveByEmail(email, orgId);
  }

  @Get(':id')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER, Role.COUNSELOR, Role.STUDENT)
  async findOne(@Req() req: any, @Param('id') id: string) {
    const orgId = req.user.organizationId;
    const application = await this.applicationsService.findOne(id, orgId);

    if (req.user.role === Role.STUDENT && application.email !== req.user.email) {
      throw new ForbiddenException('You are not authorized to view this application');
    }
    return application;
  }

  @Delete(':id')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN)
  async remove(@Req() req: any, @Param('id') id: string) {
    const orgId = req.user.organizationId;
    return this.applicationsService.remove(id, orgId);
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

  @Patch(':applicationNo/payment')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER, Role.COUNSELOR, Role.STUDENT)
  async updatePayment(@Req() req: any, @Param('applicationNo') appNo: string, @Body() dto: UpdatePaymentDto) {
    await this.validateStudentEditPermission(appNo, req.user.organizationId, req.user);
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
  async submitApplication(@Req() req: any, @Param('applicationNo') appNo: string) {
    if (req.user.role === Role.STUDENT) {
      const app = await this.applicationsService.findOne(appNo, req.user.organizationId);
      if (app.email !== req.user.email) {
        throw new ForbiddenException('You are not authorized to submit this application');
      }
    }
    return this.applicationsService.submitApplication(appNo, req.user.organizationId, req.user.sub);
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

  private async validateStudentEditPermission(appNo: string, orgId: string, reqUser: any) {
    if (reqUser.role === Role.STUDENT) {
      const app = await this.applicationsService.findOne(appNo, orgId);
      console.log(`[validateStudentEditPermission] App email: "${app.email}", User email: "${reqUser.email}"`);
      if (!app.email || !reqUser.email || app.email.toLowerCase().trim() !== reqUser.email.toLowerCase().trim()) {
        throw new ForbiddenException('You are not authorized to edit this application');
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
