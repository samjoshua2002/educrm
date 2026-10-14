import { Controller, Get, Post, Patch, Body, Param, UseGuards, Request, Query } from '@nestjs/common';
import { InterviewsBookingService } from './interviews-booking.service.js';
import { BookInterviewDto } from './dto/book-interview.dto.js';
import { RescheduleInterviewDto } from './dto/reschedule-interview.dto.js';
import { CompleteInterviewDto } from './dto/complete-interview.dto.js';
import { CreateInterviewDto, UpdateInterviewDto } from './dto/interview.dto.js';
import * as Picklists from './constants/interview-picklists.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { TenantGuard } from '../../common/guards/tenant.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Role } from '../../common/enums/roles.enum.js';

@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Controller('organizations/:orgId/interviews')
export class InterviewsBookingController {
  constructor(private readonly bookingService: InterviewsBookingService) {}

  // Picklist values from the scope document, for the UI.
  @Get('picklists')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.EXAM_MANAGER, Role.APPLICATION_MANAGER, Role.COUNSELOR, Role.LEAD_MANAGER)
  picklists() {
    return {
      interviewTypes: Picklists.INTERVIEW_TYPES,
      interviewModes: Picklists.INTERVIEW_MODES,
      interviewStatuses: Picklists.INTERVIEW_STATUSES,
      interviewOutcomes: Picklists.INTERVIEW_OUTCOMES,
      slotStatuses: Picklists.SLOT_STATUSES,
      timeZones: Picklists.TIME_ZONES,
      recommendations: Picklists.RECOMMENDATIONS,
      evaluationStatuses: Picklists.EVALUATION_STATUSES,
      ruleStatuses: Picklists.RULE_STATUSES,
      calendarProviders: Picklists.CALENDAR_PROVIDERS,
      calendarSyncStatuses: Picklists.CALENDAR_SYNC_STATUSES,
    };
  }

  // Interview without a slot yet (status "Slot Available").
  @Post()
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.EXAM_MANAGER)
  create(@Param('orgId') orgId: string, @Body() dto: CreateInterviewDto, @Request() req) {
    return this.bookingService.create(orgId, dto, req.user.sub);
  }

  @Post('book')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.EXAM_MANAGER)
  book(@Param('orgId') orgId: string, @Body() dto: BookInterviewDto, @Request() req) {
    return this.bookingService.book(orgId, dto, req.user.sub);
  }

  @Get()
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.EXAM_MANAGER, Role.APPLICATION_MANAGER, Role.COUNSELOR, Role.STUDENT)
  findAll(
    @Param('orgId') orgId: string,
    @Query('applicationId') applicationId?: string,
    @Query('interviewType') interviewType?: string,
    @Query('status') status?: string,
  ) {
    return this.bookingService.findAllByOrg(orgId, { applicationId, interviewType, status });
  }

  @Get(':id')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.EXAM_MANAGER, Role.APPLICATION_MANAGER, Role.COUNSELOR)
  findOne(@Param('id') id: string, @Param('orgId') orgId: string) {
    return this.bookingService.findOneOrThrow(id, orgId);
  }

  @Patch(':id')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.EXAM_MANAGER)
  update(@Param('id') id: string, @Param('orgId') orgId: string, @Body() dto: UpdateInterviewDto, @Request() req) {
    return this.bookingService.update(orgId, id, dto, req.user.sub);
  }

  @Patch(':id/reschedule')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.EXAM_MANAGER)
  reschedule(@Param('id') id: string, @Param('orgId') orgId: string, @Body() dto: RescheduleInterviewDto, @Request() req) {
    return this.bookingService.reschedule(orgId, id, dto, req.user.sub);
  }

  @Patch(':id/cancel')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.EXAM_MANAGER)
  cancel(@Param('id') id: string, @Param('orgId') orgId: string, @Request() req) {
    return this.bookingService.cancel(orgId, id, req.user.sub);
  }

  @Patch(':id/no-show')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.EXAM_MANAGER)
  markNoShow(@Param('id') id: string, @Param('orgId') orgId: string, @Request() req) {
    return this.bookingService.markNoShow(orgId, id, req.user.sub);
  }

  @Patch(':id/complete')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.EXAM_MANAGER)
  markCompleted(@Param('id') id: string, @Param('orgId') orgId: string, @Body() dto: CompleteInterviewDto, @Request() req) {
    return this.bookingService.markCompleted(orgId, id, dto, req.user.sub);
  }
}
