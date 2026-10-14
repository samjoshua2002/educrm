import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
  Headers,
  HttpCode,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { MessagingService } from './messaging.service.js';
import {
  UpdateMessagingSettingsDto,
  SendMessageDto,
  SendBulkMessageDto,
  SetConsentDto,
  TestMessageDto,
} from './dto/messaging.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { TenantGuard } from '../../common/guards/tenant.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Role } from '../../common/enums/roles.enum.js';
import { ResponseMessage } from '../../common/decorators/response-message.decorator.js';
import { resolveActor } from './actor.util.js';

const STAFF = [Role.SUPERADMIN, Role.ORG_ADMIN, Role.LEAD_MANAGER, Role.COUNSELOR, Role.APPLICATION_MANAGER];

@Controller('organizations/:orgId/messaging')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class MessagingController {
  constructor(
    private readonly service: MessagingService,
    private readonly dataSource: DataSource,
  ) {}

  @Get('settings')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN)
  @ResponseMessage('Messaging settings fetched successfully')
  getSettings(@Param('orgId', ParseUUIDPipe) orgId: string) {
    return this.service.getSettingsView(orgId);
  }

  @Patch('settings')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN)
  @ResponseMessage('Messaging settings updated successfully')
  updateSettings(@Param('orgId', ParseUUIDPipe) orgId: string, @Body() dto: UpdateMessagingSettingsDto) {
    return this.service.updateSettings(orgId, dto as any);
  }

  @Post('settings/test')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN)
  @ResponseMessage('Test message processed')
  async test(@Param('orgId', ParseUUIDPipe) orgId: string, @Body() dto: TestMessageDto, @Request() req: any) {
    const actor = await resolveActor(this.dataSource, req);
    return this.service.sendTest(orgId, dto, { id: actor.id || undefined, name: actor.name || undefined });
  }

  @Post('send')
  @Roles(...STAFF)
  @ResponseMessage('Message processed')
  async send(@Param('orgId', ParseUUIDPipe) orgId: string, @Body() dto: SendMessageDto, @Request() req: any) {
    const actor = await resolveActor(this.dataSource, req);
    return this.service.sendFromUi(orgId, dto as any, { id: actor.id || undefined, name: actor.name || undefined });
  }

  @Post('send-bulk')
  @Roles(...STAFF)
  @ResponseMessage('Bulk messages processed')
  async sendBulk(@Param('orgId', ParseUUIDPipe) orgId: string, @Body() dto: SendBulkMessageDto, @Request() req: any) {
    const actor = await resolveActor(this.dataSource, req);
    return this.service.sendBulk(orgId, dto as any, { id: actor.id || undefined, name: actor.name || undefined });
  }

  @Get('logs')
  @Roles(...STAFF)
  @ResponseMessage('Message log fetched successfully')
  logs(@Param('orgId', ParseUUIDPipe) orgId: string, @Query() q: Record<string, string>) {
    return this.service.listLogs(orgId, q);
  }

  @Get('stats')
  @Roles(...STAFF)
  @ResponseMessage('Message statistics fetched successfully')
  stats(@Param('orgId', ParseUUIDPipe) orgId: string) {
    return this.service.stats(orgId);
  }

  @Get('logs/:id')
  @Roles(...STAFF)
  @ResponseMessage('Message fetched successfully')
  log(@Param('orgId', ParseUUIDPipe) orgId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.findLog(orgId, id);
  }

  @Post('logs/:id/retry')
  @Roles(...STAFF)
  @ResponseMessage('Message retried')
  retry(@Param('orgId', ParseUUIDPipe) orgId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.retry(orgId, id);
  }

  @Post('logs/:id/cancel')
  @Roles(...STAFF)
  @ResponseMessage('Scheduled message cancelled')
  cancel(@Param('orgId', ParseUUIDPipe) orgId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.cancelScheduled(orgId, id);
  }

  @Get('consents')
  @Roles(...STAFF)
  @ResponseMessage('Consents fetched successfully')
  consents(@Param('orgId', ParseUUIDPipe) orgId: string, @Query() q: Record<string, string>) {
    return this.service.listConsents(orgId, q as any);
  }

  @Post('consents')
  @Roles(...STAFF)
  @ResponseMessage('Consent updated successfully')
  setConsent(@Param('orgId', ParseUUIDPipe) orgId: string, @Body() dto: SetConsentDto, @Request() req: any) {
    return this.service.setConsent(orgId, dto as any, req?.user?.sub);
  }
}

/**
 * Public provider callbacks (delivery status + inbound replies).
 * Authenticated by the per-organization `token` query parameter
 * (and Twilio's X-Twilio-Signature when present).
 */
@Controller('messaging/webhooks')
export class MessagingWebhooksController {
  constructor(private readonly service: MessagingService) {}

  @Post('twilio/:orgId')
  @HttpCode(200)
  twilio(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Query('token') token: string,
    @Body() body: Record<string, any>,
    @Headers('x-twilio-signature') signature?: string,
  ) {
    return this.service.handleTwilioWebhook(orgId, token, body || {}, signature);
  }

  @Post('gupshup/:orgId')
  @HttpCode(200)
  gupshup(@Param('orgId', ParseUUIDPipe) orgId: string, @Query('token') token: string, @Body() body: Record<string, any>) {
    return this.service.handleGupshupWebhook(orgId, token, body || {});
  }

  @Post('msg91/:orgId')
  @HttpCode(200)
  msg91(@Param('orgId', ParseUUIDPipe) orgId: string, @Query('token') token: string, @Body() body: any) {
    return this.service.handleMsg91Webhook(orgId, token, body);
  }
}
