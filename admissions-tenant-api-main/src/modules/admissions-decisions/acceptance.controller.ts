import { Controller, Get, Patch, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { AcceptanceService } from './acceptance.service.js';
import { MarkOnboardingDto } from './dto/mark-onboarding.dto.js';
import { RecordAcceptanceDto } from './dto/record-acceptance.dto.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Role } from '../../common/enums/roles.enum.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('organizations/:orgId/applications/:applicationNo/acceptance')
export class AcceptanceController {
  constructor(private readonly acceptanceService: AcceptanceService) {}

  @Get()
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER, Role.EXAM_MANAGER, Role.COUNSELOR)
  getAcceptance(@Param('orgId') orgId: string, @Param('applicationNo') applicationNo: string) {
    return this.acceptanceService.getAcceptance(orgId, applicationNo);
  }

  // "Mark Onboarding Sent" admin action.
  @Patch()
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER)
  markOnboardingSent(
    @Param('orgId') orgId: string,
    @Param('applicationNo') applicationNo: string,
    @Body() dto: MarkOnboardingDto,
  ) {
    return this.acceptanceService.markOnboardingSent(orgId, applicationNo, dto);
  }

  // Candidate-facing action (accept/decline the offer). There is no
  // student-auth/portal built yet (per earlier phases), so this is
  // guarded the same as other admin mutations for now — an admin records
  // the candidate's decision on their behalf. This will need a public /
  // student-auth route once the student portal exists.
  @Post('confirm')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER)
  confirmAcceptance(
    @Param('orgId') orgId: string,
    @Param('applicationNo') applicationNo: string,
    @Body() dto: RecordAcceptanceDto,
    @Request() req,
  ) {
    return this.acceptanceService.recordCandidateAcceptance(orgId, applicationNo, dto);
  }
}
