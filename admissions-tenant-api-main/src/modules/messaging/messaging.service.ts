import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Repository, LessThanOrEqual, Brackets } from 'typeorm';
import { randomBytes } from 'crypto';
import { MessageLog } from './entities/message-log.entity.js';
import { MessagingSettings } from './entities/messaging-settings.entity.js';
import { MessagingConsent } from './entities/messaging-consent.entity.js';
import { CommunicationLog } from '../communications/entities/communication-log.entity.js';
import { Application } from '../applications/entities/application.entity.js';
import { RecipientResolverService, normalizePhone, ResolvedRecipient } from './recipient-resolver.service.js';
import { renderMergeFields } from './merge-fields.js';
import { toUtcDate } from './time-zone.util.js';
import {
  sendViaTwilio,
  sendViaGupshup,
  sendViaMsg91,
  validateTwilioSignature,
  publicApiBase,
  ProviderSendResult,
} from './messaging.providers.js';

export type MessagingChannel = 'sms' | 'whatsapp';

export interface SendMessageInput {
  organizationId: string;
  channel: MessagingChannel;
  /** Mobile number without country code, or full E.164 number */
  to: string;
  countryCode?: string;
  body: string;
  /** 'Reminder' | 'OTP' | 'Status' | 'Alert' | 'Marketing' */
  messageType?: string;
  templateId?: string | null;
  /** WhatsApp only — PDF / image URL */
  mediaUrl?: string | null;
  ctaLink?: string | null;
  recipientName?: string | null;
  applicationId?: string | null;
  leadId?: string | null;
  triggerEvent?: string | null;
  /** 'High' | 'Normal' | 'Low' */
  priority?: string;
  /** Send later instead of now */
  scheduledAt?: Date | null;
  /** Optional extras (used by the Communication module UI) */
  timeZone?: string | null;
  preferredLanguage?: string | null;
  sentByUserId?: string | null;
  sentByName?: string | null;
}

export interface SendMessageResult {
  success: boolean;
  messageLogId?: string;
  providerMessageId?: string;
  error?: string;
}

const SECRET_FIELDS = ['twilioAuthToken', 'gupshupApiKey', 'msg91AuthKey'] as const;
const STOP_WORDS = ['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT', 'OPTOUT', 'OPT-OUT'];
const START_WORDS = ['START', 'UNSTOP', 'YES', 'SUBSCRIBE', 'OPTIN', 'OPT-IN'];

const isUuid = (v?: string | null) =>
  !!v && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

/**
 * SMS / WhatsApp sending with per-organization providers (Twilio, Gupshup,
 * MSG91), consent checks, message log, scheduled sends and delivery webhooks.
 * `send()` never throws — it returns success=false on failure.
 */
@Injectable()
export class MessagingService {
  protected readonly logger = new Logger(MessagingService.name);

  constructor(
    @InjectRepository(MessageLog) private readonly logRepo: Repository<MessageLog>,
    @InjectRepository(MessagingSettings) private readonly settingsRepo: Repository<MessagingSettings>,
    @InjectRepository(MessagingConsent) private readonly consentRepo: Repository<MessagingConsent>,
    @InjectRepository(CommunicationLog) private readonly commRepo: Repository<CommunicationLog>,
    private readonly resolver: RecipientResolverService,
  ) {}

  // ───────────────────────────────────────────────────────────── settings ──

  async getSettings(orgId: string): Promise<MessagingSettings> {
    let s = await this.settingsRepo.findOne({ where: { organizationId: orgId } });
    if (!s) {
      s = await this.settingsRepo.save(
        this.settingsRepo.create({ organizationId: orgId, webhookToken: randomBytes(16).toString('hex') }),
      );
    } else if (!s.webhookToken) {
      s.webhookToken = randomBytes(16).toString('hex');
      s = await this.settingsRepo.save(s);
    }
    return s;
  }

  webhookUrls(s: MessagingSettings) {
    const base = publicApiBase();
    const q = `?token=${s.webhookToken}`;
    return {
      twilio: `${base}/messaging/webhooks/twilio/${s.organizationId}${q}`,
      gupshup: `${base}/messaging/webhooks/gupshup/${s.organizationId}${q}`,
      msg91: `${base}/messaging/webhooks/msg91/${s.organizationId}${q}`,
    };
  }

  /** Settings with secrets masked (never returned in clear text). */
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
    view.smsReady = this.isChannelReady(s, 'SMS');
    view.whatsappReady = this.isChannelReady(s, 'WhatsApp');
    return view;
  }

  async updateSettings(orgId: string, dto: Record<string, any>) {
    const s = await this.getSettings(orgId);
    const { regenerateWebhookToken, ...rest } = dto;
    for (const [k, v] of Object.entries(rest)) {
      if (v === undefined) continue;
      if ((SECRET_FIELDS as readonly string[]).includes(k) && v === '') continue; // blank = keep
      if (k === 'smsProvider' || k === 'whatsappProvider') {
        (s as any)[k] = v === 'none' || v === '' ? null : v;
        continue;
      }
      (s as any)[k] = typeof v === 'string' ? v.trim() || null : v;
    }
    if (!s.defaultCountryCode) s.defaultCountryCode = '91';
    if (!s.defaultTimeZone) s.defaultTimeZone = 'Asia/Kolkata';
    if (regenerateWebhookToken) s.webhookToken = randomBytes(16).toString('hex');
    await this.settingsRepo.save(s);
    return this.getSettingsView(orgId);
  }

  private isChannelReady(s: MessagingSettings, channel: 'SMS' | 'WhatsApp'): boolean {
    if (channel === 'SMS') {
      if (s.smsProvider === 'twilio') return !!(s.twilioAccountSid && s.twilioAuthToken && (s.twilioSmsFrom || s.twilioMessagingServiceSid));
      if (s.smsProvider === 'msg91') return !!(s.msg91AuthKey && s.msg91FlowId);
      return false;
    }
    if (s.whatsappProvider === 'twilio') return !!(s.twilioAccountSid && s.twilioAuthToken && s.twilioWhatsappFrom);
    if (s.whatsappProvider === 'gupshup') return !!(s.gupshupApiKey && s.gupshupSourceNumber && s.gupshupAppName);
    return false;
  }

  // ───────────────────────────────────────────────────────────── consent ──

  async getConsentStatus(
    orgId: string,
    national: string,
    channel: string,
    applicationId?: string | null,
  ): Promise<string> {
    const row = await this.consentRepo.findOne({ where: { organizationId: orgId, mobileNumber: national, channel } });
    if (row) return row.status;
    if (applicationId) {
      try {
        const app: any = await this.logRepo.manager.getRepository(Application).findOne({ where: { id: applicationId } });
        const optOut: string[] = Array.isArray(app?.reminderOptOutChannels) ? app.reminderOptOutChannels : [];
        if (optOut.some((c) => String(c).toLowerCase() === channel.toLowerCase())) return 'Opted Out';
      } catch {
        // column may not exist — ignore
      }
    }
    return 'Unknown';
  }

  private consentBlocks(s: MessagingSettings, consent: string, messageType: string): string | null {
    if (messageType === 'OTP') return null; // OTPs are requested by the recipient
    if (consent === 'Opted Out') return 'Recipient has opted out of this channel';
    if (consent !== 'Opted In') {
      if (s.requireOptInForAll) return 'No opt-in consent recorded for this recipient';
      if (messageType === 'Marketing' && s.requireOptInForMarketing) {
        return 'Marketing messages require opt-in consent';
      }
    }
    return null;
  }

  async setConsent(orgId: string, dto: Record<string, any>, userId?: string | null) {
    const s = await this.getSettings(orgId);
    const p = normalizePhone(dto.mobile, dto.countryCode, s.defaultCountryCode);
    if (!p) throw new BadRequestException('Invalid mobile number');
    let row = await this.consentRepo.findOne({
      where: { organizationId: orgId, mobileNumber: p.national, channel: dto.channel },
    });
    if (!row) {
      row = this.consentRepo.create({ organizationId: orgId, mobileNumber: p.national, channel: dto.channel });
    }
    row.countryCode = p.countryCode;
    row.status = dto.status;
    row.source = dto.source || 'Manual (staff)';
    row.preferredLanguage = dto.preferredLanguage ?? row.preferredLanguage ?? null;
    row.applicationId = dto.applicationId ?? row.applicationId ?? null;
    row.leadId = dto.leadId ?? row.leadId ?? null;
    row.updatedBy = userId || null;
    return this.consentRepo.save(row);
  }

  async listConsents(orgId: string, q: { search?: string; channel?: string; status?: string; page?: number; limit?: number }) {
    const page = Math.max(1, Number(q.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(q.limit) || 50));
    const qb = this.consentRepo.createQueryBuilder('c').where('c.organization_id = :orgId', { orgId });
    if (q.channel && q.channel !== 'all') qb.andWhere('c.channel = :ch', { ch: q.channel });
    if (q.status && q.status !== 'all') qb.andWhere('c.status = :st', { st: q.status });
    if (q.search) qb.andWhere('c.mobile_number LIKE :s', { s: `%${q.search.replace(/\D/g, '')}%` });
    qb.orderBy('c.updated_at', 'DESC').skip((page - 1) * limit).take(limit);
    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  // ──────────────────────────────────────────────────────────────── send ──

  async send(input: SendMessageInput): Promise<SendMessageResult> {
    try {
      return await this.sendInternal(input);
    } catch (err: any) {
      this.logger.error(`Messaging send failed: ${err?.message || err}`);
      return { success: false, error: err?.message || 'Messaging send failed' };
    }
  }

  private async sendInternal(input: SendMessageInput): Promise<SendMessageResult> {
    if (!input.organizationId) return { success: false, error: 'organizationId is required' };
    const channel: 'SMS' | 'WhatsApp' = String(input.channel).toLowerCase() === 'whatsapp' ? 'WhatsApp' : 'SMS';
    const s = await this.getSettings(input.organizationId);

    let recipient: ResolvedRecipient | null = null;
    if (input.applicationId || input.leadId) {
      recipient = await this.resolver.resolve({
        applicationId: input.applicationId,
        leadId: input.leadId,
        orgId: input.organizationId,
      });
    }
    const rawTo = input.to || recipient?.phone || '';
    const phone = normalizePhone(rawTo, input.countryCode, s.defaultCountryCode);
    const messageType = input.messageType || 'Status';
    const name = input.recipientName || recipient?.name || null;

    let body = renderMergeFields(input.body, {
      name,
      firstName: recipient?.firstName,
      program: recipient?.program,
      applicationNo: recipient?.applicationNo,
      email: recipient?.email,
      phone: rawTo,
      link: input.ctaLink,
    });
    if (input.ctaLink && !body.includes(input.ctaLink)) body = `${body}\n${input.ctaLink}`;

    const log = this.logRepo.create({
      organizationId: input.organizationId,
      channel,
      messageType,
      templateId: input.templateId || null,
      body,
      characterCount: body.length,
      mediaUrl: channel === 'WhatsApp' ? input.mediaUrl || null : null,
      ctaLink: input.ctaLink || null,
      applicationId: input.applicationId || recipient?.applicationId || null,
      leadId: input.leadId || recipient?.leadId || null,
      applicationNo: recipient?.applicationNo || null,
      recipientName: name,
      mobileNumber: phone?.national || String(rawTo).replace(/\D/g, '').slice(0, 30) || 'unknown',
      countryCode: phone?.countryCode || s.defaultCountryCode || '91',
      preferredLanguage: input.preferredLanguage || null,
      triggerEvent: input.triggerEvent || null,
      scheduledAt: input.scheduledAt || null,
      priority: input.priority || 'Normal',
      timeZone: input.timeZone || s.defaultTimeZone || null,
      sentByUserId: input.sentByUserId || null,
      sentByName: input.sentByName || null,
      direction: 'Outbound',
      sentStatus: 'Queued',
    });

    if (!phone) {
      log.sentStatus = 'Failed';
      log.failureReason = 'Invalid or missing mobile number';
      const saved = await this.logRepo.save(log);
      await this.mirror(saved);
      return { success: false, messageLogId: saved.id, error: log.failureReason };
    }

    const consent = await this.getConsentStatus(input.organizationId, phone.national, channel, log.applicationId);
    log.consentStatus = consent;
    const consentRow = await this.consentRepo.findOne({
      where: { organizationId: input.organizationId, mobileNumber: phone.national, channel },
    });
    if (!log.preferredLanguage && consentRow?.preferredLanguage) log.preferredLanguage = consentRow.preferredLanguage;

    const blocked = this.consentBlocks(s, consent, messageType);
    if (blocked) {
      log.sentStatus = 'Blocked';
      log.failureReason = blocked;
      const saved = await this.logRepo.save(log);
      await this.mirror(saved);
      return { success: false, messageLogId: saved.id, error: blocked };
    }

    if (log.scheduledAt && log.scheduledAt.getTime() > Date.now() + 30_000) {
      log.sentStatus = 'Scheduled';
      const saved = await this.logRepo.save(log);
      await this.mirror(saved);
      return { success: true, messageLogId: saved.id };
    }

    const saved = await this.logRepo.save(log);
    await this.mirror(saved);
    return this.dispatch(saved, s);
  }

  private async dispatch(log: MessageLog, settings?: MessagingSettings): Promise<SendMessageResult> {
    const s = settings || (await this.getSettings(log.organizationId));
    const channel = log.channel as 'SMS' | 'WhatsApp';
    const provider = channel === 'SMS' ? s.smsProvider : s.whatsappProvider;
    const toE164 = `+${log.countryCode}${log.mobileNumber}`;
    const statusCallbackUrl = provider === 'twilio' ? this.webhookUrls(s).twilio : null;

    let result: ProviderSendResult;
    const input = { channel, toE164, body: log.body, mediaUrl: log.mediaUrl, statusCallbackUrl };
    if (!provider) {
      result = { ok: false, provider: 'none', error: `${channel} provider not configured for this organization` };
    } else if (provider === 'twilio') {
      result = await sendViaTwilio(s, input);
    } else if (provider === 'gupshup' && channel === 'WhatsApp') {
      result = await sendViaGupshup(s, input);
    } else if (provider === 'msg91' && channel === 'SMS') {
      result = await sendViaMsg91(s, input);
    } else {
      result = { ok: false, provider, error: `Provider "${provider}" does not support ${channel}` };
    }

    log.attempts = (log.attempts || 0) + 1;
    log.provider = result.provider === 'none' ? null : result.provider;
    if (result.ok) {
      log.sentStatus = 'Sent';
      log.sentAt = new Date();
      log.providerMessageId = result.providerMessageId || null;
      log.failureReason = null;
      if (channel === 'WhatsApp') log.readStatus = 'Unread';
    } else {
      log.sentStatus = 'Failed';
      log.failureReason = result.error || 'Send failed';
      this.logger.warn(`${channel} to ${toE164} failed: ${log.failureReason}`);
    }
    const saved = await this.logRepo.save(log);
    await this.mirror(saved);
    return result.ok
      ? { success: true, messageLogId: saved.id, providerMessageId: saved.providerMessageId || undefined }
      : { success: false, messageLogId: saved.id, error: saved.failureReason || 'Send failed' };
  }

  /** Mirrors a message into communication_logs so it shows in the applicant timeline. */
  private async mirror(log: MessageLog) {
    try {
      const status =
        log.readStatus === 'Read' ? 'Read' : log.sentStatus === 'Queued' ? 'Sent' : log.sentStatus;
      const existing = await this.commRepo.findOne({ where: { relatedRecordId: log.id, relatedRecordType: 'message_log' } });
      if (existing) {
        existing.status = status;
        existing.failureReason = log.failureReason;
        existing.messageId = log.providerMessageId;
        if (log.sentStatus === 'Sent' && existing.scheduledAt) existing.scheduledAt = null;
        await this.commRepo.save(existing);
        return;
      }
      await this.commRepo.save(
        this.commRepo.create({
          organizationId: log.organizationId,
          applicationId: log.applicationId,
          leadId: log.leadId,
          applicationNo: log.applicationNo,
          applicantName: log.recipientName,
          recipientPhone: `+${log.countryCode}${log.mobileNumber}`,
          channel: log.channel,
          direction: log.direction,
          relatedRecordId: log.id,
          relatedRecordType: 'message_log',
          category: log.messageType,
          templateId: isUuid(log.templateId) ? log.templateId : null,
          subject: log.direction === 'Inbound' ? `${log.channel} reply received` : `${log.channel} — ${log.messageType}`,
          summary: log.body.length > 200 ? `${log.body.slice(0, 197)}...` : log.body,
          content: log.body,
          attachments: log.mediaUrl ? [{ name: log.mediaUrl.split('/').pop()?.split('?')[0] || 'attachment', url: log.mediaUrl }] : [],
          sender: log.sentByName || 'System',
          handledBy: log.direction === 'Inbound' ? null : log.sentByName || 'System',
          handledByUserId: log.sentByUserId,
          status,
          failureReason: log.failureReason,
          messageId: log.providerMessageId,
          scheduledAt: log.sentStatus === 'Scheduled' ? log.scheduledAt : null,
          timeZone: log.timeZone,
        }),
      );
    } catch (err: any) {
      this.logger.warn(`Could not mirror message ${log.id} to timeline: ${err?.message || err}`);
    }
  }

  // ───────────────────────────────────────────────────── staff-facing API ──

  async sendFromUi(orgId: string, dto: Record<string, any>, user?: { id?: string; name?: string }) {
    const s = await this.getSettings(orgId);
    const scheduledAt = dto.scheduledAt ? toUtcDate(dto.scheduledAt, dto.timeZone || s.defaultTimeZone) : null;
    if (dto.scheduledAt && !scheduledAt) throw new BadRequestException('Invalid scheduled date & time');
    if (!dto.to && !dto.applicationId && !dto.leadId) {
      throw new BadRequestException('Select an applicant / lead or enter a mobile number');
    }
    return this.send({
      organizationId: orgId,
      channel: String(dto.channel).toLowerCase() === 'whatsapp' ? 'whatsapp' : 'sms',
      to: dto.to || '',
      countryCode: dto.countryCode,
      body: dto.body,
      messageType: dto.messageType,
      templateId: dto.templateId,
      mediaUrl: dto.mediaUrl,
      ctaLink: dto.ctaLink,
      recipientName: dto.recipientName,
      applicationId: dto.applicationId,
      leadId: dto.leadId,
      triggerEvent: dto.triggerEvent,
      priority: dto.priority,
      scheduledAt,
      timeZone: dto.timeZone || s.defaultTimeZone,
      preferredLanguage: dto.preferredLanguage,
      sentByUserId: user?.id || null,
      sentByName: user?.name || null,
    });
  }

  async sendBulk(orgId: string, dto: Record<string, any>, user?: { id?: string; name?: string }) {
    const recipients: any[] = Array.isArray(dto.recipients) ? dto.recipients : [];
    if (recipients.length === 0) throw new BadRequestException('Add at least one recipient');
    const results: (SendMessageResult & { recipient: any })[] = [];
    for (const r of recipients) {
      const res = await this.sendFromUi(
        orgId,
        { ...dto, recipients: undefined, applicationId: r.applicationId, leadId: r.leadId, to: r.to, countryCode: r.countryCode, recipientName: r.recipientName },
        user,
      ).catch((e: any) => ({ success: false, error: e?.message || 'Failed' }) as SendMessageResult);
      results.push({ ...res, recipient: r });
    }
    return {
      total: results.length,
      succeeded: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    };
  }

  async sendTest(orgId: string, dto: { channel: string; to: string; countryCode?: string }, user?: { id?: string; name?: string }) {
    return this.send({
      organizationId: orgId,
      channel: dto.channel === 'WhatsApp' ? 'whatsapp' : 'sms',
      to: dto.to,
      countryCode: dto.countryCode,
      body: `Test message from your admissions CRM (${dto.channel}). If you received this, the provider is configured correctly.`,
      messageType: 'Alert',
      sentByUserId: user?.id || null,
      sentByName: user?.name || null,
    });
  }

  async listLogs(
    orgId: string,
    q: {
      channel?: string;
      status?: string;
      messageType?: string;
      direction?: string;
      search?: string;
      applicationId?: string;
      leadId?: string;
      dateFrom?: string;
      dateTo?: string;
      page?: number | string;
      limit?: number | string;
    },
  ) {
    const page = Math.max(1, Number(q.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(q.limit) || 20));
    const qb = this.logRepo.createQueryBuilder('m').where('m.organization_id = :orgId', { orgId });
    if (q.channel && q.channel !== 'all') qb.andWhere('m.channel = :ch', { ch: q.channel });
    if (q.status && q.status !== 'all') qb.andWhere('m.sent_status = :st', { st: q.status });
    if (q.messageType && q.messageType !== 'all') qb.andWhere('m.message_type = :mt', { mt: q.messageType });
    if (q.direction && q.direction !== 'all') qb.andWhere('m.direction = :dir', { dir: q.direction });
    if (q.applicationId) qb.andWhere('m.application_id = :aid', { aid: q.applicationId });
    if (q.leadId) qb.andWhere('m.lead_id = :lid', { lid: q.leadId });
    if (q.dateFrom) qb.andWhere('m.created_at >= :df', { df: new Date(q.dateFrom) });
    if (q.dateTo) qb.andWhere('m.created_at < :dt', { dt: new Date(new Date(q.dateTo).getTime() + 86_400_000) });
    if (q.search) {
      const s = `%${q.search.toLowerCase()}%`;
      qb.andWhere(
        new Brackets((b) => {
          b.where('LOWER(m.recipient_name) LIKE :s', { s })
            .orWhere('m.mobile_number LIKE :s', { s })
            .orWhere('LOWER(m.application_no) LIKE :s', { s })
            .orWhere('LOWER(m.body) LIKE :s', { s });
        }),
      );
    }
    qb.orderBy('m.created_at', 'DESC').skip((page - 1) * limit).take(limit);
    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  async stats(orgId: string) {
    const rows = await this.logRepo
      .createQueryBuilder('m')
      .select('m.channel', 'channel')
      .addSelect('m.sent_status', 'status')
      .addSelect('COUNT(*)::int', 'count')
      .addSelect("SUM(CASE WHEN m.read_status = 'Read' THEN 1 ELSE 0 END)::int", 'read')
      .where('m.organization_id = :orgId', { orgId })
      .andWhere("m.direction = 'Outbound'")
      .groupBy('m.channel')
      .addGroupBy('m.sent_status')
      .getRawMany();
    const out: Record<string, any> = { total: 0, sent: 0, delivered: 0, failed: 0, scheduled: 0, blocked: 0, read: 0, byChannel: {} };
    for (const r of rows) {
      const c = Number(r.count) || 0;
      out.total += c;
      out.read += Number(r.read) || 0;
      const key = String(r.status).toLowerCase();
      if (key in out) out[key] += c;
      out.byChannel[r.channel] = (out.byChannel[r.channel] || 0) + c;
    }
    return out;
  }

  async findLog(orgId: string, id: string) {
    const log = await this.logRepo.findOne({ where: { id, organizationId: orgId } });
    if (!log) throw new NotFoundException('Message not found');
    return log;
  }

  async retry(orgId: string, id: string) {
    const log = await this.findLog(orgId, id);
    if (!['Failed', 'Blocked'].includes(log.sentStatus)) {
      throw new BadRequestException('Only failed or blocked messages can be retried');
    }
    const s = await this.getSettings(orgId);
    const consent = await this.getConsentStatus(orgId, log.mobileNumber, log.channel, log.applicationId);
    log.consentStatus = consent;
    const blocked = this.consentBlocks(s, consent, log.messageType);
    if (blocked) {
      log.sentStatus = 'Blocked';
      log.failureReason = blocked;
      await this.logRepo.save(log);
      await this.mirror(log);
      return { success: false, messageLogId: log.id, error: blocked };
    }
    return this.dispatch(log, s);
  }

  async cancelScheduled(orgId: string, id: string) {
    const log = await this.findLog(orgId, id);
    if (log.sentStatus !== 'Scheduled') throw new BadRequestException('Only scheduled messages can be cancelled');
    log.sentStatus = 'Failed';
    log.failureReason = 'Cancelled before sending';
    await this.logRepo.save(log);
    await this.mirror(log);
    return log;
  }

  // ──────────────────────────────────────────────────── scheduled sending ──

  @Cron(CronExpression.EVERY_MINUTE)
  async dispatchDueMessages() {
    try {
      const due = await this.logRepo.find({
        where: { sentStatus: 'Scheduled', scheduledAt: LessThanOrEqual(new Date()) },
        order: { scheduledAt: 'ASC' },
        take: 200,
      });
      const rank: Record<string, number> = { High: 0, Normal: 1, Low: 2 };
      due.sort((a, b) => (rank[a.priority] ?? 1) - (rank[b.priority] ?? 1));
      for (const log of due) {
        // claim the row so overlapping runs don't double-send
        const claimed = await this.logRepo.update({ id: log.id, sentStatus: 'Scheduled' }, { sentStatus: 'Queued' });
        if (!claimed.affected) continue;
        log.sentStatus = 'Queued';
        const s = await this.getSettings(log.organizationId);
        const consent = await this.getConsentStatus(log.organizationId, log.mobileNumber, log.channel, log.applicationId);
        const blocked = this.consentBlocks(s, consent, log.messageType);
        if (blocked) {
          log.sentStatus = 'Blocked';
          log.failureReason = blocked;
          log.consentStatus = consent;
          await this.logRepo.save(log);
          await this.mirror(log);
          continue;
        }
        await this.dispatch(log, s);
      }
    } catch (err: any) {
      this.logger.error(`Scheduled message dispatch failed: ${err?.message || err}`);
    }
  }

  // ────────────────────────────────────────────────────────────── webhooks ──

  private async assertWebhook(orgId: string, token?: string): Promise<MessagingSettings> {
    const s = await this.settingsRepo.findOne({ where: { organizationId: orgId } });
    if (!s || !s.webhookToken || !token || token !== s.webhookToken) {
      throw new ForbiddenException('Invalid webhook token');
    }
    return s;
  }

  private async applyStatus(
    orgId: string,
    providerMessageId: string,
    status: 'Sent' | 'Delivered' | 'Read' | 'Failed' | null,
    reason?: string | null,
    at?: Date,
  ) {
    if (!providerMessageId || !status) return;
    const log = await this.logRepo.findOne({ where: { organizationId: orgId, providerMessageId } });
    if (!log) return;
    const when = at && !isNaN(at.getTime()) ? at : new Date();
    if (status === 'Read') {
      log.readStatus = 'Read';
      log.readAt = when;
      if (log.sentStatus !== 'Failed') log.sentStatus = 'Delivered';
      if (!log.deliveredAt) log.deliveredAt = when;
    } else if (status === 'Delivered') {
      if (log.sentStatus !== 'Failed') log.sentStatus = 'Delivered';
      log.deliveredAt = when;
    } else if (status === 'Failed') {
      log.sentStatus = 'Failed';
      log.failureReason = reason || log.failureReason || 'Delivery failed';
    } else if (status === 'Sent' && log.sentStatus !== 'Delivered') {
      log.sentStatus = 'Sent';
    }
    await this.logRepo.save(log);
    await this.mirror(log);
  }

  private async recordInbound(orgId: string, channel: 'SMS' | 'WhatsApp', from: string, text: string, provider: string, providerMessageId?: string) {
    const s = await this.getSettings(orgId);
    const p = normalizePhone(from, null, s.defaultCountryCode);
    if (!p) return;
    const match = await this.resolver.findByPhone(orgId, p.national);
    const word = text.trim().toUpperCase();
    if (STOP_WORDS.includes(word) || START_WORDS.includes(word)) {
      await this.setConsent(orgId, {
        mobile: p.national,
        countryCode: p.countryCode,
        channel,
        status: STOP_WORDS.includes(word) ? 'Opted Out' : 'Opted In',
        source: `Inbound ${word} keyword`,
        applicationId: match?.applicationId || undefined,
        leadId: match?.leadId || undefined,
      });
    }
    const log = await this.logRepo.save(
      this.logRepo.create({
        organizationId: orgId,
        channel,
        messageType: 'Status',
        body: text,
        characterCount: text.length,
        applicationId: match?.applicationId || null,
        leadId: match?.leadId || null,
        applicationNo: match?.applicationNo || null,
        recipientName: match?.name || null,
        mobileNumber: p.national,
        countryCode: p.countryCode,
        sentStatus: 'Delivered',
        deliveredAt: new Date(),
        provider,
        providerMessageId: providerMessageId || null,
        direction: 'Inbound',
        consentStatus: await this.getConsentStatus(orgId, p.national, channel, match?.applicationId),
      }),
    );
    await this.mirror(log);
  }

  async handleTwilioWebhook(orgId: string, token: string | undefined, body: Record<string, any>, signature?: string) {
    const s = await this.assertWebhook(orgId, token);
    if (s.twilioAuthToken && signature) {
      const url = this.webhookUrls(s).twilio;
      if (!validateTwilioSignature(s.twilioAuthToken, signature, url, body)) {
        this.logger.warn(`Twilio webhook signature mismatch for org ${orgId} (check API_PUBLIC_URL)`);
        throw new ForbiddenException('Invalid Twilio signature');
      }
    }
    const sid = body.MessageSid || body.SmsSid;
    const st = String(body.MessageStatus || body.SmsStatus || '').toLowerCase();
    if (st && st !== 'received') {
      const map: Record<string, 'Sent' | 'Delivered' | 'Read' | 'Failed'> = {
        sent: 'Sent',
        delivered: 'Delivered',
        read: 'Read',
        failed: 'Failed',
        undelivered: 'Failed',
      };
      const reason = body.ErrorCode ? `Twilio error ${body.ErrorCode}${body.ErrorMessage ? `: ${body.ErrorMessage}` : ''}` : null;
      await this.applyStatus(orgId, sid, map[st] || null, reason);
      return { ok: true };
    }
    if (body.From && body.Body !== undefined) {
      const isWa = String(body.From).startsWith('whatsapp:');
      await this.recordInbound(orgId, isWa ? 'WhatsApp' : 'SMS', String(body.From).replace(/^whatsapp:/, ''), String(body.Body), 'twilio', sid);
    }
    return { ok: true };
  }

  async handleGupshupWebhook(orgId: string, token: string | undefined, body: Record<string, any>) {
    await this.assertWebhook(orgId, token);
    const type = body?.type;
    const payload = body?.payload || {};
    if (type === 'message-event') {
      const ev = String(payload.type || '').toLowerCase();
      const map: Record<string, 'Sent' | 'Delivered' | 'Read' | 'Failed'> = {
        sent: 'Sent',
        delivered: 'Delivered',
        read: 'Read',
        failed: 'Failed',
      };
      const ids = [payload.gsId, payload.id].filter(Boolean);
      const at = body.timestamp ? new Date(Number(body.timestamp)) : undefined;
      for (const id of ids) {
        await this.applyStatus(orgId, String(id), map[ev] || null, payload?.payload?.reason || null, at);
      }
    } else if (type === 'message') {
      const from = payload.source || payload.sender?.phone;
      const text = payload?.payload?.text || payload?.payload?.caption || `[${payload.type || 'message'}]`;
      if (from) await this.recordInbound(orgId, 'WhatsApp', String(from), String(text), 'gupshup', payload.id);
    }
    return { ok: true };
  }

  async handleMsg91Webhook(orgId: string, token: string | undefined, body: any) {
    await this.assertWebhook(orgId, token);
    let data: any = body?.data ?? body;
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch {
        data = [];
      }
    }
    const list: any[] = Array.isArray(data) ? data : [data];
    for (const item of list) {
      const requestId = item?.requestId || item?.request_id;
      const reports: any[] = Array.isArray(item?.report) ? item.report : [item];
      for (const r of reports) {
        const desc = String(r?.desc || r?.status || '').toUpperCase();
        const status: 'Delivered' | 'Failed' | 'Sent' | null =
          desc.includes('DELIVER') || String(r?.status) === '1'
            ? 'Delivered'
            : desc.includes('FAIL') || desc.includes('REJECT') || desc.includes('NDNC') || ['2', '16', '9'].includes(String(r?.status))
              ? 'Failed'
              : desc.includes('SENT') || String(r?.status) === '8'
                ? 'Sent'
                : null;
        await this.applyStatus(orgId, String(requestId || ''), status, status === 'Failed' ? r?.desc || 'Delivery failed' : null, r?.date ? new Date(r.date) : undefined);
      }
    }
    return { ok: true };
  }
}
