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
  ParseUUIDPipe,
  HttpCode,
} from '@nestjs/common';
import type { Response } from 'express';
import { DataSource } from 'typeorm';
import { EmailCampaignsService } from './email-campaigns.service.js';
import {
  CreateEmailCampaignDto,
  UpdateEmailCampaignDto,
  CampaignStatusDto,
  TestCampaignDto,
  AddSuppressionDto,
  AudiencePreviewDto,
} from './dto/email-campaign.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { TenantGuard } from '../../common/guards/tenant.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Role } from '../../common/enums/roles.enum.js';
import { ResponseMessage } from '../../common/decorators/response-message.decorator.js';
import { resolveActor } from '../messaging/actor.util.js';

const VIEW = [Role.SUPERADMIN, Role.ORG_ADMIN, Role.LEAD_MANAGER, Role.APPLICATION_MANAGER, Role.COUNSELOR];
const MANAGE = [Role.SUPERADMIN, Role.ORG_ADMIN, Role.LEAD_MANAGER, Role.APPLICATION_MANAGER];

@Controller('organizations/:orgId/email-campaigns')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class EmailCampaignsController {
  constructor(
    private readonly service: EmailCampaignsService,
    private readonly dataSource: DataSource,
  ) {}

  private async actor(req: any) {
    const a = await resolveActor(this.dataSource, req);
    return { id: a.id, name: a.name };
  }

  @Get()
  @Roles(...VIEW)
  @ResponseMessage('Campaigns fetched successfully')
  list(@Param('orgId', ParseUUIDPipe) orgId: string, @Query() q: Record<string, string>) {
    return this.service.list(orgId, q);
  }

  @Get('overview')
  @Roles(...VIEW)
  @ResponseMessage('Campaign overview fetched successfully')
  overview(@Param('orgId', ParseUUIDPipe) orgId: string) {
    return this.service.overview(orgId);
  }

  @Post('audience-preview')
  @Roles(...VIEW)
  @HttpCode(200)
  @ResponseMessage('Audience resolved')
  audiencePreview(@Param('orgId', ParseUUIDPipe) orgId: string, @Body() dto: AudiencePreviewDto) {
    return this.service.previewAudience(orgId, dto);
  }

  @Get('suppressions')
  @Roles(...VIEW)
  @ResponseMessage('Suppression list fetched successfully')
  suppressions(@Param('orgId', ParseUUIDPipe) orgId: string, @Query() q: Record<string, string>) {
    return this.service.listSuppressions(orgId, q);
  }

  @Post('suppressions')
  @Roles(...MANAGE)
  @ResponseMessage('Address added to the suppression list')
  addSuppression(@Param('orgId', ParseUUIDPipe) orgId: string, @Body() dto: AddSuppressionDto) {
    return this.service.addSuppression(orgId, dto);
  }

  @Delete('suppressions/:id')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN)
  @ResponseMessage('Address removed from the suppression list')
  removeSuppression(@Param('orgId', ParseUUIDPipe) orgId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.removeSuppression(orgId, id);
  }

  @Post()
  @Roles(...MANAGE)
  @ResponseMessage('Campaign created successfully')
  async create(@Param('orgId', ParseUUIDPipe) orgId: string, @Body() dto: CreateEmailCampaignDto, @Request() req: any) {
    return this.service.create(orgId, dto, await this.actor(req));
  }

  @Get(':id')
  @Roles(...VIEW)
  @ResponseMessage('Campaign fetched successfully')
  get(@Param('orgId', ParseUUIDPipe) orgId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.get(orgId, id);
  }

  @Get(':id/stats')
  @Roles(...VIEW)
  @ResponseMessage('Campaign statistics fetched successfully')
  stats(@Param('orgId', ParseUUIDPipe) orgId: string, @Param('id', ParseUUIDPipe) id: string, @Query() q: Record<string, string>) {
    return this.service.stats(orgId, id, q);
  }

  @Get(':id/preview')
  @Roles(...VIEW)
  @ResponseMessage('Campaign preview generated')
  preview(@Param('orgId', ParseUUIDPipe) orgId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.preview(orgId, id);
  }

  @Patch(':id')
  @Roles(...MANAGE)
  @ResponseMessage('Campaign updated successfully')
  async update(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEmailCampaignDto,
    @Request() req: any,
  ) {
    return this.service.update(orgId, id, dto, await this.actor(req));
  }

  @Post(':id/status')
  @Roles(...MANAGE)
  @ResponseMessage('Campaign status updated')
  async setStatus(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CampaignStatusDto,
    @Request() req: any,
  ) {
    return this.service.setStatus(orgId, id, dto.status, await this.actor(req));
  }

  @Post(':id/send-now')
  @Roles(...MANAGE)
  @ResponseMessage('Campaign sent')
  async sendNow(@Param('orgId', ParseUUIDPipe) orgId: string, @Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.service.sendNow(orgId, id, await this.actor(req));
  }

  @Post(':id/test')
  @Roles(...MANAGE)
  @ResponseMessage('Test email sent')
  test(@Param('orgId', ParseUUIDPipe) orgId: string, @Param('id', ParseUUIDPipe) id: string, @Body() dto: TestCampaignDto) {
    return this.service.sendTest(orgId, id, dto.to);
  }

  @Post(':id/duplicate')
  @Roles(...MANAGE)
  @ResponseMessage('Campaign duplicated')
  async duplicate(@Param('orgId', ParseUUIDPipe) orgId: string, @Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.service.duplicate(orgId, id, await this.actor(req));
  }

  @Delete(':id')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN)
  @ResponseMessage('Campaign deleted')
  remove(@Param('orgId', ParseUUIDPipe) orgId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(orgId, id);
  }
}

const PIXEL = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

const page = (title: string, body: string) => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title></head><body style="margin:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#0f172a;">
<div style="max-width:480px;margin:64px auto;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:32px;text-align:center;">${body}</div></body></html>`;

const esc = (s: string) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string);

/** Public endpoints embedded in campaign emails: open pixel, click redirect, unsubscribe. */
@Controller('email-campaigns/public')
export class EmailCampaignTrackingController {
  constructor(private readonly service: EmailCampaignsService) {}

  @Get('o/:token')
  async open(@Param('token') token: string, @Res() res: Response) {
    await this.service.recordOpen(String(token).replace(/\.gif$/i, ''));
    res.set({
      'Content-Type': 'image/gif',
      'Content-Length': String(PIXEL.length),
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      Pragma: 'no-cache',
    });
    res.status(200).end(PIXEL);
  }

  @Get('c/:token')
  async click(@Param('token') token: string, @Query('u') url: string, @Res() res: Response) {
    const target = await this.service.recordClick(token, url);
    if (!target) {
      res.status(400).type('html').send(page('Invalid link', '<h2>This link is not valid.</h2>'));
      return;
    }
    res.redirect(302, target);
  }

  @Get('u/:token')
  async unsubscribePage(@Param('token') token: string, @Res() res: Response) {
    const r = await this.service.unsubscribe(token);
    const html = r.ok
      ? page(
          'Unsubscribed',
          `<h2 style="margin:0 0 12px;">You have been unsubscribed</h2>
           <p style="color:#475569;margin:0;">${esc(r.email || '')} will no longer receive campaign emails${r.organization ? ` from ${esc(r.organization)}` : ''}.</p>`,
        )
      : page('Link expired', '<h2 style="margin:0 0 12px;">This unsubscribe link is not valid</h2><p style="color:#475569;margin:0;">Please contact the admissions office.</p>');
    res.status(r.ok ? 200 : 404).type('html').send(html);
  }

  /** RFC 8058 one-click unsubscribe (List-Unsubscribe-Post). */
  @Post('u/:token')
  @HttpCode(200)
  async unsubscribeOneClick(@Param('token') token: string, @Res() res: Response) {
    const r = await this.service.unsubscribe(token);
    res.status(r.ok ? 200 : 404).json({ ok: r.ok });
  }
}
