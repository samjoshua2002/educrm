import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Res,
  Req,
  ParseUUIDPipe,
  Headers,
  HttpCode,
} from '@nestjs/common';
import type { Response, Request as ExpressRequest } from 'express';
import { DataSource } from 'typeorm';
import { CallsService, CallActor } from './calls.service.js';
import { CreateCallLogDto, UpdateCallLogDto, ClickToCallDto, UpdateTelephonySettingsDto } from './dto/call.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { TenantGuard } from '../../common/guards/tenant.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Role } from '../../common/enums/roles.enum.js';
import { ResponseMessage } from '../../common/decorators/response-message.decorator.js';
import { resolveActor } from '../messaging/actor.util.js';

const STAFF = [Role.SUPERADMIN, Role.ORG_ADMIN, Role.LEAD_MANAGER, Role.COUNSELOR, Role.APPLICATION_MANAGER];

@Controller('organizations/:orgId/calls')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class CallsController {
  constructor(
    private readonly service: CallsService,
    private readonly dataSource: DataSource,
  ) {}

  private async actor(req: any): Promise<CallActor> {
    const a = await resolveActor(this.dataSource, req);
    return { id: a.id, name: a.name, role: a.role, phone: a.phone };
  }

  // Settings routes first so they are not captured by ':id'.
  @Get('settings')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN)
  @ResponseMessage('Telephony settings fetched successfully')
  getSettings(@Param('orgId', ParseUUIDPipe) orgId: string) {
    return this.service.getSettingsView(orgId);
  }

  @Patch('settings')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN)
  @ResponseMessage('Telephony settings updated successfully')
  updateSettings(@Param('orgId', ParseUUIDPipe) orgId: string, @Body() dto: UpdateTelephonySettingsDto) {
    return this.service.updateSettings(orgId, dto as any);
  }

  @Post('settings/test')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN)
  @HttpCode(200)
  @ResponseMessage('Telephony credentials checked')
  testSettings(@Param('orgId', ParseUUIDPipe) orgId: string) {
    return this.service.testSettings(orgId);
  }

  @Get('stats')
  @Roles(...STAFF)
  @ResponseMessage('Call statistics fetched successfully')
  stats(@Param('orgId', ParseUUIDPipe) orgId: string) {
    return this.service.stats(orgId);
  }

  @Post('click-to-call')
  @Roles(...STAFF)
  @ResponseMessage('Call initiated')
  async clickToCall(@Param('orgId', ParseUUIDPipe) orgId: string, @Body() dto: ClickToCallDto, @Request() req: any) {
    return this.service.clickToCall(orgId, dto, await this.actor(req));
  }

  @Get()
  @Roles(...STAFF)
  @ResponseMessage('Call log fetched successfully')
  async list(@Param('orgId', ParseUUIDPipe) orgId: string, @Query() q: Record<string, string>, @Request() req: any) {
    return this.service.list(orgId, q, await this.actor(req));
  }

  @Post()
  @Roles(...STAFF)
  @ResponseMessage('Call logged successfully')
  async create(@Param('orgId', ParseUUIDPipe) orgId: string, @Body() dto: CreateCallLogDto, @Request() req: any) {
    return this.service.create(orgId, dto, await this.actor(req));
  }

  @Get(':id')
  @Roles(...STAFF)
  @ResponseMessage('Call fetched successfully')
  get(@Param('orgId', ParseUUIDPipe) orgId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.get(orgId, id);
  }

  @Patch(':id')
  @Roles(...STAFF)
  @ResponseMessage('Call updated successfully')
  async update(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCallLogDto,
    @Request() req: any,
  ) {
    return this.service.update(orgId, id, dto, await this.actor(req));
  }

  @Delete(':id')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN)
  @ResponseMessage('Call deleted')
  remove(@Param('orgId', ParseUUIDPipe) orgId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(orgId, id);
  }
}

const fullUrl = (req: ExpressRequest) => `${req.protocol}://${req.get('host')}${req.originalUrl}`;

/**
 * Public telephony provider callbacks, authenticated by the per-organization
 * `token` query parameter (plus Twilio's signature when present).
 */
@Controller('calls/webhooks')
export class CallsWebhooksController {
  constructor(private readonly service: CallsService) {}

  @Post('exotel/:orgId')
  @HttpCode(200)
  exotelStatus(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Query('token') token: string,
    @Query('call') call: string,
    @Body() body: Record<string, any>,
  ) {
    return this.service.handleExotelStatus(orgId, token, call, body || {});
  }

  @Get('exotel/:orgId/inbound')
  @HttpCode(200)
  exotelInboundGet(@Param('orgId', ParseUUIDPipe) orgId: string, @Query() q: Record<string, any>) {
    return this.service.handleExotelInbound(orgId, q.token, q);
  }

  @Post('exotel/:orgId/inbound')
  @HttpCode(200)
  exotelInboundPost(@Param('orgId', ParseUUIDPipe) orgId: string, @Query('token') token: string, @Body() body: Record<string, any>) {
    return this.service.handleExotelInbound(orgId, token, body || {});
  }

  @Post('twilio/:orgId')
  @HttpCode(200)
  twilioStatus(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Query('token') token: string,
    @Query('call') call: string,
    @Body() body: Record<string, any>,
    @Req() req: ExpressRequest,
    @Headers('x-twilio-signature') signature?: string,
  ) {
    return this.service.handleTwilioStatus(orgId, token, call, body || {}, signature, fullUrl(req));
  }

  @Post('twilio/:orgId/recording')
  @HttpCode(200)
  twilioRecording(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Query('token') token: string,
    @Query('call') call: string,
    @Body() body: Record<string, any>,
    @Req() req: ExpressRequest,
    @Headers('x-twilio-signature') signature?: string,
  ) {
    return this.service.handleTwilioRecording(orgId, token, call, body || {}, signature, fullUrl(req));
  }

  @Post('twilio/:orgId/inbound')
  async twilioInbound(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Query('token') token: string,
    @Body() body: Record<string, any>,
    @Req() req: ExpressRequest,
    @Res() res: Response,
    @Headers('x-twilio-signature') signature?: string,
  ) {
    try {
      const twiml = await this.service.handleTwilioInbound(orgId, token, body || {}, signature, fullUrl(req));
      res.status(200).type('text/xml').send(twiml);
    } catch {
      res.status(403).type('text/xml').send('<?xml version="1.0" encoding="UTF-8"?><Response><Reject/></Response>');
    }
  }
}
