import { Controller, Get, Post, Patch, Body, Param, UseGuards, Request, Query } from '@nestjs/common';
import { InterviewsBookingService } from './interviews-booking.service.js';
import { BookInterviewDto } from './dto/book-interview.dto.js';
import { RescheduleInterviewDto } from './dto/reschedule-interview.dto.js';
import { CompleteInterviewDto } from './dto/complete-interview.dto.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Role } from '../../common/enums/roles.enum.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('organizations/:orgId/interviews')
export class InterviewsBookingController {
  constructor(private readonly bookingService: InterviewsBookingService) {}

  @Post('book')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.EXAM_MANAGER)
  book(@Param('orgId') orgId: string, @Body() dto: BookInterviewDto, @Request() req) {
    return this.bookingService.book(orgId, dto, req.user.sub);
  }

  @Get()
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.EXAM_MANAGER)
  findAll(
    @Param('orgId') orgId: string,
    @Query('applicationId') applicationId?: string,
    @Query('interviewType') interviewType?: string,
    @Query('status') status?: string,
  ) {
    return this.bookingService.findAllByOrg(orgId, { applicationId, interviewType, status });
  }

  @Get(':id')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.EXAM_MANAGER)
  findOne(@Param('id') id: string, @Param('orgId') orgId: string) {
    return this.bookingService.findOneOrThrow(id, orgId);
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
