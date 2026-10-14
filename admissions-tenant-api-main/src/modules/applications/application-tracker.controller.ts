import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { TenantGuard } from '../../common/guards/tenant.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Role } from '../../common/enums/roles.enum.js';
import { ResponseMessage } from '../../common/decorators/response-message.decorator.js';
import { ApplicationStatusService } from './application-status.service.js';
import {
  APPLICATION_SOURCES,
  APPLICATION_STATUSES,
  DOCUMENT_TYPES,
  TRACKER_STAGES,
  TRACKER_STEPS,
} from './application-workflow.constants.js';
import {
  BulkAssignDto,
  BulkStageDto,
  ChangeStageDto,
  UpdateApplicationMasterDto,
  UpdateWorkflowSettingsDto,
} from './dto/application-tracker.dto.js';

const STAFF = [Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER, Role.COUNSELOR];
const EDITORS = [Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER];

/** Application Status Tracker — admin dashboard, timeline, applicant progress. */
@Controller('organizations/:orgId/application-tracker')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class ApplicationTrackerController {
  constructor(private readonly statusService: ApplicationStatusService) {}

  @Get('meta')
  @Roles(...STAFF, Role.STUDENT)
  @ResponseMessage('Tracker picklists fetched successfully')
  meta() {
    return {
      stages: TRACKER_STAGES,
      steps: TRACKER_STEPS,
      applicationStatuses: APPLICATION_STATUSES,
      applicationSources: APPLICATION_SOURCES,
      documentTypes: DOCUMENT_TYPES,
    };
  }

  @Get('settings')
  @Roles(...STAFF)
  @ResponseMessage('Workflow settings fetched successfully')
  getSettings(@Param('orgId', ParseUUIDPipe) orgId: string) {
    return this.statusService.getSettings(orgId);
  }

  @Put('settings')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN)
  @ResponseMessage('Workflow settings updated successfully')
  updateSettings(@Param('orgId', ParseUUIDPipe) orgId: string, @Body() dto: UpdateWorkflowSettingsDto) {
    return this.statusService.updateSettings(orgId, dto);
  }

  @Get('dashboard')
  @Roles(...STAFF)
  @ResponseMessage('Status dashboard fetched successfully')
  async dashboard(@Param('orgId', ParseUUIDPipe) orgId: string, @Req() req: any, @Query() q: any) {
    const res = await this.statusService.dashboard(orgId, req.user, q);
    // Returned under `items` so the response interceptor keeps stageCounts.
    const { data, ...rest } = res;
    return { items: data, ...rest };
  }

  @Post('bulk-stage')
  @Roles(...EDITORS)
  @ResponseMessage('Applications updated successfully')
  bulkStage(@Param('orgId', ParseUUIDPipe) orgId: string, @Req() req: any, @Body() dto: BulkStageDto) {
    return this.statusService.bulkChange(orgId, req.user, dto);
  }

  @Post('bulk-assign')
  @Roles(...EDITORS)
  @ResponseMessage('Applications reassigned successfully')
  bulkAssign(@Param('orgId', ParseUUIDPipe) orgId: string, @Req() req: any, @Body() dto: BulkAssignDto) {
    return this.statusService.bulkAssign(orgId, req.user, dto);
  }

  @Get('counsellors')
  @Roles(...STAFF)
  @ResponseMessage('Counsellors fetched successfully')
  counsellors(@Param('orgId', ParseUUIDPipe) orgId: string) {
    return this.statusService.counsellors(orgId);
  }

  @Get(':applicationId/timeline')
  @Roles(...STAFF, Role.STUDENT)
  @ResponseMessage('Status timeline fetched successfully')
  timeline(@Param('orgId', ParseUUIDPipe) orgId: string, @Param('applicationId') applicationId: string, @Req() req: any) {
    return this.statusService.timeline(orgId, decodeURIComponent(applicationId), req.user);
  }

  @Get(':applicationId/progress')
  @Roles(...STAFF, Role.STUDENT)
  @ResponseMessage('Application progress fetched successfully')
  progress(@Param('orgId', ParseUUIDPipe) orgId: string, @Param('applicationId') applicationId: string, @Req() req: any) {
    return this.statusService.progress(orgId, decodeURIComponent(applicationId), req.user);
  }

  @Post(':applicationId/stage')
  @Roles(...EDITORS)
  @ResponseMessage('Application stage updated successfully')
  changeStage(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('applicationId') applicationId: string,
    @Req() req: any,
    @Body() dto: ChangeStageDto,
  ) {
    return this.statusService.manualChange(orgId, decodeURIComponent(applicationId), req.user, dto);
  }

  @Post(':applicationId/evaluate')
  @Roles(...STAFF)
  @ResponseMessage('Status rules evaluated')
  async evaluate(@Param('orgId', ParseUUIDPipe) orgId: string, @Param('applicationId') applicationId: string) {
    const app = await this.statusService.findApplication(decodeURIComponent(applicationId), orgId);
    const stage = await this.statusService.evaluate(app.id);
    return { currentStage: stage };
  }

  @Patch(':applicationId/master')
  @Roles(...STAFF)
  @ResponseMessage('Application updated successfully')
  updateMaster(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('applicationId') applicationId: string,
    @Req() req: any,
    @Body() dto: UpdateApplicationMasterDto,
  ) {
    return this.statusService.updateMaster(orgId, decodeURIComponent(applicationId), req.user, dto);
  }
}
