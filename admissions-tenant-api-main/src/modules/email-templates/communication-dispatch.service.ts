import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Repository, LessThanOrEqual } from 'typeorm';
import { CommunicationLog } from '../communications/entities/communication-log.entity.js';
import { MailerService } from '../notifications/mailer.service.js';
import { MessagingService } from '../messaging/messaging.service.js';
import { RecipientResolverService, ResolvedRecipient } from '../messaging/recipient-resolver.service.js';
import { toUtcDate, DEFAULT_TIME_ZONE } from '../messaging/time-zone.util.js';
import { EmailTemplatesService, TemplateActor } from './email-templates.service.js';
import { buildEmailHtml, sendOrgEmail, htmlToText } from './email-sender.js';

export interface ComposeRecipient {
  applicationId?: string;
  leadId?: string;
  email?: string;
  phone?: string;
  countryCode?: string;
  name?: string;
}

/**
 * Unified compose for Email / SMS / WhatsApp (single + bulk, now or
 * scheduled) and the server-side dispatcher for scheduled emails —
 * replaces the old browser-side localStorage scheduler.
 */
@Injectable()
export class CommunicationDispatchService {
  private readonly logger = new Logger(CommunicationDispatchService.name);

  constructor(
    @InjectRepository(CommunicationLog) private readonly commRepo: Repository<CommunicationLog>,
    private readonly mailer: MailerService,
    private readonly messaging: MessagingService,
    private readonly resolver: RecipientResolverService,
    private readonly templates: EmailTemplatesService,
  ) {}

  private varsFor(r: ResolvedRecipient | null, manual: ComposeRecipient): Record<string, string | null | undefined> {
    return {
      name: r?.name || manual.name,
      student: r?.name || manual.name,
      email: r?.email || manual.email,
      phone: r?.phone || manual.phone,
      application_no: r?.applicationNo,
      course: r?.program,
      program: r?.program,
      academic_session: r?.academicSession,
    };
  }

  async compose(orgId: string, dto: Record<string, any>, actor: TemplateActor) {
    const recipients: ComposeRecipient[] = Array.isArray(dto.recipients) ? dto.recipients : [];
    if (recipients.length === 0) throw new BadRequestException('Add at least one recipient');

    let template: any = null;
    if (dto.templateId) {
      template = await this.templates.findOne(dto.templateId);
      if (template.status === 'archived') throw new BadRequestException('This template is archived');
    }
    const channel: 'Email' | 'SMS' | 'WhatsApp' = dto.channel;
    const subjectTpl: string = dto.subject ?? template?.subject ?? '';
    const bodyTpl: string = dto.body ?? template?.body ?? '';
    const headerTpl: string | null = dto.header ?? template?.header ?? null;
    const footerTpl: string | null = dto.footer ?? template?.footer ?? null;
    const signatureTpl: string | null = dto.signature ?? template?.signature ?? null;
    if (channel === 'Email' && !subjectTpl.trim()) throw new BadRequestException('Subject is required for email');

    const tz = dto.timeZone || DEFAULT_TIME_ZONE;
    const scheduledAt = dto.scheduledAt ? toUtcDate(dto.scheduledAt, tz) : null;
    if (dto.scheduledAt && !scheduledAt) throw new BadRequestException('Invalid scheduled date & time');
    const isLater = !!scheduledAt && scheduledAt.getTime() > Date.now() + 30_000;

    const results: { recipient: ComposeRecipient; success: boolean; id?: string; error?: string }[] = [];
    for (const rec of recipients) {
      try {
        const resolved = rec.applicationId || rec.leadId
          ? await this.resolver.resolve({ applicationId: rec.applicationId, leadId: rec.leadId, orgId })
          : null;
        if ((rec.applicationId || rec.leadId) && !resolved) {
          results.push({ recipient: rec, success: false, error: 'Applicant / lead not found' });
          continue;
        }

        if (channel === 'SMS' || channel === 'WhatsApp') {
          const res = await this.messaging.send({
            organizationId: orgId,
            channel: channel === 'SMS' ? 'sms' : 'whatsapp',
            to: rec.phone || resolved?.phone || '',
            countryCode: rec.countryCode,
            body: this.templates.renderText(bodyTpl, this.varsFor(resolved, rec)),
            messageType: dto.messageType || 'Status',
            templateId: dto.templateId || null,
            mediaUrl: dto.mediaUrl || null,
            ctaLink: dto.ctaLink || null,
            recipientName: rec.name || resolved?.name || null,
            applicationId: resolved?.applicationId || null,
            leadId: resolved?.leadId || null,
            triggerEvent: dto.triggerEvent || null,
            priority: dto.priority || 'Normal',
            scheduledAt: isLater ? scheduledAt : null,
            timeZone: tz,
            sentByUserId: actor.id || null,
            sentByName: actor.name || null,
          });
          results.push({ recipient: rec, success: res.success, id: res.messageLogId, error: res.error });
          continue;
        }

        // ── Email ────────────────────────────────────────────────────────
        const to = rec.email || resolved?.email;
        if (!to) {
          results.push({ recipient: rec, success: false, error: 'No email address' });
          continue;
        }
        const vars = this.varsFor(resolved, rec);
        const subject = this.templates.renderText(subjectTpl, vars);
        const body = this.templates.renderText(bodyTpl, vars);
        const header = headerTpl ? this.templates.renderText(headerTpl, vars) : null;
        const footer = footerTpl ? this.templates.renderText(footerTpl, vars) : null;
        const signature = signatureTpl ? this.templates.renderText(signatureTpl, vars) : null;
        const attachments = Array.isArray(dto.attachments) ? dto.attachments : [];

        const log = this.commRepo.create({
          organizationId: orgId,
          applicationId: resolved?.applicationId || null,
          leadId: resolved?.leadId || null,
          applicationNo: resolved?.applicationNo || null,
          applicantName: rec.name || resolved?.name || null,
          recipientEmail: to,
          channel: 'Email',
          direction: 'Outbound',
          relatedRecordType: 'email',
          category: dto.category || template?.templateCategory || template?.category || 'Direct Message',
          templateId: template?.id || null,
          subject,
          summary: htmlToText(body).slice(0, 200),
          content: [header, body, signature].filter(Boolean).join('\n\n'),
          footer,
          attachments,
          sender: actor.name || 'Admissions Desk',
          handledBy: actor.name || 'Staff',
          handledByUserId: actor.id || null,
          status: isLater ? 'Scheduled' : 'Sent',
          scheduledAt: isLater ? scheduledAt : null,
          timeZone: tz,
        });

        if (await this.templates.isSuppressed(orgId, to)) {
          log.status = 'Blocked';
          log.failureReason = 'Recipient has unsubscribed (suppression list)';
          const saved = await this.commRepo.save(log);
          results.push({ recipient: rec, success: false, id: saved.id, error: log.failureReason });
          continue;
        }

        const saved = await this.commRepo.save(log);
        if (isLater) {
          results.push({ recipient: rec, success: true, id: saved.id });
          continue;
        }
        const ok = await this.deliverEmail(saved);
        results.push({ recipient: rec, success: ok, id: saved.id, error: ok ? undefined : saved.failureReason || 'Send failed' });
      } catch (err: any) {
        results.push({ recipient: rec, success: false, error: err?.message || 'Failed' });
      }
    }
    if (template) await this.templates.bumpUsage(template.id);
    return {
      channel,
      scheduled: isLater,
      total: results.length,
      succeeded: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    };
  }

  /** Sends an email interaction row and updates its status. */
  private async deliverEmail(log: CommunicationLog): Promise<boolean> {
    const html = buildEmailHtml({
      subject: log.subject,
      body: log.content,
      footer: log.footer,
      category: log.category,
      senderName: log.sender,
      applicationNo: log.applicationNo,
    });
    const res = await sendOrgEmail(this.mailer, {
      organizationId: log.organizationId,
      to: log.recipientEmail || '',
      subject: log.subject,
      html,
      fromName: log.sender,
      attachments: log.attachments || [],
    });
    log.status = res.ok ? 'Sent' : 'Failed';
    log.failureReason = res.ok ? null : res.error || 'Send failed';
    log.messageId = res.messageId || log.messageId;
    if (res.ok && log.scheduledAt) log.sentAt = new Date();
    await this.commRepo.save(log);
    return res.ok;
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async dispatchScheduledEmails() {
    try {
      const due = await this.commRepo.find({
        where: { channel: 'Email', status: 'Scheduled', scheduledAt: LessThanOrEqual(new Date()) },
        order: { scheduledAt: 'ASC' },
        take: 100,
      });
      for (const log of due) {
        const claimed = await this.commRepo.update({ id: log.id, status: 'Scheduled' }, { status: 'Sending' });
        if (!claimed.affected) continue;
        if (log.recipientEmail && (await this.templates.isSuppressed(log.organizationId, log.recipientEmail))) {
          log.status = 'Blocked';
          log.failureReason = 'Recipient has unsubscribed (suppression list)';
          await this.commRepo.save(log);
          continue;
        }
        await this.deliverEmail(log);
      }
    } catch (err: any) {
      this.logger.error(`Scheduled email dispatch failed: ${err?.message || err}`);
    }
  }

  private async findOwned(orgId: string, id: string) {
    const log = await this.commRepo.findOne({ where: { id } });
    if (!log || (log.organizationId && log.organizationId !== orgId)) throw new NotFoundException('Communication not found');
    return log;
  }

  async resend(orgId: string, id: string, actor: TemplateActor) {
    const log = await this.findOwned(orgId, id);
    if (log.relatedRecordType === 'message_log' && log.relatedRecordId) {
      if (['Failed', 'Blocked'].includes(log.status)) return this.messaging.retry(orgId, log.relatedRecordId);
      const original = await this.messaging.findLog(orgId, log.relatedRecordId);
      return this.messaging.send({
        organizationId: orgId,
        channel: original.channel === 'WhatsApp' ? 'whatsapp' : 'sms',
        to: original.mobileNumber,
        countryCode: original.countryCode,
        body: original.body,
        messageType: original.messageType,
        templateId: original.templateId,
        mediaUrl: original.mediaUrl,
        recipientName: original.recipientName,
        applicationId: original.applicationId,
        leadId: original.leadId,
        triggerEvent: original.triggerEvent,
        priority: original.priority,
        sentByUserId: actor.id || null,
        sentByName: actor.name || null,
      });
    }
    if (log.channel !== 'Email' || !log.recipientEmail) {
      throw new BadRequestException('Only email, SMS and WhatsApp messages can be resent');
    }
    if (await this.templates.isSuppressed(orgId, log.recipientEmail)) {
      throw new BadRequestException('Recipient has unsubscribed (suppression list)');
    }
    const copy = this.commRepo.create({
      ...log,
      id: undefined,
      sentAt: undefined,
      updatedAt: undefined,
      organizationId: log.organizationId || orgId,
      status: 'Sent',
      scheduledAt: null,
      failureReason: null,
      handledBy: actor.name || 'Staff',
      handledByUserId: actor.id || null,
      remarks: `Resent from interaction ${log.id}`,
      actionTaken: null,
      nextFollowUpDate: null,
    } as any) as unknown as CommunicationLog;
    const saved = await this.commRepo.save(copy);
    const ok = await this.deliverEmail(saved);
    return { success: ok, id: saved.id, error: ok ? undefined : saved.failureReason };
  }

  async cancel(orgId: string, id: string) {
    const log = await this.findOwned(orgId, id);
    if (log.relatedRecordType === 'message_log' && log.relatedRecordId) {
      return this.messaging.cancelScheduled(orgId, log.relatedRecordId);
    }
    if (log.status !== 'Scheduled') throw new BadRequestException('Only scheduled messages can be cancelled');
    log.status = 'Cancelled';
    return this.commRepo.save(log);
  }
}
