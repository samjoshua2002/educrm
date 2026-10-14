import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { LeadCaptureSettings, PortalIntegration, DEFAULT_ENABLED_CHANNELS } from './entities/lead-capture-settings.entity.js';
import { LeadCaptureEvent } from './entities/lead-capture-event.entity.js';
import { LeadImportBatch } from './entities/lead-import-batch.entity.js';
import { ChatbotConversation } from './entities/chatbot-conversation.entity.js';
import { LeadPipelineService, IngestResult } from '../leads/lead-pipeline.service.js';
import { CapturedLeadInput, mapPayload, normalizeKey, parseCsv } from '../leads/lead-field-mapper.js';
import { MarketingCampaign } from '../campaigns/entities/marketing-campaign.entity.js';
import {
  AddPortalDto,
  CreateCaptureEventDto,
  ImportCsvDto,
  RegenerateKeyDto,
  UpdateCaptureEventDto,
  UpdateCaptureSettingsDto,
  UpdatePortalDto,
} from './dto/lead-capture.dto.js';

const SECRET_FIELDS = ['facebookAppSecret', 'facebookPageAccessToken', 'linkedinClientSecret', 'linkedinAccessToken'] as const;
const FB_LEAD_FIELDS =
  'id,created_time,field_data,ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,form_id,platform,is_organic';
const MAX_IMPORT_ROWS = 5000;

const randomKey = (bytes = 24) => crypto.randomBytes(bytes).toString('hex');
const mask = (v: string | null | undefined) => (v ? `••••${v.slice(-4)}` : null);

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

/** Converts Facebook/LinkedIn "question name → answer" pairs into a flat payload for mapPayload. */
function pairsToPayload(pairs: { name: string; value: any }[]): Record<string, any> {
  const out: Record<string, any> = {};
  for (const p of pairs) {
    if (!p.name) continue;
    out[normalizeKey(p.name)] = p.value;
  }
  return out;
}

/**
 * Lead capture integration (scope §1): web forms / landing pages, social media
 * (Meta Lead Ads, LinkedIn Lead Gen), education portals, events (CSV + QR
 * registration) and chatbots. Every captured lead goes through LeadPipelineService
 * (source tracking → scoring → routing → duplicate check).
 */
@Injectable()
export class LeadCaptureService {
  private readonly logger = new Logger(LeadCaptureService.name);

  constructor(
    @InjectRepository(LeadCaptureSettings) private readonly settingsRepo: Repository<LeadCaptureSettings>,
    @InjectRepository(LeadCaptureEvent) private readonly eventRepo: Repository<LeadCaptureEvent>,
    @InjectRepository(LeadImportBatch) private readonly batchRepo: Repository<LeadImportBatch>,
    @InjectRepository(ChatbotConversation) private readonly chatRepo: Repository<ChatbotConversation>,
    @InjectRepository(MarketingCampaign) private readonly campaignRepo: Repository<MarketingCampaign>,
    private readonly pipeline: LeadPipelineService,
  ) {}

  // ---------------------------------------------------------------------------
  // Settings
  // ---------------------------------------------------------------------------

  async getOrCreate(orgId: string): Promise<LeadCaptureSettings> {
    let s = await this.settingsRepo.findOne({ where: { organizationId: orgId } });
    if (!s) {
      s = await this.settingsRepo.save(
        this.settingsRepo.create({
          organizationId: orgId,
          apiKey: randomKey(),
          enabledChannels: { ...DEFAULT_ENABLED_CHANNELS },
          facebookVerifyToken: randomKey(12),
          facebookFormIds: [],
          portals: [],
        }),
      );
    }
    return s;
  }

  /** Settings for the settings page: secrets masked, webhook paths included. */
  async getSettingsView(orgId: string) {
    const s = await this.getOrCreate(orgId);
    const base = `/public/lead-capture/${s.apiKey}`;
    return {
      id: s.id,
      apiKey: s.apiKey,
      enabledChannels: { ...DEFAULT_ENABLED_CHANNELS, ...(s.enabledChannels || {}) },
      facebookVerifyToken: s.facebookVerifyToken,
      facebookAppSecret: mask(s.facebookAppSecret),
      facebookPageAccessToken: mask(s.facebookPageAccessToken),
      facebookPageId: s.facebookPageId,
      facebookFormIds: s.facebookFormIds || [],
      facebookGraphVersion: s.facebookGraphVersion,
      facebookLastSyncAt: s.facebookLastSyncAt,
      linkedinClientSecret: mask(s.linkedinClientSecret),
      linkedinAccessToken: mask(s.linkedinAccessToken),
      linkedinApiVersion: s.linkedinApiVersion,
      portals: (s.portals || []).map((p) => ({ ...p, endpointPath: `/public/lead-capture/portal/${p.key}` })),
      chatbotMinMessages: s.chatbotMinMessages,
      chatbotRequireContact: s.chatbotRequireContact,
      configured: {
        facebook: !!s.facebookPageAccessToken,
        facebookSignature: !!s.facebookAppSecret,
        linkedin: !!s.linkedinAccessToken,
        linkedinSignature: !!s.linkedinClientSecret,
      },
      endpoints: {
        web: `${base}/web`,
        api: `${base}/api`,
        facebook: `${base}/facebook`,
        linkedin: `${base}/linkedin`,
        chatbot: `${base}/chatbot`,
        portal: `/public/lead-capture/portal/{portalKey}`,
        eventRegistration: `/public/lead-capture/events/{slug}/page`,
      },
      updatedAt: s.updatedAt,
    };
  }

  async updateSettings(orgId: string, dto: UpdateCaptureSettingsDto) {
    const s = await this.getOrCreate(orgId);
    const patch: any = { ...dto };
    // masked values sent back unchanged must not overwrite the stored secret
    for (const f of SECRET_FIELDS) {
      const v = patch[f];
      if (typeof v === 'string' && v.startsWith('••••')) delete patch[f];
      else if (v === '') patch[f] = null;
    }
    if (patch.enabledChannels) patch.enabledChannels = { ...DEFAULT_ENABLED_CHANNELS, ...(s.enabledChannels || {}), ...patch.enabledChannels };
    if (patch.facebookFormIds) patch.facebookFormIds = patch.facebookFormIds.map((x: string) => x.trim()).filter(Boolean);
    Object.assign(s, patch);
    await this.settingsRepo.save(s);
    return this.getSettingsView(orgId);
  }

  async regenerate(orgId: string, dto: RegenerateKeyDto) {
    const s = await this.getOrCreate(orgId);
    if (dto.which === 'api') s.apiKey = randomKey();
    else if (dto.which === 'verify') s.facebookVerifyToken = randomKey(12);
    else {
      const p = (s.portals || []).find((x) => x.id === dto.portalId);
      if (!p) throw new NotFoundException('Portal not found');
      p.key = randomKey();
      s.portals = [...s.portals];
    }
    await this.settingsRepo.save(s);
    return this.getSettingsView(orgId);
  }

  async addPortal(orgId: string, dto: AddPortalDto) {
    const s = await this.getOrCreate(orgId);
    const portal: PortalIntegration = {
      id: crypto.randomUUID(),
      name: dto.name.trim(),
      key: randomKey(),
      isActive: true,
      createdAt: new Date().toISOString(),
      lastReceivedAt: null,
      leadsReceived: 0,
    };
    s.portals = [...(s.portals || []), portal];
    await this.settingsRepo.save(s);
    return this.getSettingsView(orgId);
  }

  async updatePortal(orgId: string, portalId: string, dto: UpdatePortalDto) {
    const s = await this.getOrCreate(orgId);
    const p = (s.portals || []).find((x) => x.id === portalId);
    if (!p) throw new NotFoundException('Portal not found');
    if (dto.name !== undefined) p.name = dto.name.trim();
    if (dto.isActive !== undefined) p.isActive = dto.isActive;
    s.portals = [...s.portals];
    await this.settingsRepo.save(s);
    return this.getSettingsView(orgId);
  }

  async removePortal(orgId: string, portalId: string) {
    const s = await this.getOrCreate(orgId);
    s.portals = (s.portals || []).filter((x) => x.id !== portalId);
    await this.settingsRepo.save(s);
    return this.getSettingsView(orgId);
  }

  // ---------------------------------------------------------------------------
  // Key resolution for public endpoints
  // ---------------------------------------------------------------------------

  private async byApiKey(apiKey: string, channel: string): Promise<LeadCaptureSettings> {
    if (!apiKey || apiKey.length < 16) throw new UnauthorizedException('Invalid capture key');
    const s = await this.settingsRepo.findOne({ where: { apiKey } });
    if (!s) throw new UnauthorizedException('Invalid capture key');
    const enabled = { ...DEFAULT_ENABLED_CHANNELS, ...(s.enabledChannels || {}) };
    if (enabled[channel] === false) throw new ForbiddenException(`The ${channel} capture channel is disabled`);
    return s;
  }

  private async attachCampaign(orgId: string, input: CapturedLeadInput, campaignId?: string | null) {
    if (!campaignId) return;
    const c = await this.campaignRepo.findOne({ where: { id: campaignId, organizationId: orgId } });
    if (c) {
      input.campaignId = c.id;
      input.campaignName ||= c.name;
      input.utmCampaign ||= c.utmCampaign;
      input.sourceType ||= c.sourceType;
      input.subSource ||= c.subSource;
    }
  }

  private summarize(r: IngestResult) {
    return {
      leadId: r.lead.id,
      outcome: r.outcome,
      score: r.lead.score,
      scoreBand: r.lead.scoreBand,
      assignedTo: r.lead.assignedTo ?? null,
      duplicateOf: r.match && r.outcome !== 'created' ? r.match.leadId : null,
    };
  }

  private requireContact(input: CapturedLeadInput) {
    if (!input.email && !input.phone) throw new BadRequestException('A lead needs at least an email or a phone number');
  }

  // ---------------------------------------------------------------------------
  // Web forms / landing pages and generic API
  // ---------------------------------------------------------------------------

  /** Landing-page webhook: captures UTM tags, ad click ids and the submission URL. */
  async captureWeb(apiKey: string, body: Record<string, any>, meta: { referer?: string; ip?: string; userAgent?: string }) {
    const s = await this.byApiKey(apiKey, 'web');
    const input = mapPayload(body || {});
    this.requireContact(input);
    input.channelSource = 'Web';
    input.submissionUrl ||= meta.referer || null;
    input.formName ||= body?.form_name || body?.formName || 'Landing page';
    // UTM tags embedded only in the submission URL
    this.utmFromUrl(input);
    input.rawPayload = { ...body, _meta: { ip: meta.ip, userAgent: meta.userAgent } };
    await this.attachCampaign(s.organizationId, input, body?.campaignId);
    const r = await this.pipeline.ingest(s.organizationId, input, { createdFrom: 'Web', channelSource: 'Web' });
    return this.summarize(r);
  }

  /** Generic API (CRM-to-CRM, Zapier, custom integrations). */
  async captureApi(apiKey: string, body: Record<string, any>) {
    const s = await this.byApiKey(apiKey, 'api');
    const items = Array.isArray(body?.leads) ? body.leads : [body];
    if (items.length > 500) throw new BadRequestException('At most 500 leads per request');
    const results: any[] = [];
    for (const [i, item] of items.entries()) {
      try {
        const input = mapPayload(item || {});
        this.requireContact(input);
        const channel = ['Web', 'Social', 'Portal', 'Event', 'Chatbot'].includes(input.channelSource || '')
          ? input.channelSource
          : 'Web';
        input.channelSource = channel;
        this.utmFromUrl(input);
        await this.attachCampaign(s.organizationId, input, item?.campaignId);
        const r = await this.pipeline.ingest(s.organizationId, input, { createdFrom: 'API', channelSource: channel });
        results.push({ index: i, ...this.summarize(r) });
      } catch (e: any) {
        results.push({ index: i, error: e?.message || 'Failed' });
      }
    }
    if (Array.isArray(body?.leads)) return { results };
    if (results[0].error) throw new BadRequestException(results[0].error);
    return results[0];
  }

  private utmFromUrl(input: CapturedLeadInput) {
    if (!input.submissionUrl) return;
    try {
      const u = new URL(input.submissionUrl);
      const g = (k: string) => u.searchParams.get(k);
      input.utmSource ||= g('utm_source');
      input.utmMedium ||= g('utm_medium');
      input.utmCampaign ||= g('utm_campaign');
      input.utmTerm ||= g('utm_term');
      input.utmContent ||= g('utm_content');
      input.gclid ||= g('gclid');
      input.fbclid ||= g('fbclid');
    } catch {
      /* not a URL */
    }
  }

  // ---------------------------------------------------------------------------
  // Meta (Facebook / Instagram) Lead Ads
  // ---------------------------------------------------------------------------

  /** GET handshake: Meta calls with hub.mode=subscribe, hub.verify_token, hub.challenge. */
  async facebookVerify(apiKey: string, query: Record<string, any>) {
    const s = await this.byApiKey(apiKey, 'social');
    const mode = query['hub.mode'];
    const token = String(query['hub.verify_token'] ?? '');
    if (mode === 'subscribe' && s.facebookVerifyToken && safeEqual(token, s.facebookVerifyToken)) {
      return String(query['hub.challenge'] ?? '');
    }
    throw new ForbiddenException('Verification token mismatch');
  }

  async facebookWebhook(apiKey: string, body: any, rawBody: Buffer | undefined, signature?: string) {
    const s = await this.byApiKey(apiKey, 'social');
    if (s.facebookAppSecret) {
      if (!rawBody || !signature) throw new UnauthorizedException('Missing X-Hub-Signature-256');
      const expected = 'sha256=' + crypto.createHmac('sha256', s.facebookAppSecret).update(rawBody).digest('hex');
      if (!safeEqual(expected, signature)) throw new UnauthorizedException('Invalid signature');
    }
    const leadgenIds: { id: string; formId?: string; adId?: string }[] = [];
    for (const entry of body?.entry || []) {
      for (const change of entry?.changes || []) {
        if (change?.field === 'leadgen' && change?.value?.leadgen_id) {
          leadgenIds.push({ id: String(change.value.leadgen_id), formId: change.value.form_id, adId: change.value.ad_id });
        }
      }
    }
    if (!s.facebookPageAccessToken) {
      this.logger.warn(`Meta lead webhook for org ${s.organizationId} but no Page access token configured`);
      return { received: leadgenIds.length, processed: 0, error: 'Page access token not configured' };
    }
    let processed = 0;
    const errors: string[] = [];
    for (const l of leadgenIds) {
      try {
        const lead = await this.fbGet(s, `${l.id}`, { fields: FB_LEAD_FIELDS });
        await this.ingestFacebookLead(s, lead);
        processed++;
      } catch (e: any) {
        this.logger.error(`Meta lead ${l.id} failed: ${e?.message}`);
        errors.push(`${l.id}: ${e?.message}`);
      }
    }
    return { received: leadgenIds.length, processed, errors };
  }

  /** Pulls leads from configured lead forms since the last sync (Graph API). */
  async facebookSync(orgId: string) {
    const s = await this.getOrCreate(orgId);
    if (!s.facebookPageAccessToken) throw new BadRequestException('Facebook Page access token is not configured');
    if (!s.facebookFormIds?.length) throw new BadRequestException('Add at least one Lead Form ID to sync');
    const since = s.facebookLastSyncAt ? Math.floor(s.facebookLastSyncAt.getTime() / 1000) : null;
    const startedAt = new Date();
    const summary = { fetched: 0, created: 0, reentries: 0, duplicatesFlagged: 0, failed: 0, errors: [] as string[] };
    for (const formId of s.facebookFormIds) {
      try {
        const params: Record<string, string> = { fields: FB_LEAD_FIELDS, limit: '100' };
        if (since) params.filtering = JSON.stringify([{ field: 'time_created', operator: 'GREATER_THAN', value: since }]);
        let page: any = await this.fbGet(s, `${formId}/leads`, params);
        let guard = 0;
        while (page && guard++ < 50) {
          for (const lead of page.data || []) {
            summary.fetched++;
            try {
              const r = await this.ingestFacebookLead(s, lead);
              if (r.outcome === 'created') summary.created++;
              else if (r.outcome === 'reentry') summary.reentries++;
              else summary.duplicatesFlagged++;
            } catch (e: any) {
              summary.failed++;
              summary.errors.push(`${lead?.id}: ${e?.message}`);
            }
          }
          const next = page?.paging?.next;
          if (!next) break;
          const res = await fetch(next);
          page = await res.json();
          if (!res.ok) throw new Error(page?.error?.message || `Graph API ${res.status}`);
        }
      } catch (e: any) {
        summary.errors.push(`form ${formId}: ${e?.message}`);
      }
    }
    s.facebookLastSyncAt = startedAt;
    await this.settingsRepo.save(s);
    return summary;
  }

  private async fbGet(s: LeadCaptureSettings, path: string, params: Record<string, string>) {
    const url = new URL(`https://graph.facebook.com/${s.facebookGraphVersion || 'v19.0'}/${path}`);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    url.searchParams.set('access_token', s.facebookPageAccessToken || '');
    const res = await fetch(url.toString());
    const json: any = await res.json().catch(() => ({}));
    if (!res.ok || json?.error) throw new Error(json?.error?.message || `Graph API error ${res.status}`);
    return json;
  }

  private formNameCache = new Map<string, string>();

  private async ingestFacebookLead(s: LeadCaptureSettings, fb: any): Promise<IngestResult> {
    const pairs = (fb?.field_data || []).map((f: any) => ({ name: f.name, value: (f.values || []).join(', ') }));
    const input = mapPayload(pairsToPayload(pairs));
    this.requireContact(input);
    let formName: string | null = null;
    if (fb.form_id) {
      formName = this.formNameCache.get(fb.form_id) ?? null;
      if (!formName) {
        try {
          const f = await this.fbGet(s, fb.form_id, { fields: 'name' });
          formName = f?.name || null;
          if (formName) this.formNameCache.set(fb.form_id, formName);
        } catch {
          /* optional */
        }
      }
    }
    const platform = String(fb.platform || '').toLowerCase() === 'ig' ? 'Instagram' : 'Facebook';
    input.channelSource = 'Social';
    input.formName = formName || `${platform} Lead Form ${fb.form_id || ''}`.trim();
    input.sourceType ||= fb.is_organic ? 'Organic' : 'Paid Ads';
    input.subSource ||= platform;
    input.utmSource ||= platform.toLowerCase();
    input.utmMedium ||= fb.is_organic ? 'organic_social' : 'paid_social';
    if (fb.campaign_name) {
      input.utmCampaign ||= fb.campaign_name;
      input.campaignName ||= fb.campaign_name;
    }
    input.utmContent ||= fb.ad_name || null;
    input.rawPayload = { meta: fb };
    return this.pipeline.ingest(s.organizationId, input, {
      createdFrom: 'Social',
      channelSource: 'Social',
      note: `${platform} Lead Ads lead ${fb.id}`,
    });
  }

  // ---------------------------------------------------------------------------
  // LinkedIn Lead Gen Forms
  // ---------------------------------------------------------------------------

  /** LinkedIn webhook validation: GET ?challengeCode=… → HMAC-SHA256(challengeCode, clientSecret). */
  async linkedinChallenge(apiKey: string, challengeCode: string) {
    const s = await this.byApiKey(apiKey, 'social');
    if (!s.linkedinClientSecret) throw new BadRequestException('LinkedIn client secret not configured');
    if (!challengeCode) throw new BadRequestException('challengeCode missing');
    const challengeResponse = crypto.createHmac('sha256', s.linkedinClientSecret).update(challengeCode).digest('hex');
    return { challengeCode, challengeResponse };
  }

  async linkedinWebhook(apiKey: string, body: any, rawBody: Buffer | undefined, signature?: string) {
    const s = await this.byApiKey(apiKey, 'social');
    if (s.linkedinClientSecret) {
      if (!rawBody || !signature) throw new UnauthorizedException('Missing X-LI-Signature');
      const expected = crypto.createHmac('sha256', s.linkedinClientSecret).update(rawBody).digest('hex');
      const got = signature.replace(/^hmacsha256=/, '');
      if (!safeEqual(expected, got)) throw new UnauthorizedException('Invalid signature');
    }
    const events = Array.isArray(body) ? body : [body];
    if (!s.linkedinAccessToken) {
      this.logger.warn(`LinkedIn lead webhook for org ${s.organizationId} but no access token configured`);
      return { received: events.length, processed: 0, error: 'LinkedIn access token not configured' };
    }
    let processed = 0;
    const errors: string[] = [];
    for (const ev of events) {
      const urn: string | undefined = ev?.leadGenFormResponse || ev?.leadFormResponse;
      if (!urn || (ev?.leadAction && ev.leadAction !== 'CREATED')) continue;
      try {
        await this.ingestLinkedinResponse(s, urn);
        processed++;
      } catch (e: any) {
        this.logger.error(`LinkedIn lead ${urn} failed: ${e?.message}`);
        errors.push(`${urn}: ${e?.message}`);
      }
    }
    return { received: events.length, processed, errors };
  }

  private async liGet(s: LeadCaptureSettings, path: string) {
    const res = await fetch(`https://api.linkedin.com/rest/${path}`, {
      headers: {
        Authorization: `Bearer ${s.linkedinAccessToken}`,
        'LinkedIn-Version': s.linkedinApiVersion || '202405',
        'X-Restli-Protocol-Version': '2.0.0',
      },
    });
    const json: any = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.message || `LinkedIn API error ${res.status}`);
    return json;
  }

  private async ingestLinkedinResponse(s: LeadCaptureSettings, urn: string) {
    const id = urn.split(':').pop()!;
    const resp = await this.liGet(s, `leadFormResponses/${encodeURIComponent(id)}`);
    const formUrn: string | undefined = resp?.versionedLeadGenFormUrn || resp?.leadGenFormUrn;
    const questions = new Map<string, { name: string; predefined?: string }>();
    let formName: string | null = null;
    if (formUrn) {
      try {
        const formId = formUrn.split(':').pop()!.replace(/[()]/g, '').split(',')[0];
        const form = await this.liGet(s, `leadForms/${encodeURIComponent(formId)}`);
        formName = form?.name || null;
        for (const q of form?.content?.questions || []) {
          questions.set(String(q.questionId), { name: q.name || q.question?.localized?.en_US || '', predefined: q.predefinedField });
        }
      } catch (e: any) {
        this.logger.warn(`LinkedIn form lookup failed: ${e?.message}`);
      }
    }
    const PREDEF: Record<string, string> = {
      FIRST_NAME: 'first_name',
      LAST_NAME: 'last_name',
      EMAIL: 'email',
      WORK_EMAIL: 'email',
      PHONE_NUMBER: 'phone',
      CITY: 'city',
      STATE: 'state',
      COUNTRY: 'country',
      DEGREE: 'program',
      FIELD_OF_STUDY: 'program',
      GRADUATION_DATE: 'graduation_date',
    };
    const pairs: { name: string; value: any }[] = [];
    for (const a of resp?.formResponse?.answers || []) {
      const q = questions.get(String(a.questionId));
      const d = a.answerDetails || {};
      const value =
        d.textQuestionAnswer?.answer ??
        (d.multipleChoiceAnswer?.options || []).join(', ') ??
        null;
      const name = (q?.predefined && PREDEF[q.predefined]) || q?.name || `question_${a.questionId}`;
      pairs.push({ name, value });
    }
    const input = mapPayload(pairsToPayload(pairs));
    this.requireContact(input);
    input.channelSource = 'Social';
    input.formName = formName || 'LinkedIn Lead Gen Form';
    input.sourceType ||= resp?.leadType === 'ORGANIZATION_PRODUCT' ? 'Organic' : 'Paid Ads';
    input.subSource ||= 'LinkedIn';
    input.utmSource ||= 'linkedin';
    input.utmMedium ||= 'paid_social';
    input.rawPayload = { linkedin: resp };
    return this.pipeline.ingest(s.organizationId, input, {
      createdFrom: 'Social',
      channelSource: 'Social',
      note: `LinkedIn Lead Gen response ${id}`,
    });
  }

  // ---------------------------------------------------------------------------
  // Education portals (partner API + CSV upload)
  // ---------------------------------------------------------------------------

  async capturePortal(portalKey: string, body: any) {
    if (!portalKey || portalKey.length < 16) throw new UnauthorizedException('Invalid portal key');
    const s = await this.settingsRepo
      .createQueryBuilder('s')
      .where(`s.portals @> :needle::jsonb`, { needle: JSON.stringify([{ key: portalKey }]) })
      .getOne();
    const portal = s?.portals?.find((p) => p.key === portalKey);
    if (!s || !portal) throw new UnauthorizedException('Invalid portal key');
    if (!portal.isActive) throw new ForbiddenException('This portal integration is disabled');
    const enabled = { ...DEFAULT_ENABLED_CHANNELS, ...(s.enabledChannels || {}) };
    if (enabled.portal === false) throw new ForbiddenException('The portal capture channel is disabled');

    const items: any[] = Array.isArray(body?.leads) ? body.leads : Array.isArray(body) ? body : [body];
    if (items.length > 500) throw new BadRequestException('At most 500 leads per request');
    const results: any[] = [];
    for (const [i, item] of items.entries()) {
      try {
        const input = mapPayload(item || {});
        this.requireContact(input);
        input.channelSource = 'Portal';
        input.sourceType ||= 'Portal';
        input.subSource = portal.name;
        input.formName ||= `${portal.name} enquiry`;
        input.utmSource ||= normalizeKey(portal.name);
        const r = await this.pipeline.ingest(s.organizationId, input, {
          createdFrom: 'Portal',
          channelSource: 'Portal',
          fuzzy: true,
          note: `Partner portal ${portal.name}`,
        });
        results.push({ index: i, ...this.summarize(r) });
      } catch (e: any) {
        results.push({ index: i, error: e?.message || 'Failed' });
      }
    }
    // stats on the portal entry (re-read to avoid clobbering concurrent changes)
    const fresh = await this.settingsRepo.findOne({ where: { id: s.id } });
    if (fresh) {
      fresh.portals = (fresh.portals || []).map((p) =>
        p.id === portal.id
          ? {
              ...p,
              lastReceivedAt: new Date().toISOString(),
              leadsReceived: (p.leadsReceived || 0) + results.filter((r) => !r.error).length,
            }
          : p,
      );
      await this.settingsRepo.save(fresh);
    }
    return { received: items.length, results };
  }

  // ---------------------------------------------------------------------------
  // CSV import (portals, events, lists)
  // ---------------------------------------------------------------------------

  async importCsv(orgId: string, actorId: string, dto: ImportCsvDto) {
    const rows = parseCsv(dto.csv);
    if (!rows.length) throw new BadRequestException('The CSV has no data rows (a header row is required)');
    if (rows.length > MAX_IMPORT_ROWS) throw new BadRequestException(`At most ${MAX_IMPORT_ROWS} rows per upload`);

    let event: LeadCaptureEvent | null = null;
    if (dto.eventId) {
      event = await this.eventRepo.findOne({ where: { id: dto.eventId, organizationId: orgId } });
      if (!event) throw new NotFoundException('Event not found');
    }
    const channel = event ? 'Event' : dto.channel;
    const sourceName = dto.sourceName || event?.name || null;

    const batch = this.batchRepo.create({
      organizationId: orgId,
      channel,
      sourceName,
      eventId: event?.id ?? null,
      fileName: dto.fileName ?? null,
      totalRows: rows.length,
      createdBy: actorId,
      errors: [],
    });

    for (const [idx, raw] of rows.entries()) {
      const rowNo = idx + 2; // header is row 1
      try {
        let row: Record<string, any> = raw;
        if (dto.fieldMapping && Object.keys(dto.fieldMapping).length) {
          row = { ...raw };
          for (const [header, field] of Object.entries(dto.fieldMapping)) {
            if (field && raw[header] !== undefined) row[field] = raw[header];
          }
        }
        const input = mapPayload(row);
        this.requireContact(input);
        input.channelSource = channel;
        if (channel === 'Portal') {
          input.sourceType ||= 'Portal';
          input.subSource ||= sourceName;
        } else if (channel === 'Event') {
          input.sourceType ||= 'Event';
          input.subSource ||= event?.eventType || sourceName;
          input.courseId ||= event?.courseId ?? null;
          input.engagement = { ...(input.engagement || {}), eventAttended: 1 };
        }
        input.formName ||= sourceName ? `${sourceName} (import)` : 'CSV import';
        await this.attachCampaign(orgId, input, dto.campaignId || event?.campaignId);
        const r = await this.pipeline.ingest(orgId, input, {
          createdFrom: 'Import',
          channelSource: channel,
          fuzzy: true,
          actorId,
          note: `Imported from ${dto.fileName || 'CSV'}${sourceName ? ` (${sourceName})` : ''}`,
        });
        if (r.outcome === 'created') batch.created++;
        else if (r.outcome === 'reentry') batch.reentries++;
        else batch.duplicatesFlagged++;
      } catch (e: any) {
        batch.failed++;
        if (batch.errors.length < 200) batch.errors.push({ row: rowNo, message: e?.message || 'Failed' });
      }
    }
    const saved = await this.batchRepo.save(batch);
    if (event) {
      await this.eventRepo.increment({ id: event.id }, 'importedCount', saved.created + saved.duplicatesFlagged);
    }
    return saved;
  }

  listBatches(orgId: string) {
    return this.batchRepo.find({ where: { organizationId: orgId }, order: { createdAt: 'DESC' }, take: 100 });
  }

  // ---------------------------------------------------------------------------
  // Events (QR registration)
  // ---------------------------------------------------------------------------

  listEvents(orgId: string) {
    return this.eventRepo.find({ where: { organizationId: orgId }, order: { createdAt: 'DESC' } });
  }

  private slugify(name: string) {
    const base = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60);
    return `${base || 'event'}-${crypto.randomBytes(3).toString('hex')}`;
  }

  async createEvent(orgId: string, actorId: string, dto: CreateCaptureEventDto) {
    const ev = this.eventRepo.create({
      ...dto,
      organizationId: orgId,
      slug: this.slugify(dto.name),
      createdBy: actorId,
    } as Partial<LeadCaptureEvent>);
    return this.eventRepo.save(ev);
  }

  async updateEvent(orgId: string, id: string, dto: UpdateCaptureEventDto) {
    const ev = await this.eventRepo.findOne({ where: { id, organizationId: orgId } });
    if (!ev) throw new NotFoundException('Event not found');
    Object.assign(ev, dto);
    return this.eventRepo.save(ev);
  }

  async removeEvent(orgId: string, id: string) {
    const ev = await this.eventRepo.findOne({ where: { id, organizationId: orgId } });
    if (!ev) throw new NotFoundException('Event not found');
    await this.eventRepo.remove(ev);
    return { deleted: true };
  }

  async publicEvent(slug: string) {
    const ev = await this.eventRepo.findOne({ where: { slug } });
    if (!ev || !ev.isActive) throw new NotFoundException('Registration is closed or the event does not exist');
    return {
      name: ev.name,
      eventType: ev.eventType,
      eventDate: ev.eventDate,
      venue: ev.venue,
      description: ev.description,
      slug: ev.slug,
    };
  }

  async eventRegistrationHtml(slug: string): Promise<string> {
    const ev = await this.publicEvent(slug);
    const esc = (v: any) =>
      String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
    const meta = [ev.eventType, ev.eventDate, ev.venue].filter(Boolean).map(esc).join(' · ');
    const field = (name: string, label: string, type = 'text', required = false) =>
      `<label>${label}${required ? ' *' : ''}<input name="${name}" type="${type}" ${required ? 'required' : ''}></label>`;
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(ev.name)} — Registration</title>
<style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#f4f4f5;margin:0;padding:16px;color:#0f172a}
.card{max-width:460px;margin:24px auto;background:#fff;border:1px solid #e4e4e7;border-radius:12px;padding:24px}
h1{font-size:20px;margin:0 0 4px}p.m{color:#64748b;font-size:13px;margin:0 0 16px}label{display:block;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.4px;margin-bottom:12px}
input{display:block;width:100%;box-sizing:border-box;margin-top:6px;height:40px;border:1px solid #d4d4d8;border-radius:8px;padding:0 10px;font-size:14px}
button{width:100%;height:44px;border:0;border-radius:8px;background:#2563eb;color:#fff;font-size:15px;font-weight:600;cursor:pointer}
#msg{margin-top:12px;font-size:14px}</style></head><body><div class="card">
<h1>${esc(ev.name)}</h1><p class="m">${meta}</p>${ev.description ? `<p class="m">${esc(ev.description)}</p>` : ''}
<form id="f">${field('full_name', 'Full Name', 'text', true)}${field('email', 'Email', 'email')}${field('phone', 'Mobile', 'tel')}${field('city', 'City')}${field('program', 'Program / Course Interest')}${field('intake', 'Intake / Session')}${field('dob', 'Date of Birth', 'date')}
<button type="submit">Register</button><div id="msg"></div></form></div>
<script>document.getElementById('f').addEventListener('submit',async function(e){e.preventDefault();var m=document.getElementById('msg');var d={};new FormData(this).forEach(function(v,k){if(v)d[k]=v});
if(!d.email&&!d.phone){m.style.color='#b91c1c';m.textContent='Please enter an email or a mobile number.';return}
try{var r=await fetch('register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)});var j=await r.json();
if(r.ok){this.innerHTML='<p style="font-size:15px">Thank you! Your registration has been received.</p>'}else{m.style.color='#b91c1c';m.textContent=(j&&j.message)||'Registration failed'}}catch(err){m.style.color='#b91c1c';m.textContent='Network error, please try again.'}});</script>
</body></html>`;
  }

  async registerForEvent(slug: string, body: Record<string, any>) {
    const ev = await this.eventRepo.findOne({ where: { slug } });
    if (!ev || !ev.isActive) throw new NotFoundException('Registration is closed or the event does not exist');
    const s = await this.getOrCreate(ev.organizationId);
    const enabled = { ...DEFAULT_ENABLED_CHANNELS, ...(s.enabledChannels || {}) };
    if (enabled.event === false) throw new ForbiddenException('Event registration is disabled');
    const input = mapPayload(body || {});
    if (!input.firstName && !input.fullName) throw new BadRequestException('Name is required');
    this.requireContact(input);
    input.channelSource = 'Event';
    input.sourceType ||= 'Event';
    input.subSource ||= ev.eventType;
    input.formName = `${ev.name} — QR registration`;
    input.courseId ||= ev.courseId;
    input.engagement = { eventAttended: 1 };
    await this.attachCampaign(ev.organizationId, input, ev.campaignId);
    const r = await this.pipeline.ingest(ev.organizationId, input, {
      createdFrom: 'Event',
      channelSource: 'Event',
      note: `QR registration at ${ev.name}`,
    });
    await this.eventRepo.increment({ id: ev.id }, 'registrationCount', 1);
    return { registered: true, outcome: r.outcome };
  }

  // ---------------------------------------------------------------------------
  // Chatbot
  // ---------------------------------------------------------------------------

  /**
   * Chatbot webhook. Body: { conversationId, botName?, visitor: { name, email, phone, city, country },
   * intent?, program?, messages: [{ from: 'visitor'|'bot', text, at }], qualified?: boolean }
   */
  async captureChatbot(apiKey: string, body: any) {
    const s = await this.byApiKey(apiKey, 'chatbot');
    const externalId = String(body?.conversationId || body?.conversation_id || body?.sessionId || '').slice(0, 150);
    if (!externalId) throw new BadRequestException('conversationId is required');
    const visitor = { ...(body?.visitor || body?.user || {}) };
    const messages: { from: string; text: string; at?: string }[] = (Array.isArray(body?.messages) ? body.messages : [])
      .slice(0, 500)
      .map((m: any) => ({ from: String(m?.from || m?.role || 'visitor'), text: String(m?.text || m?.message || ''), at: m?.at }));

    let conv = await this.chatRepo.findOne({ where: { organizationId: s.organizationId, externalId } });
    if (!conv) conv = this.chatRepo.create({ organizationId: s.organizationId, externalId, messages: [] });
    conv.botName = body?.botName || conv.botName || null;
    conv.visitorName = visitor.name || visitor.full_name || conv.visitorName || null;
    conv.email = visitor.email || conv.email || null;
    conv.phone = visitor.phone || visitor.mobile || conv.phone || null;
    conv.intent = body?.intent || conv.intent || null;
    if (messages.length) conv.messages = messages;
    conv.visitorMessageCount = (conv.messages || []).filter((m) => ['visitor', 'user', 'customer'].includes(m.from)).length;

    const hasContact = !!(conv.email || conv.phone);
    let qualified = false;
    let reason = '';
    if (body?.qualified === true) {
      qualified = hasContact;
      reason = hasContact ? 'Marked qualified by the chatbot' : 'Marked qualified but no contact details';
    } else if (body?.qualified === false) {
      reason = 'Marked not qualified by the chatbot';
    } else if (conv.visitorMessageCount < (s.chatbotMinMessages || 1)) {
      reason = `Fewer than ${s.chatbotMinMessages} visitor messages`;
    } else if (s.chatbotRequireContact && !hasContact) {
      reason = 'No email or phone shared yet';
    } else if (!hasContact) {
      reason = 'No contact details';
    } else {
      qualified = true;
      reason = `${conv.visitorMessageCount} visitor messages with contact details`;
    }
    conv.qualificationReason = reason;

    let result: any = null;
    if (qualified && !conv.leadId) {
      const input = mapPayload({ ...visitor, program: body?.program ?? visitor.program, intake: body?.intake ?? visitor.intake });
      input.channelSource = 'Chatbot';
      input.formName = conv.botName ? `${conv.botName} chat` : 'Chatbot conversation';
      input.sourceType ||= 'Organic';
      input.subSource ||= conv.botName || 'Chatbot';
      input.submissionUrl ||= body?.pageUrl || body?.page_url || null;
      this.utmFromUrl(input);
      input.engagement = { chatMessages: conv.visitorMessageCount };
      input.rawPayload = { chatbot: { conversationId: externalId, intent: conv.intent } };
      const r = await this.pipeline.ingest(s.organizationId, input, {
        createdFrom: 'Chatbot',
        channelSource: 'Chatbot',
        note: `Qualified chatbot conversation ${externalId}${conv.intent ? ` (${conv.intent})` : ''}`,
      });
      conv.leadId = r.lead.id;
      result = this.summarize(r);
    }
    conv.status = conv.leadId ? 'qualified' : qualified ? 'qualified' : 'not_qualified';
    await this.chatRepo.save(conv);
    return { conversationId: externalId, qualified: conv.status === 'qualified', reason, leadId: conv.leadId, lead: result };
  }

  listConversations(orgId: string) {
    return this.chatRepo.find({
      where: { organizationId: orgId },
      order: { updatedAt: 'DESC' },
      take: 100,
      select: ['id', 'externalId', 'botName', 'visitorName', 'email', 'phone', 'intent', 'visitorMessageCount', 'status', 'qualificationReason', 'leadId', 'createdAt', 'updatedAt'],
    });
  }
}
