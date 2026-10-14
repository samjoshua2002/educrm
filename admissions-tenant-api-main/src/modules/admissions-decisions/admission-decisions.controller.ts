import { Controller, Get, Patch, Post, Delete, Body, Param, Query, UseGuards, Request, ParseUUIDPipe } from '@nestjs/common';
import { AdmissionDecisionsService } from './admission-decisions.service.js';
import { DecisionSupportService } from './decision-support.service.js';
import {
  AdvanceStageDto,
  BulkDecisionDto,
  CommitteeReviewDto,
  CommitteeTeamDto,
  DecisionListQueryDto,
  FinalizeDecisionDto,
  ReleaseDecisionDto,
  UnlockDecisionDto,
  UpdateDecisionDto,
  UpdateDecisionSettingsDto,
} from './dto/decision.dto.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { TenantGuard } from '../../common/guards/tenant.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Role } from '../../common/enums/roles.enum.js';
import { ResponseMessage } from '../../common/decorators/response-message.decorator.js';

export const STAFF_READ = [Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER, Role.EXAM_MANAGER, Role.COUNSELOR];
export const STAFF_WRITE = [Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER];
// Committee members and approvers can come from any staff role; the service
// checks committee membership / approver rights.
export const STAFF_ANY = [
  Role.SUPERADMIN,
  Role.ORG_ADMIN,
  Role.APPLICATION_MANAGER,
  Role.EXAM_MANAGER,
  Role.COUNSELOR,
  Role.LEAD_MANAGER,
];

@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Controller('organizations/:orgId/applications/:applicationNo/decision')
export class AdmissionDecisionsController {
  constructor(private readonly decisionsService: AdmissionDecisionsService) {}

  @Get()
  @Roles(...STAFF_ANY)
  @ResponseMessage('Decision fetched successfully')
  getDecision(@Param('orgId') orgId: string, @Param('applicationNo') applicationNo: string, @Request() req) {
    return this.decisionsService.getDecision(orgId, applicationNo, req.user);
  }

  @Patch()
  @Roles(...STAFF_WRITE)
  @ResponseMessage('Decision saved successfully')
  createOrUpdateDecision(
    @Param('orgId') orgId: string,
    @Param('applicationNo') applicationNo: string,
    @Body() dto: UpdateDecisionDto,
    @Request() req,
  ) {
    return this.decisionsService.createOrUpdateDecision(orgId, applicationNo, dto, req.user);
  }

  @Post('review')
  @Roles(...STAFF_ANY)
  @ResponseMessage('Committee review recorded')
  review(
    @Param('orgId') orgId: string,
    @Param('applicationNo') applicationNo: string,
    @Body() dto: CommitteeReviewDto,
    @Request() req,
  ) {
    return this.decisionsService.addReview(orgId, applicationNo, dto, req.user);
  }

  @Patch('advance-stage')
  @Roles(...STAFF_WRITE)
  @ResponseMessage('Decision stage advanced')
  advanceStage(
    @Param('orgId') orgId: string,
    @Param('applicationNo') applicationNo: string,
    @Body() dto: AdvanceStageDto,
    @Request() req,
  ) {
    return this.decisionsService.advanceStage(orgId, applicationNo, dto, req.user);
  }

  @Patch('finalize')
  @Roles(...STAFF_ANY)
  @ResponseMessage('Final approval recorded')
  finalizeDecision(
    @Param('orgId') orgId: string,
    @Param('applicationNo') applicationNo: string,
    @Body() dto: FinalizeDecisionDto,
    @Request() req,
  ) {
    return this.decisionsService.finalizeDecision(orgId, applicationNo, dto, req.user);
  }

  @Post('release')
  @Roles(...STAFF_ANY)
  @ResponseMessage('Decision released')
  release(
    @Param('orgId') orgId: string,
    @Param('applicationNo') applicationNo: string,
    @Body() dto: ReleaseDecisionDto,
    @Request() req,
  ) {
    return this.decisionsService.releaseDecision(orgId, applicationNo, dto, req.user);
  }

  @Post('publish')
  @Roles(...STAFF_ANY)
  @ResponseMessage('Decision is now visible to the applicant')
  publish(@Param('orgId') orgId: string, @Param('applicationNo') applicationNo: string, @Request() req) {
    return this.decisionsService.publishDecision(orgId, applicationNo, req.user);
  }

  @Post('lock')
  @Roles(...STAFF_ANY)
  @ResponseMessage('Decision locked')
  lock(@Param('orgId') orgId: string, @Param('applicationNo') applicationNo: string, @Request() req) {
    return this.decisionsService.lockDecision(orgId, applicationNo, req.user);
  }

  @Post('unlock')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN)
  @ResponseMessage('Decision unlocked')
  unlock(
    @Param('orgId') orgId: string,
    @Param('applicationNo') applicationNo: string,
    @Body() dto: UnlockDecisionDto,
    @Request() req,
  ) {
    return this.decisionsService.unlockDecision(orgId, applicationNo, dto, req.user);
  }
}

@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Controller('organizations/:orgId/decisions')
export class OrgDecisionsController {
  constructor(
    private readonly decisionsService: AdmissionDecisionsService,
    private readonly support: DecisionSupportService,
  ) {}

  @Get()
  @Roles(...STAFF_ANY)
  @ResponseMessage('Decisions fetched successfully')
  list(@Param('orgId') orgId: string, @Query() query: DecisionListQueryDto) {
    return this.decisionsService.listDecisions(orgId, query);
  }

  @Post('bulk')
  @Roles(...STAFF_ANY)
  @ResponseMessage('Bulk decision action completed')
  bulk(@Param('orgId') orgId: string, @Body() dto: BulkDecisionDto, @Request() req) {
    return this.decisionsService.bulk(orgId, dto, req.user);
  }

  @Get('picklists')
  @Roles(...STAFF_ANY)
  @ResponseMessage('Picklists fetched successfully')
  picklists(@Param('orgId') orgId: string) {
    return this.support.picklists(orgId);
  }

  @Get('settings')
  @Roles(...STAFF_READ)
  @ResponseMessage('Decision settings fetched successfully')
  getSettings(@Param('orgId') orgId: string) {
    return this.support.getSettings(orgId);
  }

  @Patch('settings')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN)
  @ResponseMessage('Decision settings saved')
  updateSettings(@Param('orgId') orgId: string, @Body() dto: UpdateDecisionSettingsDto) {
    return this.support.updateSettings(orgId, dto);
  }

  @Get('teams')
  @Roles(...STAFF_ANY)
  @ResponseMessage('Committee teams fetched successfully')
  listTeams(@Param('orgId') orgId: string) {
    return this.support.listTeams(orgId);
  }

  @Post('teams')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER)
  @ResponseMessage('Committee team created')
  createTeam(@Param('orgId') orgId: string, @Body() dto: CommitteeTeamDto) {
    return this.support.createTeam(orgId, dto);
  }

  @Patch('teams/:id')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER)
  @ResponseMessage('Committee team updated')
  updateTeam(@Param('orgId') orgId: string, @Param('id', ParseUUIDPipe) id: string, @Body() dto: CommitteeTeamDto) {
    return this.support.updateTeam(orgId, id, dto);
  }

  @Delete('teams/:id')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER)
  @ResponseMessage('Committee team deleted')
  deleteTeam(@Param('orgId') orgId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.support.deleteTeam(orgId, id);
  }
}
