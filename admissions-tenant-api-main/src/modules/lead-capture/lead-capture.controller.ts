import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { TenantGuard } from '../../common/guards/tenant.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Role } from '../../common/enums/roles.enum.js';
import { ResponseMessage } from '../../common/decorators/response-message.decorator.js';
import { LeadCaptureService } from './lead-capture.service.js';
import {
  AddPortalDto,
  CreateCaptureEventDto,
  ImportCsvDto,
  RegenerateKeyDto,
  UpdateCaptureEventDto,
  UpdateCaptureSettingsDto,
  UpdatePortalDto,
} from './dto/lead-capture.dto.js';

/** Org-side configuration of lead capture channels (settings → lead integrations). */
@Controller('organizations/:orgId/lead-capture')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class LeadCaptureController {
  constructor(private readonly capture: LeadCaptureService) {}

  @Get('settings')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.LEAD_MANAGER)
  @ResponseMessage('Lead capture settings fetched')
  getSettings(@Param('orgId', ParseUUIDPipe) orgId: string) {
    return this.capture.getSettingsView(orgId);
  }

  @Patch('settings')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN)
  @ResponseMessage('Lead capture settings updated')
  updateSettings(@Param('orgId', ParseUUIDPipe) orgId: string, @Body() dto: UpdateCaptureSettingsDto) {
    return this.capture.updateSettings(orgId, dto);
  }

  @Post('settings/regenerate')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN)
  @ResponseMessage('Key regenerated')
  regenerate(@Param('orgId', ParseUUIDPipe) orgId: string, @Body() dto: RegenerateKeyDto) {
    return this.capture.regenerate(orgId, dto);
  }

  @Post('portals')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN)
  @ResponseMessage('Portal integration added')
  addPortal(@Param('orgId', ParseUUIDPipe) orgId: string, @Body() dto: AddPortalDto) {
    return this.capture.addPortal(orgId, dto);
  }

  @Patch('portals/:portalId')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN)
  @ResponseMessage('Portal integration updated')
  updatePortal(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('portalId') portalId: string,
    @Body() dto: UpdatePortalDto,
  ) {
    return this.capture.updatePortal(orgId, portalId, dto);
  }

  @Delete('portals/:portalId')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN)
  @ResponseMessage('Portal integration removed')
  removePortal(@Param('orgId', ParseUUIDPipe) orgId: string, @Param('portalId') portalId: string) {
    return this.capture.removePortal(orgId, portalId);
  }

  @Post('facebook/sync')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.LEAD_MANAGER)
  @ResponseMessage('Facebook lead forms synced')
  facebookSync(@Param('orgId', ParseUUIDPipe) orgId: string) {
    return this.capture.facebookSync(orgId);
  }

  // ---- CSV import ----
  @Post('import')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.LEAD_MANAGER)
  @ResponseMessage('Leads imported')
  importCsv(@Param('orgId', ParseUUIDPipe) orgId: string, @Body() dto: ImportCsvDto, @Request() req: any) {
    return this.capture.importCsv(orgId, req.user.sub, dto);
  }

  @Get('imports')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.LEAD_MANAGER)
  @ResponseMessage('Import history fetched')
  listBatches(@Param('orgId', ParseUUIDPipe) orgId: string) {
    return this.capture.listBatches(orgId);
  }

  // ---- events ----
  @Get('events')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.LEAD_MANAGER)
  @ResponseMessage('Capture events fetched')
  listEvents(@Param('orgId', ParseUUIDPipe) orgId: string) {
    return this.capture.listEvents(orgId);
  }

  @Post('events')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.LEAD_MANAGER)
  @ResponseMessage('Capture event created')
  createEvent(@Param('orgId', ParseUUIDPipe) orgId: string, @Body() dto: CreateCaptureEventDto, @Request() req: any) {
    return this.capture.createEvent(orgId, req.user.sub, dto);
  }

  @Patch('events/:id')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.LEAD_MANAGER)
  @ResponseMessage('Capture event updated')
  updateEvent(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCaptureEventDto,
  ) {
    return this.capture.updateEvent(orgId, id, dto);
  }

  @Delete('events/:id')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN)
  @ResponseMessage('Capture event deleted')
  removeEvent(@Param('orgId', ParseUUIDPipe) orgId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.capture.removeEvent(orgId, id);
  }

  // ---- chatbot ----
  @Get('chatbot/conversations')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.LEAD_MANAGER)
  @ResponseMessage('Chatbot conversations fetched')
  conversations(@Param('orgId', ParseUUIDPipe) orgId: string) {
    return this.capture.listConversations(orgId);
  }
}

/**
 * Public, key-protected capture endpoints (no login): landing pages, generic API,
 * Meta Lead Ads, LinkedIn Lead Gen, education portals, event QR registration, chatbots.
 */
@Controller('public/lead-capture')
export class PublicLeadCaptureController {
  constructor(private readonly capture: LeadCaptureService) {}

  // ---- events (QR) — declared before ':apiKey' routes ----
  @Get('events/:slug')
  @ResponseMessage('Event fetched')
  event(@Param('slug') slug: string) {
    return this.capture.publicEvent(slug);
  }

  /** Self-contained registration page the event QR code points to (no frontend needed). */
  @Get('events/:slug/page')
  async eventPage(@Param('slug') slug: string, @Res() res: any) {
    try {
      const html = await this.capture.eventRegistrationHtml(slug);
      res.status(200).type('text/html').send(html);
    } catch (e: any) {
      res.status(e?.status || 404).type('text/html').send(`<p style="font-family:sans-serif">${e?.message || 'Not found'}</p>`);
    }
  }

  @Post('events/:slug/register')
  @HttpCode(200)
  @ResponseMessage('Registration received')
  register(@Param('slug') slug: string, @Body() body: any) {
    return this.capture.registerForEvent(slug, body);
  }

  // ---- education portals ----
  @Post('portal/:portalKey')
  @HttpCode(200)
  @ResponseMessage('Portal leads received')
  portal(@Param('portalKey') portalKey: string, @Body() body: any) {
    return this.capture.capturePortal(portalKey, body);
  }

  /** Same endpoint with the key in the X-API-Key header */
  @Post('portal')
  @HttpCode(200)
  @ResponseMessage('Portal leads received')
  portalHeader(@Headers('x-api-key') key: string, @Body() body: any) {
    return this.capture.capturePortal(key, body);
  }

  // ---- web / landing pages ----
  @Post(':apiKey/web')
  @HttpCode(200)
  @ResponseMessage('Lead received')
  web(@Param('apiKey') apiKey: string, @Body() body: any, @Req() req: any) {
    return this.capture.captureWeb(apiKey, body, {
      referer: req.headers?.referer || req.headers?.referrer,
      ip: req.ip,
      userAgent: req.headers?.['user-agent'],
    });
  }

  @Post(':apiKey/api')
  @HttpCode(200)
  @ResponseMessage('Lead received')
  api(@Param('apiKey') apiKey: string, @Body() body: any) {
    return this.capture.captureApi(apiKey, body);
  }

  // ---- Meta Lead Ads ----
  @Get(':apiKey/facebook')
  async facebookVerify(@Param('apiKey') apiKey: string, @Query() query: any, @Res() res: any) {
    try {
      const challenge = await this.capture.facebookVerify(apiKey, query);
      res.status(200).type('text/plain').send(challenge);
    } catch (e: any) {
      res.status(e?.status || 403).type('text/plain').send(e?.message || 'Forbidden');
    }
  }

  @Post(':apiKey/facebook')
  @HttpCode(200)
  @ResponseMessage('Webhook processed')
  facebook(
    @Param('apiKey') apiKey: string,
    @Body() body: any,
    @Req() req: any,
    @Headers('x-hub-signature-256') sig?: string,
  ) {
    return this.capture.facebookWebhook(apiKey, body, req.rawBody, sig);
  }

  // ---- LinkedIn Lead Gen ----
  @Get(':apiKey/linkedin')
  async linkedinChallenge(@Param('apiKey') apiKey: string, @Query('challengeCode') code: string, @Res() res: any) {
    try {
      res.status(200).json(await this.capture.linkedinChallenge(apiKey, code));
    } catch (e: any) {
      res.status(e?.status || 400).json({ message: e?.message || 'Bad request' });
    }
  }

  @Post(':apiKey/linkedin')
  @HttpCode(200)
  @ResponseMessage('Webhook processed')
  linkedin(
    @Param('apiKey') apiKey: string,
    @Body() body: any,
    @Req() req: any,
    @Headers('x-li-signature') sig?: string,
  ) {
    return this.capture.linkedinWebhook(apiKey, body, req.rawBody, sig);
  }

  // ---- chatbot ----
  @Post(':apiKey/chatbot')
  @HttpCode(200)
  @ResponseMessage('Conversation received')
  chatbot(@Param('apiKey') apiKey: string, @Body() body: any) {
    return this.capture.captureChatbot(apiKey, body);
  }
}
