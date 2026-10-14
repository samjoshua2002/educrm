import { Controller, Get, Patch, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { WaitlistService } from './waitlist.service.js';
import { ReleaseOfferDto, SeatAvailableDto, UpdateWaitlistDto } from './dto/acceptance.dto.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { TenantGuard } from '../../common/guards/tenant.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { ResponseMessage } from '../../common/decorators/response-message.decorator.js';
import { STAFF_READ, STAFF_WRITE } from './admission-decisions.controller.js';

@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Controller('organizations/:orgId/applications/:applicationNo/waitlist')
export class WaitlistController {
  constructor(private readonly waitlistService: WaitlistService) {}

  @Get()
  @Roles(...STAFF_READ)
  @ResponseMessage('Waitlist entry fetched successfully')
  getEntry(@Param('orgId') orgId: string, @Param('applicationNo') applicationNo: string) {
    return this.waitlistService.getEntry(orgId, applicationNo);
  }

  @Patch()
  @Roles(...STAFF_WRITE)
  @ResponseMessage('Waitlist entry updated')
  updateEntry(
    @Param('orgId') orgId: string,
    @Param('applicationNo') applicationNo: string,
    @Body() dto: UpdateWaitlistDto,
    @Request() req,
  ) {
    return this.waitlistService.updateEntry(orgId, applicationNo, dto, req.user.sub);
  }

  @Post('release-offer')
  @Roles(...STAFF_WRITE)
  @ResponseMessage('Offer released to the waitlisted applicant')
  releaseOffer(
    @Param('orgId') orgId: string,
    @Param('applicationNo') applicationNo: string,
    @Body() dto: ReleaseOfferDto,
    @Request() req,
  ) {
    return this.waitlistService.releaseOffer(orgId, applicationNo, dto, req.user.sub);
  }

  @Post('close')
  @Roles(...STAFF_WRITE)
  @ResponseMessage('Waitlist entry closed')
  closeEntry(@Param('orgId') orgId: string, @Param('applicationNo') applicationNo: string, @Request() req) {
    return this.waitlistService.closeWaitlistEntry(orgId, applicationNo, req.user.sub);
  }
}

@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Controller('organizations/:orgId/waitlist')
export class OrgWaitlistController {
  constructor(private readonly waitlistService: WaitlistService) {}

  // ?status=active (default) | offer_released | converted | closed | all ; ?program=
  @Get()
  @Roles(...STAFF_READ)
  @ResponseMessage('Waitlist fetched successfully')
  getWaitlist(@Param('orgId') orgId: string, @Query('program') program?: string, @Query('status') status?: string) {
    return this.waitlistService.getWaitlist(orgId, program, status);
  }

  // New seats in a program: release offers to the next ranked applicants.
  @Post('seats-available')
  @Roles(...STAFF_WRITE)
  @ResponseMessage('Waitlist offers released')
  seatsAvailable(@Param('orgId') orgId: string, @Body() dto: SeatAvailableDto, @Request() req) {
    return this.waitlistService.seatsAdded(orgId, dto, req.user.sub);
  }
}
