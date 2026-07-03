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
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER, Role.COUNSELOR)
  create(@Req() req: any, @Body() createApplicationDto: CreateApplicationDto) {
    const orgId = req.user.organizationId;
    const creatorId = req.user.sub;
    const creatorRole = req.user.role;
    return this.applicationsService.create(orgId, createApplicationDto, creatorId, creatorRole);
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

  @Get(':id')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER, Role.COUNSELOR)
  findOne(@Req() req: any, @Param('id') id: string) {
    const orgId = req.user.organizationId;
    return this.applicationsService.findOne(id, orgId);
  }

  // =========================================================================
  // SECTION UPDATES
  // =========================================================================

  @Patch(':applicationNo/personal')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER, Role.COUNSELOR)
  updatePersonal(@Req() req: any, @Param('applicationNo') appNo: string, @Body() dto: UpdatePersonalDto) {
    return this.applicationsService.updatePersonal(appNo, req.user.organizationId, dto, req.user.sub);
  }

  @Patch(':applicationNo/preferences')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER, Role.COUNSELOR)
  updatePreferences(@Req() req: any, @Param('applicationNo') appNo: string, @Body() dto: UpdatePreferencesDto) {
    return this.applicationsService.updatePreferences(appNo, req.user.organizationId, dto, req.user.sub);
  }

  @Patch(':applicationNo/education')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER, Role.COUNSELOR)
  updateEducation(@Req() req: any, @Param('applicationNo') appNo: string, @Body() dto: UpdateEducationDto) {
    return this.applicationsService.updateEducation(appNo, req.user.organizationId, dto, req.user.sub);
  }

  @Patch(':applicationNo/entrance-tests')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER, Role.COUNSELOR)
  updateEntranceTests(@Req() req: any, @Param('applicationNo') appNo: string, @Body() dto: UpdateEntranceTestsDto) {
    return this.applicationsService.updateEntranceTests(appNo, req.user.organizationId, dto, req.user.sub);
  }

  @Patch(':applicationNo/parents')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER, Role.COUNSELOR)
  updateParents(@Req() req: any, @Param('applicationNo') appNo: string, @Body() dto: UpdateParentsDto) {
    return this.applicationsService.updateParents(appNo, req.user.organizationId, dto, req.user.sub);
  }

  @Patch(':applicationNo/addresses')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER, Role.COUNSELOR)
  updateAddresses(@Req() req: any, @Param('applicationNo') appNo: string, @Body() dto: UpdateAddressesDto) {
    return this.applicationsService.updateAddresses(appNo, req.user.organizationId, dto, req.user.sub);
  }

  @Patch(':applicationNo/work-experience')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER, Role.COUNSELOR)
  updateWorkExperience(@Req() req: any, @Param('applicationNo') appNo: string, @Body() dto: UpdateWorkExperienceDto) {
    return this.applicationsService.updateWorkExperience(appNo, req.user.organizationId, dto, req.user.sub);
  }

  @Patch(':applicationNo/extra-curriculars')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER, Role.COUNSELOR)
  updateExtraCurriculars(@Req() req: any, @Param('applicationNo') appNo: string, @Body() dto: UpdateExtraCurricularsDto) {
    return this.applicationsService.updateExtraCurriculars(appNo, req.user.organizationId, dto, req.user.sub);
  }

  @Patch(':applicationNo/other-qualifications')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER, Role.COUNSELOR)
  updateOtherQualifications(@Req() req: any, @Param('applicationNo') appNo: string, @Body() dto: UpdateOtherQualificationsDto) {
    return this.applicationsService.updateOtherQualifications(appNo, req.user.organizationId, dto, req.user.sub);
  }

  @Patch(':applicationNo/additional-info')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER, Role.COUNSELOR)
  updateAdditionalInfo(@Req() req: any, @Param('applicationNo') appNo: string, @Body() dto: UpdateAdditionalInfoDto) {
    return this.applicationsService.updateAdditionalInfo(appNo, req.user.organizationId, dto, req.user.sub);
  }

  @Patch(':applicationNo/declaration')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER, Role.COUNSELOR)
  updateDeclaration(@Req() req: any, @Param('applicationNo') appNo: string, @Body() dto: UpdateDeclarationDto) {
    return this.applicationsService.updateDeclaration(appNo, req.user.organizationId, dto, req.user.sub);
  }

  @Patch(':applicationNo/payment')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER, Role.COUNSELOR)
  updatePayment(@Req() req: any, @Param('applicationNo') appNo: string, @Body() dto: UpdatePaymentDto) {
    return this.applicationsService.updatePayment(appNo, req.user.organizationId, dto, req.user.sub);
  }

  // =========================================================================
  // WORKFLOW
  // =========================================================================

  @Patch(':applicationNo/submit')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER, Role.COUNSELOR)
  submitApplication(@Req() req: any, @Param('applicationNo') appNo: string) {
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
}
