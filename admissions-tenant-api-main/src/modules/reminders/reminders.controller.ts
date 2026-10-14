import {
  Body,
  Controller,
  Get,
  Res,
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
import { RemindersService } from './reminders.service.js';
import { CloseReminderDto, ReminderPreferencesDto, UpdateReminderRuleDto } from './dto/reminder.dto.js';
import {
  APPLICANT_RESPONSES,
  REMINDER_CHANNELS,
  REMINDER_STATUSES,
  REMINDER_TYPES,
  TRIGGER_EVENTS,
} from './entities/reminder.entity.js';

const STAFF = [Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER, Role.COUNSELOR];
const MANAGERS = [Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER];

@Controller('organizations/:orgId/reminders')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class RemindersController {
  constructor(private readonly reminders: RemindersService) {}

  @Get('meta')
  @Roles(...STAFF)
  @ResponseMessage('Reminder picklists fetched successfully')
  meta() {
    return {
      reminderTypes: REMINDER_TYPES,
      triggerEvents: TRIGGER_EVENTS,
      channels: REMINDER_CHANNELS,
      reminderStatuses: REMINDER_STATUSES,
      applicantResponses: APPLICANT_RESPONSES,
    };
  }

  @Get()
  @Roles(...STAFF)
  @ResponseMessage('Reminders fetched successfully')
  list(@Param('orgId', ParseUUIDPipe) orgId: string, @Query() q: any) {
    return this.reminders.list(orgId, q);
  }

  @Get('rules')
  @Roles(...STAFF)
  @ResponseMessage('Reminder rules fetched successfully')
  rules(@Param('orgId', ParseUUIDPipe) orgId: string) {
    return this.reminders.getRules(orgId);
  }

  @Put('rules/:scenario')
  @Roles(...MANAGERS)
  @ResponseMessage('Reminder rule updated successfully')
  updateRule(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('scenario') scenario: string,
    @Body() dto: UpdateReminderRuleDto,
  ) {
    return this.reminders.updateRule(orgId, scenario, dto as any);
  }

  @Get('templates')
  @Roles(...STAFF)
  @ResponseMessage('Templates fetched successfully')
  templates(@Param('orgId', ParseUUIDPipe) orgId: string) {
    return this.reminders.templates(orgId);
  }

  @Post('run')
  @Roles(...MANAGERS)
  @ResponseMessage('Reminder run completed')
  run(@Param('orgId', ParseUUIDPipe) orgId: string) {
    return this.reminders.runForOrganization(orgId);
  }

  @Get('application/:applicationId')
  @Roles(...STAFF, Role.STUDENT)
  @ResponseMessage('Application reminders fetched successfully')
  forApplication(@Param('orgId', ParseUUIDPipe) orgId: string, @Param('applicationId') applicationId: string, @Req() req: any) {
    return this.reminders.forApplication(orgId, decodeURIComponent(applicationId), req.user);
  }

  @Patch('application/:applicationId/preferences')
  @Roles(...STAFF, Role.STUDENT)
  @ResponseMessage('Reminder preferences updated')
  preferences(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('applicationId') applicationId: string,
    @Req() req: any,
    @Body() dto: ReminderPreferencesDto,
  ) {
    return this.reminders.updatePreferences(orgId, decodeURIComponent(applicationId), req.user, dto);
  }

  @Post(':id/send-now')
  @Roles(...MANAGERS)
  @ResponseMessage('Reminder sent')
  sendNow(@Param('orgId', ParseUUIDPipe) orgId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.reminders.sendNow(orgId, id);
  }

  @Patch(':id/close')
  @Roles(...MANAGERS)
  @ResponseMessage('Reminder closed')
  close(@Param('orgId', ParseUUIDPipe) orgId: string, @Param('id', ParseUUIDPipe) id: string, @Body() dto: CloseReminderDto) {
    return this.reminders.close(orgId, id, dto.applicantResponse);
  }
}

/** Public one-click opt-out link included in every reminder e-mail. */
@Controller('reminders')
export class RemindersPublicController {
  constructor(private readonly reminders: RemindersService) {}

  @Get('unsubscribe')
  async unsubscribe(@Query('a') applicationId: string, @Query('t') token: string, @Res() res: any) {
    const ok = await this.reminders.unsubscribe(applicationId, token);
    const msg = ok
      ? 'You will no longer receive application reminders. You can turn them back on from your applicant portal.'
      : 'This link is invalid or has expired.';
    res.status(200).type('html').send(`<!doctype html><html><head><meta charset="utf-8"><title>Reminders</title></head><body style="font-family:Arial,sans-serif;max-width:560px;margin:60px auto;color:#1f2937"><h2>Application reminders</h2><p>${msg}</p></body></html>`);
  }
}
