import { Controller, Get, Patch, Post, Body, Param, UseGuards } from '@nestjs/common';
import { WaitlistService } from './waitlist.service.js';
import { AddToWaitlistDto } from './dto/add-to-waitlist.dto.js';
import { ReleaseOfferDto } from './dto/release-offer.dto.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Role } from '../../common/enums/roles.enum.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('organizations/:orgId/applications/:applicationNo/waitlist')
export class WaitlistController {
  constructor(private readonly waitlistService: WaitlistService) {}

  @Get()
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER, Role.EXAM_MANAGER, Role.COUNSELOR)
  getEntry(@Param('orgId') orgId: string, @Param('applicationNo') applicationNo: string) {
    return this.waitlistService.getEntry(orgId, applicationNo);
  }

  @Patch()
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER)
  updateEntry(
    @Param('orgId') orgId: string,
    @Param('applicationNo') applicationNo: string,
    @Body() dto: AddToWaitlistDto,
  ) {
    return this.waitlistService.addToWaitlist(orgId, applicationNo, dto);
  }

  @Post('release-offer')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER)
  releaseOffer(
    @Param('orgId') orgId: string,
    @Param('applicationNo') applicationNo: string,
    @Body() dto: ReleaseOfferDto,
  ) {
    return this.waitlistService.releaseOffer(orgId, applicationNo, dto);
  }

  @Post('close')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER)
  closeEntry(@Param('orgId') orgId: string, @Param('applicationNo') applicationNo: string) {
    return this.waitlistService.closeWaitlistEntry(orgId, applicationNo);
  }
}

// Non-application-scoped listing — GET /organizations/:orgId/waitlist —
// kept as a second controller class in this file since its route prefix
// differs from the application-scoped WaitlistController above.
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('organizations/:orgId/waitlist')
export class OrgWaitlistController {
  constructor(private readonly waitlistService: WaitlistService) {}

  @Get()
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER, Role.EXAM_MANAGER, Role.COUNSELOR)
  getWaitlist(@Param('orgId') orgId: string) {
    return this.waitlistService.getWaitlist(orgId);
  }
}
