import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Brackets } from 'typeorm';
import { randomBytes } from 'crypto';
import { CallLog } from './entities/call-log.entity.js';
import { TelephonySettings } from './entities/telephony-settings.entity.js';
import { CommunicationLog } from '../communications/entities/communication-log.entity.js';
import { LeadActivity } from '../leads/entities/lead-activity.entity.js';
import { User } from '../users/entities/user.entity.js';
import { MessagingService } from '../messaging/messaging.service.js';
import { RecipientResolverService, normalizePhone, ResolvedRecipient } from '../messaging/recipient-resolver.service.js';
import { renderMergeFields } from '../messaging/merge-fields.js';
import { toUtcDate } from '../messaging/time-zone.util.js';
import { publicApiBase, validateTwilioSignature } from '../messaging/messaging.providers.js';
import { InAppNotificationsService } from '../in-app-notifications/in-app-notifications.service.js';
import {
  exotelClickToCall,
  twilioClickToCall,
  testTelephonyCredentials,
  mapProviderStatus,
  isTerminalStatus,
} from './telephony.providers.js';

export interface CallActor {
  id: string | null;
  name: string | null;
  role: string | null;
  phone: string | null;
}

const SECRET_FIELDS = ['exotelApiToken', 'twilioAuthToken'] as const;
const DEFAULT_MISSED_SMS =
  'Hi {{First_Name}}, we tried to reach you regarding your admission enquiry for {{Program}}. We will call you again shortly, or you can call us back at your convenience.';

const fmtDuration = (s: number) => {
  const m = Math.floor((s || 0) / 60);
  const r = (s || 0) % 60;
  return m ? `${m}m ${r}s` : `${r}s`;
};

@Injectable()
export class CallsService {
  private readonly logger = new Logger(CallsService.name);

  constructor(
    @InjectRepository(CallLog) private readonly repo: Repository<CallLog>,
    @InjectRepository(TelephonySettings) private readonly settingsRepo: Repository<TelephonySettings>,
    @InjectRepository(CommunicationLog) private readonly commRepo: Repository<CommunicationLog>,
    private readonly messaging: MessagingService,
    private readonly resolver: RecipientResolverService,
    private readonly notifications: InAppNotificationsService,
    private readonly dataSource: DataSource,
  ) {}

  callCode(c: Pick<CallLog, 'callNo'>) {
    return `CALL-${String(c.callNo || 0).padStart(6, '0')}`;
  }

  view(c: CallLog) {
    return { ...c, callCode: this.callCode(c), durationLabel: fmtDuration(c.durationSeconds) };
  }

  // ─────────────────────────────────────────────────────────── settings ──

  async getSettings(orgId: string): Promise<TelephonySettings> {
    let s = await this.settingsRepo.findOne({ where: { organizationId: orgId } });
    if (!s) {
      s = this.settingsRepo.create({
        organizationId: orgId,
        webhookToken: randomBytes(16).toString('hex'),
        tagRules: [],
        agentLines: [],
      });
      s = await this.settingsRepo.save(s);
    }
    if (!s.webhookToken) {
      s.webhookToken = randomBytes(16).toString('hex');
      s = await this.settingsRepo.save(s);
    }
    return s;
  }

  webhookUrls(s: TelephonySettings) {
    const base = `${publicApiBase()}/calls/webhooks`;
    const q = `?token=${s.webhookToken}`;
    return {
      exotelStatus: `${base}/exotel/${s.organizationId}${q}`,
      exotelInbound: `${base}/exotel/${s.organizationId}/inbound${q}`,
      twilioStatus: `${base}/twilio/${s.organizationId}${q}`,
      twilioRecording: `${base}/twilio/${s.organizationId}/recording${q}`,
      twilioInbound: `${base}/twilio/${s.organizationId}/inbound${q}`,
    };
  }

  private isReady(s: TelephonySettings) {
    if (s.provider === 'exotel') return !!(s.exotelAccountSid && s.exotelApiKey && s.exotelApiToken && s.exotelCallerId);
    if (s.provider === 'twilio') return !!(s.twilioAccountSid && s.twilioAuthToken && s.twilioCallerId);
    return false;
  }

  async getSettingsView(orgId: string) {
    const s = await this.getSettings(orgId);
    const view: Record<string, any> = { ...s };
    for (const f of SECRET_FIELDS) {
      const val = (s as any)[f] as string | null;
      view[f] = '';
      view[`${f}Set`] = !!val;
      view[`${f}Hint`] = val ? `••••${val.slice(-4)}` : null;
    }
    delete view.webhookToken;
    view.webhookUrls = this.webhookUrls(s);
    view.ready = this.isReady(s);
    view.defaultMissedCallSmsText = DEFAULT_MISSED_SMS;
    return view;
  }

  async updateSettings(orgId: string, dto: Record<string, any>) {
    const s = await this.getSettings(orgId);
    const { regenerateWebhookToken, ...rest } = dto;
    for (const [k, v] of Object.entries(rest)) {
      if (v === undefined) continue;
      if ((SECRET_FIELDS as readonly string[]).includes(k) && v === '') continue;
      if (k === 'provider') {
        s.provider = v === 'none' || v === '' ? null : (v as string);
        continue;
      }
      (s as any)[k] = typeof v === 'string' ? v.trim() || null : v;
    }
    if (!s.defaultCountryCode) s.defaultCountryCode = '91';
    if (!s.exotelSubdomain) s.exotelSubdomain = 'api.exotel.com';
    if (regenerateWebhookToken) s.webhookToken = randomBytes(16).toString('hex');
    await this.settingsRepo.save(s);
    return this.getSettingsView(orgId);
  }

  async testSettings(orgId: string) {
    return testTelephonyCredentials(await this.getSettings(orgId));
  }

  // ────────────────────────────────────────────────────────────── list ──

  async list(orgId: string, q: Record<string, any>, actor?: CallActor) {
    const page = Math.max(1, Number(q.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(q.limit) || 20));
    const qb = this.repo.createQueryBuilder('c').where('c.organization_id = :orgId', { orgId });
    if (q.callType && q.callType !== 'all') qb.andWhere('c.call_type = :t', { t: q.callType });
    if (q.callStatus && q.callStatus !== 'all') qb.andWhere('c.call_status = :s', { s: q.callStatus });
    if (q.callOutcome && q.callOutcome !== 'all') qb.andWhere('c.call_outcome = :o', { o: q.callOutcome });
    if (q.agentUserId && q.agentUserId !== 'all') {
      const agent = q.agentUserId === 'me' ? actor?.id : q.agentUserId;
      if (agent) qb.andWhere('c.agent_user_id = :a', { a: agent });
    }
    if (q.applicationId) qb.andWhere('c.application_id = :aid', { aid: q.applicationId });
    if (q.leadId) qb.andWhere('c.lead_id = :lid', { lid: q.leadId });
    if (q.dateFrom) qb.andWhere('COALESCE(c.call_start_time, c.created_at) >= :df', { df: new Date(q.dateFrom) });
    if (q.dateTo) qb.andWhere('COALESCE(c.call_start_time, c.created_at) < :dt', { dt: new Date(new Date(q.dateTo).getTime() + 86_400_000) });
    if (q.followUpDue === 'true') qb.andWhere('c.follow_up_date IS NOT NULL AND c.follow_up_date <= :now', { now: new Date() });
    if (q.search) {
      const s = `%${String(q.search).toLowerCase()}%`;
      qb.andWhere(
        new Brackets((b) => {
          b.where('LOWER(c.applicant_name) LIKE :s', { s })
            .orWhere('c.contact_number LIKE :s', { s })
            .orWhere('LOWER(c.application_no) LIKE :s', { s })
            .orWhere('LOWER(c.agent_name) LIKE :s', { s })
            .orWhere('LOWER(c.agent_notes) LIKE :s', { s });
        }),
      );
    }
    qb.orderBy('COALESCE(c.call_start_time, c.created_at)', 'DESC').skip((page - 1) * limit).take(limit);
    const [rows, total] = await qb.getManyAndCount();
    return { data: rows.map((r) => this.view(r)), total, page, limit };
  }

  async stats(orgId: string) {
    const rows = await this.repo
      .createQueryBuilder('c')
      .select('c.call_type', 'type')
      .addSelect('c.call_status', 'status')
      .addSelect('COUNT(*)::int', 'count')
      .addSelect('COALESCE(SUM(c.duration_seconds), 0)::int', 'duration')
      .where('c.organization_id = :orgId', { orgId })
      .groupBy('c.call_type')
      .addGroupBy('c.call_status')
      .getRawMany();
    const out = {
      total: 0,
      inbound: 0,
      outbound: 0,
      missed: 0,
      answered: 0,
      notAnswered: 0,
      totalDurationSeconds: 0,
      avgDurationSeconds: 0,
      followUpsDue: 0,
      interested: 0,
    };
    for (const r of rows) {
      const n = Number(r.count) || 0;
      out.total += n;
      out.totalDurationSeconds += Number(r.duration) || 0;
      if (r.type === 'Inbound') out.inbound += n;
      if (r.type === 'Outbound') out.outbound += n;
      if (r.type === 'Missed') out.missed += n;
      if (r.status === 'Answered') out.answered += n;
      if (r.status === 'Not Answered') out.notAnswered += n;
    }
    out.avgDurationSeconds = out.answered ? Math.round(out.totalDurationSeconds / out.answered) : 0;
    out.followUpsDue = await this.repo
      .createQueryBuilder('c')
      .where('c.organization_id = :orgId AND c.follow_up_date IS NOT NULL AND c.follow_up_date <= :now', { orgId, now: new Date() })
      .getCount();
    out.interested = await this.repo.count({ where: { organizationId: orgId, callOutcome: 'Interested' } });
    return out;
  }

  async findOne(orgId: string, id: string) {
    const c = await this.repo.findOne({ where: { id, organizationId: orgId } });
    if (!c) throw new NotFoundException('Call not found');
    return c;
  }

  async get(orgId: string, id: string) {
    return this.view(await this.findOne(orgId, id));
  }

  // ─────────────────────────────────────────────────────── create / edit ──

  private async agentInfo(orgId: string, userId: string | null | undefined, s?: TelephonySettings) {
    if (!userId) return { name: null as string | null, phone: null as string | null, department: null as string | null, extension: null as string | null };
    const settings = s || (await this.getSettings(orgId));
    const line = (settings.agentLines || []).find((l) => l.userId === userId);
    const u = await this.dataSource.getRepository(User).findOne({ where: { id: userId } });
    if (u?.organizationId && u.organizationId !== orgId) throw new BadRequestException('Agent belongs to another organization');
    return {
      name: u?.name || null,
      phone: line?.phone || u?.phone || null,
      department: line?.department || settings.defaultDepartment || null,
      extension: line?.extension || line?.phone || null,
    };
  }

  private async recipient(orgId: string, applicationId?: string | null, leadId?: string | null): Promise<ResolvedRecipient | null> {
    if (!applicationId && !leadId) return null;
    const r = await this.resolver.resolve({ applicationId, leadId, orgId });
    if (!r) throw new BadRequestException(applicationId ? 'Application not found' : 'Lead not found');
    return r;
  }

  async create(orgId: string, dto: Record<string, any>, actor: CallActor) {
    const s = await this.getSettings(orgId);
    const r = await this.recipient(orgId, dto.applicationId, dto.leadId);
    const phone = normalizePhone(dto.contactNumber || r?.phone, dto.countryCode, s.defaultCountryCode);
    if (!phone) throw new BadRequestException('A valid contact number is required');
    const agentId = dto.agentUserId || actor.id;
    const agent = await this.agentInfo(orgId, agentId, s);
    const tz = dto.timeZone;
    const start = toUtcDate(dto.callStartTime, tz) || new Date();
    let end = toUtcDate(dto.callEndTime, tz);
    let duration = dto.durationSeconds !== undefined ? Number(dto.durationSeconds) : 0;
    if (end && !dto.durationSeconds) duration = Math.max(0, Math.round((end.getTime() - start.getTime()) / 1000));
    if (!end && duration) end = new Date(start.getTime() + duration * 1000);
    const callType = dto.callType || 'Outbound';
    const callStatus = dto.callStatus || (callType === 'Missed' ? 'Not Answered' : 'Answered');

    const c = this.repo.create({
      organizationId: orgId,
      applicationId: r?.applicationId || dto.applicationId || null,
      leadId: r?.leadId || dto.leadId || null,
      applicationNo: r?.applicationNo || null,
      applicantName: dto.applicantName || r?.name || null,
      contactNumber: phone.national,
      countryCode: phone.countryCode,
      programInterested: dto.programInterested || r?.program || null,
      callType,
      callStartTime: start,
      callEndTime: end,
      durationSeconds: duration,
      callStatus,
      agentUserId: agentId || null,
      agentName: dto.agentName || agent.name || actor.name,
      department: dto.department || agent.department,
      extensionDeviceId: dto.extensionDeviceId || agent.extension,
      recordingUrl: dto.recordingUrl || null,
      transcription: dto.transcription || null,
      agentNotes: dto.agentNotes || null,
      callOutcome: dto.callOutcome || null,
      followUpDate: toUtcDate(dto.followUpDate, tz),
      autoSmsAfterMissedCall: dto.autoSmsAfterMissedCall ?? s.autoSmsAfterMissedCall,
      autoCreateFollowUpTask: dto.autoCreateFollowUpTask ?? s.autoCreateFollowUpTask,
      autoTagApplicant: dto.autoTagApplicant ?? s.autoTagApplicant,
      tags: Array.isArray(dto.tags) ? dto.tags : [],
      provider: 'manual',
      createdBy: actor.id,
    });
    const saved = await this.repo.save(c);
    return this.view(await this.afterChange(saved, s));
  }

  async update(orgId: string, id: string, dto: Record<string, any>, actor: CallActor) {
    const c = await this.findOne(orgId, id);
    const isAdmin = ['org_admin', 'superadmin'].includes(actor.role || '');
    if (!isAdmin && c.agentUserId && actor.id && c.agentUserId !== actor.id && !['lead_manager', 'application_manager'].includes(actor.role || '')) {
      throw new ForbiddenException('Only the agent who handled the call or a manager can edit it');
    }
    const tz = dto.timeZone;
    if (dto.applicationId !== undefined || dto.leadId !== undefined) {
      const r = await this.recipient(orgId, dto.applicationId ?? c.applicationId, dto.leadId ?? c.leadId);
      c.applicationId = r?.applicationId || dto.applicationId || null;
      c.leadId = r?.leadId || dto.leadId || null;
      c.applicationNo = r?.applicationNo || null;
      c.applicantName = dto.applicantName || r?.name || c.applicantName;
      c.programInterested = dto.programInterested || r?.program || c.programInterested;
    }
    const plain = [
      'applicantName',
      'programInterested',
      'callType',
      'callStatus',
      'agentName',
      'department',
      'extensionDeviceId',
      'recordingUrl',
      'transcription',
      'agentNotes',
      'callOutcome',
      'autoSmsAfterMissedCall',
      'autoCreateFollowUpTask',
      'autoTagApplicant',
      'tags',
    ];
    for (const k of plain) if (dto[k] !== undefined) (c as any)[k] = dto[k];
    if (dto.contactNumber) {
      const s = await this.getSettings(orgId);
      const p = normalizePhone(dto.contactNumber, dto.countryCode || c.countryCode, s.defaultCountryCode);
      if (!p) throw new BadRequestException('Invalid contact number');
      c.contactNumber = p.national;
      c.countryCode = p.countryCode;
    }
    if (dto.agentUserId !== undefined) {
      c.agentUserId = dto.agentUserId || null;
      const a = await this.agentInfo(orgId, c.agentUserId);
      c.agentName = dto.agentName || a.name;
      c.department = dto.department || a.department || c.department;
    }
    if (dto.callStartTime !== undefined) c.callStartTime = toUtcDate(dto.callStartTime, tz);
    if (dto.callEndTime !== undefined) c.callEndTime = toUtcDate(dto.callEndTime, tz);
    if (dto.durationSeconds !== undefined) c.durationSeconds = Number(dto.durationSeconds) || 0;
    else if (dto.callEndTime !== undefined && c.callStartTime && c.callEndTime) {
      c.durationSeconds = Math.max(0, Math.round((c.callEndTime.getTime() - c.callStartTime.getTime()) / 1000));
    }
    if (dto.followUpDate !== undefined) {
      c.followUpDate = toUtcDate(dto.followUpDate, tz);
      c.followUpTaskCreatedAt = null; // a new date creates a new follow-up task
    }
    const saved = await this.repo.save(c);
    return this.view(await this.afterChange(saved));
  }

  async remove(orgId: string, id: string) {
    const c = await this.findOne(orgId, id);
    if (c.communicationLogId) await this.commRepo.delete({ id: c.communicationLogId });
    await this.repo.remove(c);
    return { deleted: true };
  }

  // ────────────────────────────────────────────────────── click-to-call ──

  async clickToCall(orgId: string, dto: Record<string, any>, actor: CallActor) {
    const s = await this.getSettings(orgId);
    if (!s.provider) throw new BadRequestException('Telephony is not configured. Set up Exotel or Twilio Voice in Settings → Telephony.');
    if (!this.isReady(s)) throw new BadRequestException(`${s.provider === 'exotel' ? 'Exotel' : 'Twilio'} credentials are incomplete. Complete them in Settings → Telephony.`);
    const r = await this.recipient(orgId, dto.applicationId, dto.leadId);
    const customer = normalizePhone(dto.to || r?.phone, dto.countryCode, s.defaultCountryCode);
    if (!customer) throw new BadRequestException('The applicant has no valid phone number');
    const agent = await this.agentInfo(orgId, actor.id, s);
    const agentPhone = normalizePhone(dto.agentNumber || agent.phone || actor.phone, null, s.defaultCountryCode);
    if (!agentPhone) {
      throw new BadRequestException('Your phone number is not set. Add it to your profile or to the agent lines in Settings → Telephony.');
    }

    const c = await this.repo.save(
      this.repo.create({
        organizationId: orgId,
        applicationId: r?.applicationId || null,
        leadId: r?.leadId || null,
        applicationNo: r?.applicationNo || null,
        applicantName: r?.name || null,
        contactNumber: customer.national,
        countryCode: customer.countryCode,
        programInterested: r?.program || null,
        callType: 'Outbound',
        callStatus: 'In Progress',
        callStartTime: new Date(),
        agentUserId: actor.id,
        agentName: agent.name || actor.name,
        department: agent.department,
        extensionDeviceId: agent.extension || agentPhone.e164,
        autoSmsAfterMissedCall: dto.autoSmsAfterMissedCall ?? s.autoSmsAfterMissedCall,
        autoCreateFollowUpTask: dto.autoCreateFollowUpTask ?? s.autoCreateFollowUpTask,
        autoTagApplicant: dto.autoTagApplicant ?? s.autoTagApplicant,
        tags: [],
        provider: s.provider,
        createdBy: actor.id,
      }),
    );

    const urls = this.webhookUrls(s);
    const input = {
      agentE164: agentPhone.e164,
      customerE164: customer.e164,
      record: s.recordCalls,
      statusCallbackUrl: s.provider === 'exotel' ? `${urls.exotelStatus}&call=${c.id}` : `${urls.twilioStatus}&call=${c.id}`,
      recordingCallbackUrl: `${urls.twilioRecording}&call=${c.id}`,
    };
    const res = s.provider === 'exotel' ? await exotelClickToCall(s, input) : await twilioClickToCall(s, input);
    if (!res.ok) {
      c.callStatus = 'Dropped';
      c.failureReason = res.error || 'Call could not be placed';
      c.callEndTime = new Date();
      await this.repo.save(c);
      await this.syncTimeline(c);
      throw new BadRequestException(c.failureReason);
    }
    c.providerCallId = res.providerCallId || null;
    c.providerStatus = res.providerStatus || null;
    await this.repo.save(c);
    await this.syncTimeline(c);
    return { ...this.view(c), message: `Calling your phone (${agentPhone.e164}) — answer it to be connected to ${customer.e164}.` };
  }

  // ──────────────────────────────────────────────────────────── webhooks ──

  private async assertWebhook(orgId: string, token?: string) {
    const s = await this.settingsRepo.findOne({ where: { organizationId: orgId } });
    if (!s || !s.webhookToken || s.webhookToken !== token) throw new ForbiddenException('Invalid webhook token');
    return s;
  }

  private async findByProviderOrId(orgId: string, callId?: string | null, providerCallId?: string | null) {
    if (callId && /^[0-9a-f-]{36}$/i.test(callId)) {
      const c = await this.repo.findOne({ where: { id: callId, organizationId: orgId } });
      if (c) return c;
    }
    if (providerCallId) return this.repo.findOne({ where: { providerCallId, organizationId: orgId } });
    return null;
  }

  /** Exotel StatusCallback (connect API) — JSON or form body. */
  async handleExotelStatus(orgId: string, token: string | undefined, callId: string | undefined, body: Record<string, any>) {
    const s = await this.assertWebhook(orgId, token);
    const sid = body.CallSid || body.Sid;
    const c = await this.findByProviderOrId(orgId, callId, sid);
    if (!c) return { ok: true, ignored: true };
    const legs: any[] = Array.isArray(body.Legs) ? body.Legs : [];
    const duration = Number(body.ConversationDuration ?? body.DialCallDuration ?? legs[1]?.OnCallDuration ?? 0) || 0;
    c.providerCallId = c.providerCallId || sid || null;
    c.providerStatus = body.Status || body.CallStatus || c.providerStatus;
    c.callStatus = mapProviderStatus(c.providerStatus, duration);
    c.durationSeconds = duration;
    if (body.StartTime) c.callStartTime = new Date(body.StartTime);
    if (body.EndTime) c.callEndTime = new Date(body.EndTime);
    else if (isTerminalStatus(c.callStatus)) c.callEndTime = c.callEndTime || new Date();
    if (body.RecordingUrl) c.recordingUrl = body.RecordingUrl;
    const saved = await this.repo.save(c);
    await this.afterChange(saved, s);
    return { ok: true };
  }

  /**
   * Exotel inbound (Passthru applet, GET query or POST). Creates the call log
   * for incoming calls; DialCallStatus decides Inbound vs Missed.
   */
  async handleExotelInbound(orgId: string, token: string | undefined, p: Record<string, any>) {
    const s = await this.assertWebhook(orgId, token);
    const sid = p.CallSid;
    const from = p.CallFrom || p.From;
    if (!from) return { ok: true, ignored: true };
    let c = sid ? await this.repo.findOne({ where: { providerCallId: sid, organizationId: orgId } }) : null;
    const dial = String(p.DialCallStatus || p.Status || p.CallStatus || '').toLowerCase();
    const duration = Number(p.DialCallDuration || p.ConversationDuration || 0) || 0;
    const answered = dial === 'completed' || dial === 'answered' || duration > 0;
    if (!c) c = await this.newInbound(orgId, s, String(from), 'exotel', sid || null);
    c.callType = answered ? 'Inbound' : dial ? 'Missed' : c.callType;
    c.callStatus = dial ? (answered ? 'Answered' : mapProviderStatus(dial === 'completed' ? 'no-answer' : dial, duration)) : 'In Progress';
    if (c.callStatus === 'In Progress' && dial) c.callStatus = 'Not Answered';
    c.durationSeconds = duration;
    c.providerStatus = dial || c.providerStatus;
    if (p.RecordingUrl) c.recordingUrl = p.RecordingUrl;
    if (p.EndTime) c.callEndTime = new Date(p.EndTime);
    else if (dial) c.callEndTime = new Date();
    const agentPhone = p.DialWhomNumber || p.AgentNumber;
    if (agentPhone) await this.matchAgent(orgId, s, c, String(agentPhone));
    const saved = await this.repo.save(c);
    await this.afterChange(saved, s);
    return { ok: true };
  }

  /** Twilio StatusCallback for click-to-call (parent call = agent leg). */
  async handleTwilioStatus(orgId: string, token: string | undefined, callId: string | undefined, body: Record<string, any>, signature?: string, url?: string) {
    const s = await this.assertWebhook(orgId, token);
    this.checkTwilioSignature(s, signature, url, body);
    const c = await this.findByProviderOrId(orgId, callId, body.CallSid);
    if (!c) return { ok: true, ignored: true };
    const status = String(body.CallStatus || '').toLowerCase();
    const duration = Number(body.CallDuration || 0) || 0;
    c.providerStatus = status || c.providerStatus;
    if (status === 'in-progress') {
      c.callStatus = 'In Progress';
    } else {
      c.callStatus = mapProviderStatus(status, duration);
      if (isTerminalStatus(c.callStatus)) {
        c.durationSeconds = duration;
        c.callEndTime = new Date();
        if (c.callStartTime && duration) c.callStartTime = new Date(c.callEndTime.getTime() - duration * 1000);
      }
    }
    const saved = await this.repo.save(c);
    await this.afterChange(saved, s);
    return { ok: true };
  }

  async handleTwilioRecording(orgId: string, token: string | undefined, callId: string | undefined, body: Record<string, any>, signature?: string, url?: string) {
    const s = await this.assertWebhook(orgId, token);
    this.checkTwilioSignature(s, signature, url, body);
    const c = await this.findByProviderOrId(orgId, callId, body.CallSid);
    if (!c || !body.RecordingUrl) return { ok: true, ignored: true };
    c.recordingUrl = String(body.RecordingUrl).endsWith('.mp3') ? body.RecordingUrl : `${body.RecordingUrl}.mp3`;
    const saved = await this.repo.save(c);
    await this.syncTimeline(saved);
    return { ok: true };
  }

  /**
   * Twilio inbound voice webhook. Returns TwiML that forwards the caller to
   * the configured number; the <Dial action> callback finalises the log.
   */
  async handleTwilioInbound(orgId: string, token: string | undefined, body: Record<string, any>, signature?: string, url?: string): Promise<string> {
    const s = await this.assertWebhook(orgId, token);
    this.checkTwilioSignature(s, signature, url, body);
    const xml = (x: string) => x.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const sid = body.CallSid;
    let c = sid ? await this.repo.findOne({ where: { providerCallId: sid, organizationId: orgId } }) : null;

    // Dial action callback → final status
    if (body.DialCallStatus) {
      if (!c && body.From) c = await this.newInbound(orgId, s, String(body.From), 'twilio', sid || null);
      if (c) {
        const dial = String(body.DialCallStatus).toLowerCase();
        const duration = Number(body.DialCallDuration || 0) || 0;
        const answered = dial === 'completed' && duration > 0;
        c.callType = answered ? 'Inbound' : 'Missed';
        c.callStatus = answered ? 'Answered' : mapProviderStatus(dial === 'completed' ? 'no-answer' : dial, duration);
        if (c.callStatus === 'In Progress') c.callStatus = 'Not Answered';
        c.durationSeconds = duration;
        c.providerStatus = dial;
        c.callEndTime = new Date();
        if (body.RecordingUrl) c.recordingUrl = `${body.RecordingUrl}.mp3`;
        const saved = await this.repo.save(c);
        await this.afterChange(saved, s);
      }
      return '<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>';
    }

    if (body.From && !c) c = await this.newInbound(orgId, s, String(body.From), 'twilio', sid || null);
    const forward = s.inboundForwardNumber ? normalizePhone(s.inboundForwardNumber, null, s.defaultCountryCode) : null;
    if (!forward) {
      if (c) {
        c.callType = 'Missed';
        c.callStatus = 'Not Answered';
        c.callEndTime = new Date();
        const saved = await this.repo.save(c);
        await this.afterChange(saved, s);
      }
      return '<?xml version="1.0" encoding="UTF-8"?><Response><Say>Thank you for calling the admissions office. All our counsellors are busy. We will call you back shortly.</Say><Hangup/></Response>';
    }
    const action = `${this.webhookUrls(s).twilioInbound}`;
    const record = s.recordCalls ? ' record="record-from-answer-dual"' : '';
    return `<?xml version="1.0" encoding="UTF-8"?><Response><Dial action="${xml(action)}" method="POST" timeout="25"${record}><Number>${xml(forward.e164)}</Number></Dial></Response>`;
  }

  private checkTwilioSignature(s: TelephonySettings, signature?: string, url?: string, body?: Record<string, any>) {
    if (signature && s.twilioAuthToken && url) {
      if (!validateTwilioSignature(s.twilioAuthToken, signature, url, body || {})) {
        this.logger.warn('Twilio voice webhook signature mismatch (URL may differ behind a proxy); accepted by token');
      }
    }
  }

  private async newInbound(orgId: string, s: TelephonySettings, from: string, provider: string, sid: string | null) {
    const phone = normalizePhone(from, null, s.defaultCountryCode);
    const r = phone ? await this.resolver.findByPhone(orgId, phone.national) : null;
    return this.repo.save(
      this.repo.create({
        organizationId: orgId,
        applicationId: r?.applicationId || null,
        leadId: r?.leadId || null,
        applicationNo: r?.applicationNo || null,
        applicantName: r?.name || null,
        contactNumber: phone?.national || from.replace(/\D+/g, ''),
        countryCode: phone?.countryCode || s.defaultCountryCode,
        programInterested: r?.program || null,
        callType: 'Inbound',
        callStatus: 'In Progress',
        callStartTime: new Date(),
        agentUserId: r?.assignedUserId || null,
        department: s.defaultDepartment,
        autoSmsAfterMissedCall: s.autoSmsAfterMissedCall,
        autoCreateFollowUpTask: s.autoCreateFollowUpTask,
        autoTagApplicant: s.autoTagApplicant,
        tags: [],
        provider,
        providerCallId: sid,
      }),
    );
  }

  private async matchAgent(orgId: string, s: TelephonySettings, c: CallLog, phone: string) {
    const last10 = phone.replace(/\D+/g, '').slice(-10);
    const line = (s.agentLines || []).find((l) => (l.phone || '').replace(/\D+/g, '').slice(-10) === last10);
    if (line) {
      const info = await this.agentInfo(orgId, line.userId, s);
      c.agentUserId = line.userId;
      c.agentName = info.name;
      c.department = info.department;
      c.extensionDeviceId = line.extension || line.phone || null;
    }
  }

  // ──────────────────────────────────────────────────────── automations ──

  /** Runs automation actions (once each) and mirrors the call into the timeline. */
  private async afterChange(c: CallLog, settings?: TelephonySettings): Promise<CallLog> {
    const s = settings || (await this.getSettings(c.organizationId));
    const terminal = isTerminalStatus(c.callStatus);
    const missed = c.callType === 'Missed' || (terminal && ['Not Answered', 'Busy'].includes(c.callStatus));
    const patch: Partial<CallLog> = {};

    // Auto-tag applicant based on conversation
    if (c.autoTagApplicant && (s.tagRules || []).length) {
      const text = `${c.transcription || ''}\n${c.agentNotes || ''}`.toLowerCase();
      const tags = new Set(c.tags || []);
      for (const rule of s.tagRules) {
        if (rule.keyword && text.includes(rule.keyword.toLowerCase())) tags.add(rule.tag);
      }
      if (c.callOutcome) tags.add(c.callOutcome);
      const next = Array.from(tags);
      if (next.length !== (c.tags || []).length) {
        patch.tags = next;
        await this.leadActivity(c, 'tagged', `Auto-tagged from call ${this.callCode(c)}: ${next.join(', ')}`, { tags: next, callId: c.id });
      }
    }

    // Auto-SMS after missed call
    if (terminal && missed && c.autoSmsAfterMissedCall && !c.autoSmsSentAt) {
      const r = await this.resolver.resolve({ applicationId: c.applicationId, leadId: c.leadId, orgId: c.organizationId }).catch(() => null);
      const body = renderMergeFields(s.missedCallSmsText || DEFAULT_MISSED_SMS, {
        name: c.applicantName || r?.name,
        firstName: r?.firstName,
        program: c.programInterested || r?.program || 'your programme',
        applicationNo: c.applicationNo,
      }).replace(/\{\{\s*[A-Za-z_]+\s*\}\}/g, '');
      const res = await this.messaging.send({
        organizationId: c.organizationId,
        channel: 'sms',
        to: c.contactNumber,
        countryCode: c.countryCode,
        body,
        messageType: 'Alert',
        recipientName: c.applicantName,
        applicationId: c.applicationId,
        leadId: c.leadId,
        triggerEvent: 'Missed Call',
        priority: 'High',
        sentByName: 'System (missed call)',
      });
      patch.autoSmsSentAt = new Date();
      patch.autoSmsMessageLogId = res.messageLogId || null;
      patch.autoSmsError = res.success ? null : res.error || 'SMS failed';
    }

    // Auto-create follow-up task
    const needsFollowUp = !!c.followUpDate || c.callOutcome === 'Follow-up Required' || (terminal && missed);
    if (c.autoCreateFollowUpTask && needsFollowUp && !c.followUpTaskCreatedAt && terminal) {
      const due = c.followUpDate || new Date(Date.now() + Math.max(0, s.followUpDays ?? 1) * 86_400_000);
      patch.followUpDate = due;
      patch.followUpTaskCreatedAt = new Date();
      if (c.leadId) {
        try {
          await this.dataSource.query(`UPDATE leads SET next_follow_up_at = $1 WHERE id = $2 AND organization_id = $3`, [due, c.leadId, c.organizationId]);
        } catch (err: any) {
          this.logger.warn(`Could not set lead follow-up: ${err?.message}`);
        }
      }
      await this.leadActivity(
        c,
        'follow_up_task',
        `Follow-up task: call ${c.applicantName || c.contactNumber} back by ${due.toISOString().slice(0, 10)} (${missed ? 'missed call' : c.callOutcome || 'call'})`,
        { callId: c.id, dueAt: due.toISOString() },
      );
      await this.notifications.notify({
        organizationId: c.organizationId,
        recipientUserId: c.agentUserId,
        recipientRole: c.agentUserId ? null : 'counselor,lead_manager',
        module: 'communications',
        type: 'call_follow_up',
        severity: 'info',
        title: `Follow-up: call ${c.applicantName || `+${c.countryCode} ${c.contactNumber}`}`,
        body: `Due ${due.toDateString()}${missed ? ' — missed call' : ''}.`,
        link: `/organization/calls?id=${c.id}`,
        relatedEntityId: c.id,
        metadata: { dueAt: due.toISOString(), applicationId: c.applicationId, leadId: c.leadId },
      });
    }

    if (Object.keys(patch).length) {
      await this.repo.update(c.id, patch);
      Object.assign(c, patch);
    }
    await this.syncTimeline(c);
    return c;
  }

  private async leadActivity(c: CallLog, action: string, content: string, metadata: Record<string, any>) {
    if (!c.leadId) return;
    try {
      const repo = this.dataSource.getRepository(LeadActivity);
      await repo.save(
        repo.create({
          leadId: c.leadId,
          organizationId: c.organizationId,
          actorId: c.agentUserId || undefined,
          action,
          content,
          metadata,
        } as any),
      );
    } catch (err: any) {
      this.logger.warn(`Could not write lead activity: ${err?.message}`);
    }
  }

  /** Mirrors the call into communication_logs (Communication History timeline). */
  private async syncTimeline(c: CallLog) {
    try {
      const subject = `${c.callType} call — ${c.callStatus}${c.durationSeconds ? ` (${fmtDuration(c.durationSeconds)})` : ''}`;
      const summary = [c.callOutcome ? `Outcome: ${c.callOutcome}` : null, c.agentNotes].filter(Boolean).join(' — ') || null;
      const content =
        [
          c.transcription ? `Transcript:\n${c.transcription}` : null,
          c.agentNotes ? `Agent notes:\n${c.agentNotes}` : null,
          c.tags?.length ? `Tags: ${c.tags.join(', ')}` : null,
        ]
          .filter(Boolean)
          .join('\n\n') || subject;
      const fields: Partial<CommunicationLog> = {
        organizationId: c.organizationId,
        applicationId: c.applicationId,
        leadId: c.leadId,
        applicationNo: c.applicationNo,
        applicantName: c.applicantName,
        recipientPhone: `+${c.countryCode} ${c.contactNumber}`,
        channel: 'Call',
        direction: c.callType === 'Outbound' ? 'Outbound' : 'Inbound',
        relatedRecordId: c.id,
        relatedRecordType: 'call_log',
        category: 'Call',
        subject,
        summary,
        content,
        attachments: c.recordingUrl ? [{ name: 'Call recording', url: c.recordingUrl, type: 'audio' }] : [],
        sender: c.agentName,
        handledBy: c.agentName || 'System',
        handledByUserId: c.agentUserId,
        status: c.callStatus === 'Answered' ? 'Delivered' : c.callStatus === 'In Progress' ? 'Sent' : 'Failed',
        failureReason: c.callStatus === 'Answered' || c.callStatus === 'In Progress' ? null : c.failureReason || c.callStatus,
        actionTaken: c.callOutcome,
        nextFollowUpDate: c.followUpDate,
        assignedStaffId: c.agentUserId,
        assignedStaffName: c.agentName,
        remarks: c.tags?.length ? `Tags: ${c.tags.join(', ')}` : null,
      };
      if (c.communicationLogId) {
        await this.commRepo.update(c.communicationLogId, fields as any);
      } else {
        const row = await this.commRepo.save(this.commRepo.create({ ...fields, sentAt: c.callStartTime || new Date() } as any));
        const id = (row as any).id as string;
        await this.repo.update(c.id, { communicationLogId: id });
        c.communicationLogId = id;
      }
    } catch (err: any) {
      this.logger.warn(`Call timeline sync failed: ${err?.message}`);
    }
  }
}
