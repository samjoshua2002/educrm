import { Controller, Get, Patch, Body, Param, UseGuards, Request } from '@nestjs/common';
import { AdmissionDecisionsService } from './admission-decisions.service.js';
import { UpdateDecisionDto } from './dto/update-decision.dto.js';
import { AdvanceStageDto } from './dto/advance-stage.dto.js';
import { FinalizeDecisionDto } from './dto/finalize-decision.dto.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Role } from '../../common/enums/roles.enum.js';

// Committee-style decisions are admin-gated per the source design doc —
// mutating endpoints allow SUPERADMIN/ORG_ADMIN/APPLICATION_MANAGER only.
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('organizations/:orgId/applications/:applicationNo/decision')
export class AdmissionDecisionsController {
  constructor(private readonly decisionsService: AdmissionDecisionsService) {}

  @Get()
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER, Role.EXAM_MANAGER, Role.COUNSELOR)
  getDecision(@Param('orgId') orgId: string, @Param('applicationNo') applicationNo: string) {
    return this.decisionsService.getDecision(orgId, applicationNo);
  }

  @Patch()
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER)
  createOrUpdateDecision(
    @Param('orgId') orgId: string,
    @Param('applicationNo') applicationNo: string,
    @Body() dto: UpdateDecisionDto,
    @Request() req,
  ) {
    return this.decisionsService.createOrUpdateDecision(orgId, applicationNo, dto, req.user.sub);
  }

  @Patch('advance-stage')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER)
  advanceStage(
    @Param('orgId') orgId: string,
    @Param('applicationNo') applicationNo: string,
    @Body() dto: AdvanceStageDto,
    @Request() req,
  ) {
    return this.decisionsService.advanceStage(orgId, applicationNo, dto, req.user.sub);
  }

  @Patch('finalize')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER)
  finalizeDecision(
    @Param('orgId') orgId: string,
    @Param('applicationNo') applicationNo: string,
    @Body() dto: FinalizeDecisionDto,
    @Request() req,
  ) {
    return this.decisionsService.finalizeDecision(orgId, applicationNo, dto, req.user.sub);
  }
}
