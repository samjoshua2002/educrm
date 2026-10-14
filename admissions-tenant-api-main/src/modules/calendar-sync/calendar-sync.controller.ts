import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Request, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { CalendarSyncService } from './calendar-sync.service.js';
import { ConnectCalendarDto, UpdateCalendarSettingsDto, UpdateCalendarSyncDto } from './dto/calendar-sync.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { TenantGuard } from '../../common/guards/tenant.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { ResponseMessage } from '../../common/decorators/response-message.decorator.js';
import { Role } from '../../common/enums/roles.enum.js';
import { CALENDAR_PROVIDERS, CALENDAR_SYNC_STATUSES } from '../interviews/constants/interview-picklists.js';

const STAFF = [
  Role.SUPERADMIN,
  Role.ORG_ADMIN,
  Role.EXAM_MANAGER,
  Role.APPLICATION_MANAGER,
  Role.COUNSELOR,
  Role.LEAD_MANAGER,
];

@Controller('organizations/:orgId')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class CalendarSyncController {
  constructor(private readonly calendarSyncService: CalendarSyncService) {}

  // ---- Settings > Calendar Integration (OAuth app credentials) ----
  @Get('calendar-settings')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.EXAM_MANAGER, Role.APPLICATION_MANAGER, Role.COUNSELOR, Role.LEAD_MANAGER)
  getSettings(@Param('orgId') orgId: string) {
    return this.calendarSyncService.getSettings(orgId);
  }

  @Patch('calendar-settings')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN)
  @ResponseMessage('Calendar settings saved')
  updateSettings(@Param('orgId') orgId: string, @Body() dto: UpdateCalendarSettingsDto, @Request() req) {
    return this.calendarSyncService.updateSettings(orgId, dto, req.user.sub);
  }

  // ---- Interview_Calendar_Sync (interviewer connections) ----
  @Get('calendar-sync/picklists')
  @Roles(...STAFF)
  picklists() {
    return { calendarProviders: CALENDAR_PROVIDERS, syncStatuses: CALENDAR_SYNC_STATUSES };
  }

  @Get('calendar-sync')
  @Roles(...STAFF)
  list(@Param('orgId') orgId: string, @Request() req, @Query('interviewerId') interviewerId?: string) {
    return this.calendarSyncService.listConnections(orgId, req.user, interviewerId);
  }

  @Post('calendar-sync/connect')
  @Roles(...STAFF)
  connect(@Param('orgId') orgId: string, @Body() dto: ConnectCalendarDto, @Request() req) {
    return this.calendarSyncService.startConnect(orgId, dto.provider, req.user, dto.interviewerId);
  }

  @Post('calendar-sync/run')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.EXAM_MANAGER)
  @ResponseMessage('Calendar sync finished')
  runNow(@Param('orgId') orgId: string) {
    return this.calendarSyncService.runSync(orgId);
  }

  @Get('calendar-sync/interviews/:interviewId')
  @Roles(...STAFF)
  interviewEvent(@Param('orgId') orgId: string, @Param('interviewId') interviewId: string) {
    return this.calendarSyncService.getInterviewEvent(orgId, interviewId);
  }

  @Post('calendar-sync/interviews/:interviewId/sync')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.EXAM_MANAGER)
  syncInterview(@Param('orgId') orgId: string, @Param('interviewId') interviewId: string) {
    return this.calendarSyncService.syncInterview(orgId, interviewId, 'upsert');
  }

  @Post('calendar-sync/:id/refresh-availability')
  @Roles(...STAFF)
  async refreshAvailability(@Param('orgId') orgId: string, @Param('id') id: string, @Request() req) {
    // ownership check
    await this.calendarSyncService.updateConnection(orgId, id, {}, req.user);
    return this.calendarSyncService.refreshAvailability(id);
  }

  @Patch('calendar-sync/:id')
  @Roles(...STAFF)
  update(@Param('orgId') orgId: string, @Param('id') id: string, @Body() dto: UpdateCalendarSyncDto, @Request() req) {
    return this.calendarSyncService.updateConnection(orgId, id, dto, req.user);
  }

  @Delete('calendar-sync/:id')
  @Roles(...STAFF)
  @ResponseMessage('Calendar disconnected')
  disconnect(@Param('orgId') orgId: string, @Param('id') id: string, @Request() req) {
    return this.calendarSyncService.disconnect(orgId, id, req.user);
  }
}

// Public OAuth redirect target (Google / Microsoft send the browser here, so
// it cannot require a JWT). The one-time `state` identifies the connection.
@Controller('calendar-sync/oauth')
export class CalendarOAuthController {
  constructor(private readonly calendarSyncService: CalendarSyncService) {}

  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Query('error_description') errorDescription: string,
    @Res() res: Response,
  ) {
    const target = await this.calendarSyncService.handleOAuthCallback({
      code,
      state,
      error,
      error_description: errorDescription,
    });
    return res.redirect(302, target);
  }
}
