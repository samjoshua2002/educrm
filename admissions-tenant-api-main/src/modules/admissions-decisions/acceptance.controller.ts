import { Controller, Get, Patch, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { AcceptanceService } from './acceptance.service.js';
import { RecordAcceptanceDto, SendOnboardingDto, UpdateAcceptanceDto } from './dto/acceptance.dto.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { TenantGuard } from '../../common/guards/tenant.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { ResponseMessage } from '../../common/decorators/response-message.decorator.js';
import { STAFF_READ, STAFF_WRITE } from './admission-decisions.controller.js';

@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Controller('organizations/:orgId/applications/:applicationNo/acceptance')
export class AcceptanceController {
  constructor(private readonly acceptanceService: AcceptanceService) {}

  @Get()
  @Roles(...STAFF_READ)
  @ResponseMessage('Acceptance fetched successfully')
  getAcceptance(@Param('orgId') orgId: string, @Param('applicationNo') applicationNo: string) {
    return this.acceptanceService.getAcceptance(orgId, applicationNo);
  }

  @Patch()
  @Roles(...STAFF_WRITE)
  @ResponseMessage('Acceptance updated')
  update(
    @Param('orgId') orgId: string,
    @Param('applicationNo') applicationNo: string,
    @Body() dto: UpdateAcceptanceDto,
    @Request() req,
  ) {
    return this.acceptanceService.updateAcceptance(orgId, applicationNo, dto, req.user.sub);
  }

  // Staff records the candidate's answer on their behalf (the candidate can
  // also answer in the student portal: /student/admission-result/respond).
  @Post('confirm')
  @Roles(...STAFF_WRITE)
  @ResponseMessage('Candidate response recorded')
  confirmAcceptance(
    @Param('orgId') orgId: string,
    @Param('applicationNo') applicationNo: string,
    @Body() dto: RecordAcceptanceDto,
    @Request() req,
  ) {
    return this.acceptanceService.recordCandidateAcceptance(orgId, applicationNo, dto, req.user.sub);
  }

  @Post('onboarding')
  @Roles(...STAFF_WRITE)
  @ResponseMessage('Onboarding package sent')
  sendOnboarding(
    @Param('orgId') orgId: string,
    @Param('applicationNo') applicationNo: string,
    @Body() dto: SendOnboardingDto,
    @Request() req,
  ) {
    return this.acceptanceService.sendOnboardingPackage(orgId, applicationNo, dto, req.user.sub);
  }
}

@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Controller('organizations/:orgId/acceptances')
export class OrgAcceptancesController {
  constructor(private readonly acceptanceService: AcceptanceService) {}

  @Get()
  @Roles(...STAFF_READ)
  @ResponseMessage('Acceptances fetched successfully')
  list(@Param('orgId') orgId: string, @Query('status') status?: string) {
    return this.acceptanceService.listAcceptances(orgId, status);
  }
}
