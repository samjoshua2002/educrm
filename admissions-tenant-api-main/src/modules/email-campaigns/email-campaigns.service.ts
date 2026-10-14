import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Repository, DataSource, Brackets, In, LessThan } from 'typeorm';
import { EmailCampaign } from './entities/email-campaign.entity.js';
import { EmailCampaignRecipient } from './entities/email-campaign-recipient.entity.js';
import { EmailSuppression } from './entities/email-suppression.entity.js';
import { EmailCampaignAudienceService, AudienceMember, AudienceEventFilter } from './email-campaign-audience.service.js';
import { CommunicationLog } from '../communications/entities/communication-log.entity.js';
import { Organization } from '../organizations/entities/organization.entity.js';
import { EmailTemplate } from '../email-templates/entities/email-template.entity.js';
import { MailerService } from '../notifications/mailer.service.js';
import { InAppNotificationsService } from '../in-app-notifications/in-app-notifications.service.js';
import { sendOrgEmail, htmlToText, bodyToHtml } from '../email-templates/email-sender.js';
import { renderMergeFields, extractMergeFields } from '../messaging/merge-fields.js';
import { toUtcDate, isValidTimeZone, DEFAULT_TIME_ZONE } from '../messaging/time-zone.util.js';
import { publicApiBase } from '../messaging/messaging.providers.js';

export interface CampaignActor {
  id?: string | null;
  name?: string | null;
}

const DAY = 86_400_000;
const EVENT_POLL_MS = 5 * 60_000;
const MAX_PER_RUN = 5000;

const escapeHtml = (s: string) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const pct = (num: number, den: number) => (den > 0 ? Math.round((num / den) * 1000) / 10 : 0);

@Injectable()
export class EmailCampaignsService {
  private readonly logger = new Logger(EmailCampaignsService.name);
  private ticking = false;

  constructor(
    @InjectRepository(EmailCampaign) private readonly repo: Repository<EmailCampaign>,
    @InjectRepository(EmailCampaignRecipient) private readonly recipientRepo: Repository<EmailCampaignRecipient>,
    @InjectRepository(EmailSuppression) private readonly suppressionRepo: Repository<EmailSuppression>,
    @InjectRepository(CommunicationLog) private readonly commRepo: Repository<CommunicationLog>,
    private readonly audience: EmailCampaignAudienceService,
    private readonly mailer: MailerService,
    private readonly notifications: InAppNotificationsService,
    private readonly dataSource: DataSource,
  ) {}

  // ───────────────────────────────────────────────────────────── helpers ──

  campaignCode(c: Pick<EmailCampaign, 'campaignNo'>) {
    return `CMP-${String(c.campaignNo || 0).padStart(4, '0')}`;
  }

  /** Adds the campaign code and computed rates (scope §4 Tracking & Performance). */
  view(c: EmailCampaign) {
    return {
      ...c,
      campaignCode: this.campaignCode(c),
      mode: this.isEventMode(c) ? 'event' : 'schedule',
      openRate: pct(c.openCount, c.deliveredCount),
      clickRate: pct(c.clickCount, c.deliveredCount),
      bounceRate: pct(c.bounceCount, c.totalSent),
      deliveryRate: pct(c.deliveredCount, c.totalSent),
      unsubscribeRate: pct(c.unsubscribeCount, c.deliveredCount),
    };
  }

  private isEventMode(c: EmailCampaign) {
    return !!c.triggerEvent && (c.campaignType === 'Trigger-based' || c.frequency === 'Event-based');
  }

  private applyDto(c: EmailCampaign, dto: Record<string, any>) {
    const tz = dto.timeZone !== undefined ? (isValidTimeZone(dto.timeZone) ? dto.timeZone : DEFAULT_TIME_ZONE) : c.timeZone || DEFAULT_TIME_ZONE;
    c.timeZone = tz;
    const plain = [
      'name',
      'campaignType',
      'objective',
      'targetCourseId',
      'targetProgram',
      'academicYear',
      'intakeTerm',
      'targetAudience',
      'segmentCriteria',
      'templateId',
      'subject',
      'preHeader',
      'htmlBody',
      'textBody',
      'attachments',
      'language',
      'footerAddress',
      'footerText',
      'senderName',
      'triggerEvent',
      'frequency',
      'maxSendsPerRecipient',
      'stopConditions',
    ];
    for (const k of plain) {
      if (dto[k] === undefined) continue;
      const v = dto[k];
      (c as any)[k] = typeof v === 'string' && k !== 'htmlBody' && k !== 'textBody' ? v.trim() || null : v;
    }
    if (dto.scheduledAt !== undefined) c.scheduledAt = toUtcDate(dto.scheduledAt, tz);
    if (dto.deadlineAt !== undefined) c.deadlineAt = toUtcDate(dto.deadlineAt, tz);
    if (dto.endAt !== undefined) c.endAt = toUtcDate(dto.endAt, tz);
    if (!c.name) throw new BadRequestException('Campaign name is required');
    if (!c.targetAudience || c.targetAudience.length === 0) c.targetAudience = ['Prospects'];
    c.subject = c.subject || '';
    c.htmlBody = c.htmlBody || '';
    c.personalizationVariables = Array.from(
      new Set([...extractMergeFields(c.subject), ...extractMergeFields(c.preHeader), ...extractMergeFields(c.htmlBody), ...extractMergeFields(c.textBody)]),
    );
    if (c.campaignType === 'Trigger-based' && !c.triggerEvent) {
      throw new BadRequestException('Trigger-based campaigns need a trigger event');
    }
    if (c.triggerEvent === 'Deadline Missed' && !c.deadlineAt) {
      throw new BadRequestException('Set the deadline date for the "Deadline Missed" trigger');
    }
    if (c.campaignType === 'Drip' && c.frequency === 'One-time') c.frequency = 'Weekly';
  }

  private assertSendable(c: EmailCampaign) {
    if (!c.subject?.trim()) throw new BadRequestException('Add a subject line before activating the campaign');
    if (!c.htmlBody?.trim() && !c.textBody?.trim()) throw new BadRequestException('Add the email body before activating the campaign');
  }

  // ──────────────────────────────────────────────────────────────── CRUD ──

  async list(orgId: string, q: Record<string, any>) {
    const page = Math.max(1, Number(q.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(q.limit) || 20));
    const qb = this.repo.createQueryBuilder('c').where('c.organization_id = :orgId', { orgId });
    if (q.status && q.status !== 'all') qb.andWhere('c.status = :status', { status: q.status });
    if (q.campaignType && q.campaignType !== 'all') qb.andWhere('c.campaign_type = :t', { t: q.campaignType });
    if (q.objective && q.objective !== 'all') qb.andWhere('c.objective = :o', { o: q.objective });
    if (q.search) {
      const s = `%${String(q.search).toLowerCase()}%`;
      qb.andWhere(
        new Brackets((b) => {
          b.where('LOWER(c.name) LIKE :s', { s })
            .orWhere('LOWER(c.subject) LIKE :s', { s })
            .orWhere("('cmp-' || LPAD(c.campaign_no::text, 4, '0')) LIKE :s", { s });
        }),
      );
    }
    qb.orderBy('c.created_at', 'DESC').skip((page - 1) * limit).take(limit);
    const [rows, total] = await qb.getManyAndCount();
    return { data: rows.map((r) => this.view(r)), total, page, limit };
  }

  async overview(orgId: string) {
    const r = await this.repo
      .createQueryBuilder('c')
      .select('COUNT(*)::int', 'campaigns')
      .addSelect("SUM(CASE WHEN c.status = 'Active' THEN 1 ELSE 0 END)::int", 'active')
      .addSelect('COALESCE(SUM(c.total_sent), 0)::int', 'sent')
      .addSelect('COALESCE(SUM(c.delivered_count), 0)::int', 'delivered')
      .addSelect('COALESCE(SUM(c.open_count), 0)::int', 'opened')
      .addSelect('COALESCE(SUM(c.click_count), 0)::int', 'clicked')
      .addSelect('COALESCE(SUM(c.bounce_count), 0)::int', 'bounced')
      .addSelect('COALESCE(SUM(c.unsubscribe_count), 0)::int', 'unsubscribed')
      .where('c.organization_id = :orgId', { orgId })
      .getRawOne();
    const n = (k: string) => Number(r?.[k]) || 0;
    const suppressed = await this.suppressionRepo.count({ where: { organizationId: orgId } });
    return {
      campaigns: n('campaigns'),
      active: n('active'),
      totalSent: n('sent'),
      delivered: n('delivered'),
      openRate: pct(n('opened'), n('delivered')),
      clickRate: pct(n('clicked'), n('delivered')),
      bounceRate: pct(n('bounced'), n('sent')),
      unsubscribed: n('unsubscribed'),
      suppressed,
    };
  }

  async findOne(orgId: string, id: string): Promise<EmailCampaign> {
    const c = await this.repo.findOne({ where: { id, organizationId: orgId } });
    if (!c) throw new NotFoundException('Campaign not found');
    return c;
  }

  async get(orgId: string, id: string) {
    return this.view(await this.findOne(orgId, id));
  }

  async create(orgId: string, dto: Record<string, any>, actor: CampaignActor) {
    const c = this.repo.create({
      organizationId: orgId,
      status: 'Draft',
      createdBy: actor.id || null,
      createdByName: actor.name || null,
      updatedBy: actor.id || null,
      attachments: [],
      segmentCriteria: [],
      stopConditions: [],
      targetAudience: ['Prospects'],
    });
    if (dto.templateId && !dto.htmlBody) await this.fillFromTemplate(orgId, c, dto.templateId);
    this.applyDto(c, dto);
    if (!c.footerAddress) c.footerAddress = await this.orgAddress(orgId);
    const saved = await this.repo.save(c);
    return this.view(saved);
  }

  async update(orgId: string, id: string, dto: Record<string, any>, actor: CampaignActor) {
    const c = await this.findOne(orgId, id);
    if (c.status === 'Completed') throw new BadRequestException('Completed campaigns cannot be edited — duplicate it instead');
    this.applyDto(c, dto);
    c.updatedBy = actor.id || null;
    if (c.status === 'Active') {
      this.assertSendable(c);
      this.planNextRun(c, false);
    }
    return this.view(await this.repo.save(c));
  }

  async remove(orgId: string, id: string) {
    const c = await this.findOne(orgId, id);
    if (c.status === 'Active') throw new BadRequestException('Pause the campaign before deleting it');
    await this.recipientRepo.delete({ campaignId: c.id });
    await this.repo.remove(c);
    return { deleted: true };
  }

  async duplicate(orgId: string, id: string, actor: CampaignActor) {
    const src = await this.findOne(orgId, id);
    const copy = this.repo.create({
      ...src,
      id: undefined,
      campaignNo: undefined,
      name: `${src.name} (Copy)`.slice(0, 255),
      status: 'Draft',
      createdBy: actor.id || null,
      createdByName: actor.name || null,
      updatedBy: actor.id || null,
      nextRunAt: null,
      lastRunAt: null,
      triggerCheckedAt: null,
      activatedAt: null,
      completedAt: null,
      isRunning: false,
      totalSent: 0,
      deliveredCount: 0,
      failedCount: 0,
      bounceCount: 0,
      openCount: 0,
      clickCount: 0,
      unsubscribeCount: 0,
      skippedCount: 0,
      lastError: null,
      createdAt: undefined,
      updatedAt: undefined,
    } as any);
    return this.view(await this.repo.save(copy as any));
  }

  private async fillFromTemplate(orgId: string, c: EmailCampaign, templateId: string) {
    const t = await this.dataSource.getRepository(EmailTemplate).findOne({ where: { id: templateId } });
    if (!t || (t.organizationId && t.organizationId !== orgId)) throw new BadRequestException('Template not found');
    if (t.status === 'archived') throw new BadRequestException('This template is archived');
    c.subject = c.subject || t.subject;
    c.htmlBody = [t.header, bodyToHtml(t.body), t.signature].filter(Boolean).join('<br/>');
    c.footerText = c.footerText || t.footer || null;
    c.language = t.language || c.language;
  }

  private async orgAddress(orgId: string): Promise<string | null> {
    try {
      const org = await this.dataSource.getRepository(Organization).findOne({ where: { id: orgId } });
      if (!org) return null;
      return [org.name, org.address].filter(Boolean).join(', ') || null;
    } catch {
      return null;
    }
  }

  // ──────────────────────────────────────────────────────────── status ──

  private planNextRun(c: EmailCampaign, fresh: boolean) {
    const now = new Date();
    if (this.isEventMode(c)) {
      c.nextRunAt = null;
      if (fresh || !c.triggerCheckedAt) c.triggerCheckedAt = now;
      return;
    }
    if (fresh || !c.lastRunAt) {
      c.nextRunAt = c.scheduledAt && c.scheduledAt > now ? c.scheduledAt : now;
    }
  }

  async setStatus(orgId: string, id: string, status: string, actor: CampaignActor) {
    const c = await this.findOne(orgId, id);
    if (status === 'Active') {
      if (c.status === 'Completed') throw new BadRequestException('Completed campaigns cannot be re-activated — duplicate it instead');
      this.assertSendable(c);
      const fresh = c.status === 'Draft';
      c.status = 'Active';
      c.activatedAt = c.activatedAt || new Date();
      this.planNextRun(c, fresh);
      if (!fresh && !this.isEventMode(c) && !c.nextRunAt) c.nextRunAt = new Date();
    } else if (status === 'Paused') {
      if (c.status !== 'Active') throw new BadRequestException('Only active campaigns can be paused');
      c.status = 'Paused';
    } else if (status === 'Completed') {
      c.status = 'Completed';
      c.completedAt = new Date();
      c.nextRunAt = null;
    }
    c.updatedBy = actor.id || null;
    return this.view(await this.repo.save(c));
  }

  /** Manual "Send now": activates (if needed) and sends to the full audience immediately. */
  async sendNow(orgId: string, id: string, actor: CampaignActor) {
    const c = await this.findOne(orgId, id);
    if (c.status === 'Completed') throw new BadRequestException('This campaign is completed');
    this.assertSendable(c);
    if (c.status !== 'Active') {
      c.status = 'Active';
      c.activatedAt = c.activatedAt || new Date();
    }
    c.updatedBy = actor.id || null;
    c.nextRunAt = new Date();
    if (this.isEventMode(c)) c.triggerCheckedAt = c.triggerCheckedAt || new Date();
    await this.repo.save(c);
    const result = await this.runScheduled(c.id, true);
    return { ...result, campaign: await this.get(orgId, id) };
  }

  // ─────────────────────────────────────────────────────────── audience ──

  async previewAudience(orgId: string, dto: Record<string, any>) {
    const members = await this.audience.resolve(orgId, dto);
    const suppressed = await this.suppressedSet(orgId);
    const reachable = members.filter((m) => !suppressed.has(m.email));
    const byAudience: Record<string, number> = { Prospects: 0, Applicants: 0, Admitted: 0, Waitlisted: 0 };
    reachable.forEach((m) => (byAudience[m.audienceType] = (byAudience[m.audienceType] || 0) + 1));
    return {
      total: reachable.length,
      suppressed: members.length - reachable.length,
      byAudience,
      sample: reachable.slice(0, 25),
    };
  }

  private async suppressedSet(orgId: string): Promise<Set<string>> {
    const rows = await this.suppressionRepo.find({ where: { organizationId: orgId }, select: ['email'] });
    return new Set(rows.map((r) => r.email.toLowerCase()));
  }

  // ───────────────────────────────────────────────────────────── sending ──

  @Cron(CronExpression.EVERY_MINUTE)
  async tick() {
    if (this.ticking) return;
    this.ticking = true;
    try {
      // Release locks left behind by a crashed run.
      await this.repo.update({ isRunning: true, updatedAt: LessThan(new Date(Date.now() - 60 * 60_000)) }, { isRunning: false });
      const now = new Date();
      const active = await this.repo.find({ where: { status: 'Active', isRunning: false } });
      for (const c of active) {
        if (c.endAt && c.endAt <= now) {
          await this.repo.update(c.id, { status: 'Completed', completedAt: now, nextRunAt: null });
          continue;
        }
        if (this.isEventMode(c)) {
          const last = c.triggerCheckedAt ? c.triggerCheckedAt.getTime() : 0;
          if (Date.now() - last < EVENT_POLL_MS) continue;
          if (c.triggerEvent === 'Deadline Missed' && (!c.deadlineAt || c.deadlineAt > now)) continue;
        } else if (!c.nextRunAt || c.nextRunAt > now) {
          continue;
        }
        await this.runScheduled(c.id, false);
      }
    } catch (err: any) {
      this.logger.error(`Campaign dispatcher failed: ${err?.message}`);
    } finally {
      this.ticking = false;
    }
  }

  /** Claims the campaign, resolves the audience for this run and sends. */
  private async runScheduled(id: string, manual: boolean) {
    const claim = await this.repo
      .createQueryBuilder()
      .update(EmailCampaign)
      .set({ isRunning: true })
      .where('id = :id AND is_running = false', { id })
      .execute();
    if (!claim.affected) return { sent: 0, skipped: 0, failed: 0, message: 'Campaign is already sending' };

    const c = await this.repo.findOneOrFail({ where: { id } });
    const runStartedAt = new Date();
    let result = { sent: 0, skipped: 0, failed: 0, bounced: 0, audience: 0 };
    try {
      const ev: AudienceEventFilter = {};
      const eventMode = this.isEventMode(c) && !manual;
      if (eventMode) {
        const since = c.triggerCheckedAt || c.activatedAt || runStartedAt;
        if (c.triggerEvent === 'Signup') ev.createdAfter = since;
        else if (c.triggerEvent === 'Form Submission') ev.submittedAfter = since;
        else if (c.triggerEvent === 'Deadline Missed') ev.incompleteOnly = true;
      }
      const members = await this.audience.resolve(c.organizationId, c, ev, MAX_PER_RUN);
      result = { ...(await this.sendToMembers(c, members)), audience: members.length };

      const patch: Partial<EmailCampaign> = { lastRunAt: runStartedAt, lastError: null };
      if (eventMode) {
        patch.triggerCheckedAt = runStartedAt;
        if (c.triggerEvent === 'Deadline Missed') {
          patch.status = 'Completed';
          patch.completedAt = new Date();
        }
      } else if (!manual || !this.isEventMode(c)) {
        const freq = c.frequency;
        if (freq === 'Daily' || freq === 'Weekly') {
          const step = freq === 'Daily' ? DAY : 7 * DAY;
          let next = (c.nextRunAt || runStartedAt).getTime() + step;
          while (next <= Date.now()) next += step;
          patch.nextRunAt = new Date(next);
          if (c.endAt && patch.nextRunAt > c.endAt) {
            patch.status = 'Completed';
            patch.completedAt = new Date();
            patch.nextRunAt = null;
          }
        } else if (!this.isEventMode(c)) {
          patch.status = 'Completed';
          patch.completedAt = new Date();
          patch.nextRunAt = null;
        }
      }
      await this.repo.update(c.id, patch);
      if (result.sent + result.failed > 0) {
        await this.notifications.notify({
          organizationId: c.organizationId,
          recipientUserId: c.createdBy,
          module: 'communications',
          type: 'email_campaign_run',
          severity: result.failed > 0 ? 'warning' : 'success',
          title: `Campaign "${c.name}" sent to ${result.sent} recipient(s)`,
          body: result.failed ? `${result.failed} failed, ${result.bounced} bounced.` : null,
          link: `/organization/email-campaigns/${c.id}`,
          relatedEntityId: c.id,
        });
      }
    } catch (err: any) {
      this.logger.error(`Campaign ${c.id} run failed: ${err?.message}`);
      await this.repo.update(c.id, { lastError: String(err?.message || err).slice(0, 1000) });
    } finally {
      await this.repo.update(c.id, { isRunning: false });
    }
    return result;
  }

  private async sendToMembers(c: EmailCampaign, members: AudienceMember[]) {
    const out = { sent: 0, skipped: 0, failed: 0, bounced: 0 };
    if (!members.length) return out;
    const suppressed = await this.suppressedSet(c.organizationId);
    const existing = await this.recipientRepo.find({ where: { campaignId: c.id, email: In(members.map((m) => m.email)) } });
    const byEmail = new Map(existing.map((r) => [r.email, r]));
    const orgName = await this.orgAddress(c.organizationId);
    const max = Math.max(1, c.maxSendsPerRecipient || 1);

    for (const m of members) {
      let rec = byEmail.get(m.email);
      if (suppressed.has(m.email) || rec?.unsubscribedAt || rec?.status === 'Bounced') {
        out.skipped++;
        continue;
      }
      if (rec && rec.sendCount >= max) continue; // limit reached — not counted as skipped
      const stop = await this.audience.stopReason(m.applicationId, m.leadId, c.stopConditions || []);
      if (stop) {
        if (rec) await this.recipientRepo.update(rec.id, { status: 'Stopped', stoppedReason: stop });
        out.skipped++;
        continue;
      }
      if (!rec) {
        rec = await this.recipientRepo.save(
          this.recipientRepo.create({
            campaignId: c.id,
            organizationId: c.organizationId,
            applicationId: m.applicationId,
            leadId: m.leadId,
            applicationNo: m.applicationNo,
            audienceType: m.audienceType,
            email: m.email,
            name: m.name,
            status: 'Pending',
          }),
        );
      }
      const r = await this.deliver(c, rec, m, orgName);
      if (r.ok) out.sent++;
      else {
        out.failed++;
        if (r.bounced) out.bounced++;
      }
    }
    if (out.skipped) await this.repo.increment({ id: c.id }, 'skippedCount', out.skipped);
    return out;
  }

  private trackingBase() {
    return `${publicApiBase()}/email-campaigns/public`;
  }

  /** Renders personalised HTML with tracked links, open pixel and the unsubscribe footer. */
  render(c: EmailCampaign, m: Partial<AudienceMember>, token: string, institution?: string | null) {
    const ctx = {
      name: m.name,
      firstName: m.firstName,
      program: m.program || c.targetProgram,
      applicationNo: m.applicationNo,
      email: m.email,
      institution,
    };
    const base = this.trackingBase();
    const unsubscribeUrl = `${base}/u/${token}`;
    const subject = renderMergeFields(c.subject, ctx);
    const preHeader = renderMergeFields(c.preHeader, ctx);
    let body = bodyToHtml(renderMergeFields(c.htmlBody || c.textBody || '', ctx));
    body = body.replace(/href\s*=\s*(["'])(https?:\/\/[^"']+)\1/gi, (_m, q, url) => {
      const tracked = `${base}/c/${token}?u=${encodeURIComponent(url.replace(/&amp;/g, '&'))}`;
      return `href=${q}${tracked}${q}`;
    });
    const footerParts = [
      c.footerText ? `<div>${bodyToHtml(renderMergeFields(c.footerText, ctx))}</div>` : '',
      c.footerAddress ? `<div style="margin-top:6px;">${escapeHtml(c.footerAddress)}</div>` : '',
      `<div style="margin-top:8px;">You are receiving this email because you enquired or applied with us. <a href="${unsubscribeUrl}" style="color:#64748b;text-decoration:underline;">Unsubscribe</a></div>`,
    ].join('');
    const html = `
      ${preHeader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preHeader)}</div>` : ''}
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:640px;margin:0 auto;color:#1e293b;line-height:1.6;font-size:14px;">
        <div>${body}</div>
        <div style="border-top:1px solid #e2e8f0;margin-top:28px;padding-top:12px;font-size:12px;color:#64748b;">${footerParts}</div>
      </div>
      <img src="${base}/o/${token}.gif" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;" />`;
    const textSource = c.textBody ? renderMergeFields(c.textBody, ctx) : htmlToText(body);
    const text = [textSource, '', c.footerAddress || '', `Unsubscribe: ${unsubscribeUrl}`].filter((x) => x !== null).join('\n');
    return { subject, html, text, unsubscribeUrl };
  }

  private async deliver(c: EmailCampaign, rec: EmailCampaignRecipient, m: AudienceMember, institution: string | null) {
    const { subject, html, text, unsubscribeUrl } = this.render(c, m, rec.id, institution);
    const res = await sendOrgEmail(this.mailer, {
      organizationId: c.organizationId,
      to: m.email,
      subject,
      html,
      text,
      fromName: c.senderName,
      attachments: c.attachments || [],
      headers: {
        'List-Unsubscribe': `<${unsubscribeUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    });
    const now = new Date();
    let log: CommunicationLog | null = null;
    try {
      log = await this.commRepo.save(
        this.commRepo.create({
          organizationId: c.organizationId,
          applicationId: m.applicationId,
          leadId: m.leadId,
          applicationNo: m.applicationNo,
          applicantName: m.name,
          recipientEmail: m.email,
          channel: 'Email',
          direction: 'Outbound',
          relatedRecordId: rec.id,
          relatedRecordType: 'email_campaign',
          category: `Campaign: ${c.name}`.slice(0, 150),
          subject: subject.slice(0, 500) || c.name,
          summary: text.replace(/\s+/g, ' ').slice(0, 200),
          content: html,
          attachments: c.attachments || [],
          sender: c.senderName || 'Email Campaign',
          handledBy: 'System',
          status: res.ok ? 'Sent' : 'Failed',
          failureReason: res.ok ? null : res.error || 'Send failed',
          messageId: res.messageId || null,
        }),
      );
    } catch (err: any) {
      this.logger.warn(`Could not write communication log: ${err?.message}`);
    }

    const patch: Partial<EmailCampaignRecipient> = {
      sendCount: rec.sendCount + 1,
      lastSentAt: now,
      lastMessageId: res.messageId || null,
      communicationLogId: log?.id || rec.communicationLogId,
    };
    if (res.ok) {
      patch.status = rec.firstOpenedAt ? rec.status : 'Delivered';
      patch.deliveredAt = now;
      patch.failureReason = null;
      await this.repo.increment({ id: c.id }, 'totalSent', 1);
      await this.repo.increment({ id: c.id }, 'deliveredCount', 1);
    } else if (res.bounced) {
      patch.status = 'Bounced';
      patch.bouncedAt = now;
      patch.failureReason = res.error || 'Bounced';
      await this.repo.increment({ id: c.id }, 'totalSent', 1);
      await this.repo.increment({ id: c.id }, 'bounceCount', 1);
      await this.addSuppressionRow(c.organizationId, m.email, 'Hard Bounce', c.id, res.error || null);
    } else {
      patch.status = 'Failed';
      patch.failureReason = res.error || 'Send failed';
      await this.repo.increment({ id: c.id }, 'failedCount', 1);
    }
    await this.recipientRepo.update(rec.id, patch);
    return res;
  }

  async sendTest(orgId: string, id: string, to: string) {
    const c = await this.findOne(orgId, id);
    if (!c.subject?.trim()) throw new BadRequestException('Add a subject line first');
    const sample: Partial<AudienceMember> = {
      name: 'Aarav Sharma',
      firstName: 'Aarav',
      program: c.targetProgram || 'Sample Program',
      applicationNo: 'APP-TEST-0001',
      email: to,
    };
    const { subject, html, text } = this.render(c, sample, 'test-preview', await this.orgAddress(orgId));
    const res = await sendOrgEmail(this.mailer, {
      organizationId: orgId,
      to,
      subject: `[TEST] ${subject}`,
      html,
      text,
      fromName: c.senderName,
      attachments: c.attachments || [],
    });
    if (!res.ok) throw new BadRequestException(res.error || 'Test email could not be sent');
    return { sent: true, to };
  }

  /** Personalised preview (no tracking side effects). */
  async preview(orgId: string, id: string) {
    const c = await this.findOne(orgId, id);
    return this.render(
      c,
      { name: 'Aarav Sharma', firstName: 'Aarav', program: c.targetProgram || 'Sample Program', applicationNo: 'APP-2026-00123' },
      'preview',
      await this.orgAddress(orgId),
    );
  }

  // ───────────────────────────────────────────────────────────── stats ──

  async stats(orgId: string, id: string, q: Record<string, any>) {
    const c = await this.findOne(orgId, id);
    const page = Math.max(1, Number(q.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(q.limit) || 25));
    const qb = this.recipientRepo.createQueryBuilder('r').where('r.campaign_id = :id', { id: c.id });
    if (q.status && q.status !== 'all') {
      if (q.status === 'Opened') qb.andWhere('r.first_opened_at IS NOT NULL');
      else if (q.status === 'Clicked') qb.andWhere('r.first_clicked_at IS NOT NULL');
      else if (q.status === 'Unsubscribed') qb.andWhere('r.unsubscribed_at IS NOT NULL');
      else qb.andWhere('r.status = :st', { st: q.status });
    }
    if (q.search) {
      const s = `%${String(q.search).toLowerCase()}%`;
      qb.andWhere(new Brackets((b) => b.where('r.email LIKE :s', { s }).orWhere('LOWER(r.name) LIKE :s', { s })));
    }
    qb.orderBy('r.last_sent_at', 'DESC', 'NULLS LAST').skip((page - 1) * limit).take(limit);
    const [recipients, total] = await qb.getManyAndCount();

    const breakdown = await this.recipientRepo
      .createQueryBuilder('r')
      .select('r.status', 'status')
      .addSelect('COUNT(*)::int', 'count')
      .where('r.campaign_id = :id', { id: c.id })
      .groupBy('r.status')
      .getRawMany();

    const daily = await this.recipientRepo
      .createQueryBuilder('r')
      .select("TO_CHAR(DATE_TRUNC('day', r.last_sent_at), 'YYYY-MM-DD')", 'day')
      .addSelect('COUNT(*)::int', 'sent')
      .addSelect('SUM(CASE WHEN r.first_opened_at IS NOT NULL THEN 1 ELSE 0 END)::int', 'opened')
      .addSelect('SUM(CASE WHEN r.first_clicked_at IS NOT NULL THEN 1 ELSE 0 END)::int', 'clicked')
      .where('r.campaign_id = :id AND r.last_sent_at IS NOT NULL', { id: c.id })
      .groupBy('day')
      .orderBy('day', 'ASC')
      .getRawMany();

    return {
      campaign: this.view(c),
      breakdown: breakdown.reduce((acc: Record<string, number>, r: any) => ({ ...acc, [r.status]: Number(r.count) }), {}),
      daily,
      recipients: { data: recipients, total, page, limit },
    };
  }

  // ────────────────────────────────────────────── public tracking events ──

  private async recipientByToken(token: string): Promise<EmailCampaignRecipient | null> {
    if (!/^[0-9a-f-]{36}$/i.test(token || '')) return null;
    return this.recipientRepo.findOne({ where: { id: token } });
  }

  async recordOpen(token: string) {
    try {
      const rec = await this.recipientByToken(token);
      if (!rec) return;
      const first = !rec.firstOpenedAt;
      await this.recipientRepo.update(rec.id, {
        openCount: rec.openCount + 1,
        firstOpenedAt: rec.firstOpenedAt || new Date(),
        status: ['Delivered', 'Sent'].includes(rec.status) ? 'Opened' : rec.status,
      });
      if (first) {
        await this.repo.increment({ id: rec.campaignId }, 'openCount', 1);
        if (rec.communicationLogId) await this.commRepo.update(rec.communicationLogId, { status: 'Opened' });
      }
    } catch (err: any) {
      this.logger.warn(`Open tracking failed: ${err?.message}`);
    }
  }

  /** Records a click and returns the destination (only http/https). */
  async recordClick(token: string, url: string): Promise<string | null> {
    let target: URL | null = null;
    try {
      target = new URL(url);
      if (!['http:', 'https:'].includes(target.protocol)) target = null;
    } catch {
      target = null;
    }
    if (!target) return null;
    try {
      const rec = await this.recipientByToken(token);
      if (rec) {
        const firstClick = !rec.firstClickedAt;
        const firstOpen = !rec.firstOpenedAt;
        await this.recipientRepo.update(rec.id, {
          clickCount: rec.clickCount + 1,
          firstClickedAt: rec.firstClickedAt || new Date(),
          firstOpenedAt: rec.firstOpenedAt || new Date(),
          openCount: rec.openCount || 1,
          status: ['Delivered', 'Sent', 'Opened'].includes(rec.status) ? 'Clicked' : rec.status,
        });
        if (firstClick) await this.repo.increment({ id: rec.campaignId }, 'clickCount', 1);
        if (firstOpen) await this.repo.increment({ id: rec.campaignId }, 'openCount', 1);
        if (rec.communicationLogId) await this.commRepo.update(rec.communicationLogId, { status: 'Clicked' });
      }
    } catch (err: any) {
      this.logger.warn(`Click tracking failed: ${err?.message}`);
    }
    return target.toString();
  }

  async unsubscribe(token: string): Promise<{ ok: boolean; email?: string; organization?: string | null }> {
    const rec = await this.recipientByToken(token);
    if (!rec) return { ok: false };
    if (!rec.unsubscribedAt) {
      await this.recipientRepo.update(rec.id, { unsubscribedAt: new Date(), status: 'Unsubscribed' });
      await this.repo.increment({ id: rec.campaignId }, 'unsubscribeCount', 1);
      await this.addSuppressionRow(rec.organizationId, rec.email, 'Unsubscribed', rec.campaignId, null);
      try {
        await this.commRepo.save(
          this.commRepo.create({
            organizationId: rec.organizationId,
            applicationId: rec.applicationId,
            leadId: rec.leadId,
            applicationNo: rec.applicationNo,
            applicantName: rec.name,
            recipientEmail: rec.email,
            channel: 'Email',
            direction: 'Inbound',
            relatedRecordId: rec.id,
            relatedRecordType: 'email_campaign',
            category: 'Unsubscribe',
            subject: 'Unsubscribed from emails',
            summary: 'The recipient used the unsubscribe link in a campaign email.',
            content: 'The recipient used the unsubscribe link in a campaign email.',
            handledBy: 'System',
            status: 'Sent',
            actionTaken: 'Added to suppression list',
          }),
        );
      } catch {
        // timeline entry is best-effort
      }
    }
    const org = await this.orgAddress(rec.organizationId);
    return { ok: true, email: rec.email, organization: org };
  }

  // ──────────────────────────────────────────────────── suppression list ──

  private async addSuppressionRow(orgId: string, email: string, reason: string, campaignId: string | null, note: string | null) {
    const e = email.trim().toLowerCase();
    const existing = await this.suppressionRepo.findOne({ where: { organizationId: orgId, email: e } });
    if (existing) return existing;
    try {
      return await this.suppressionRepo.save(this.suppressionRepo.create({ organizationId: orgId, email: e, reason, campaignId, note }));
    } catch {
      return null;
    }
  }

  async listSuppressions(orgId: string, q: Record<string, any>) {
    const page = Math.max(1, Number(q.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(q.limit) || 25));
    const qb = this.suppressionRepo.createQueryBuilder('s').where('s.organization_id = :orgId', { orgId });
    if (q.reason && q.reason !== 'all') qb.andWhere('s.reason = :r', { r: q.reason });
    if (q.search) qb.andWhere('s.email LIKE :s', { s: `%${String(q.search).toLowerCase()}%` });
    qb.orderBy('s.created_at', 'DESC').skip((page - 1) * limit).take(limit);
    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  async addSuppression(orgId: string, dto: { email: string; reason?: string; note?: string }) {
    const row = await this.addSuppressionRow(orgId, dto.email, dto.reason || 'Manual', null, dto.note || null);
    if (!row) throw new BadRequestException('Could not add the address');
    return row;
  }

  async removeSuppression(orgId: string, id: string) {
    const row = await this.suppressionRepo.findOne({ where: { id, organizationId: orgId } });
    if (!row) throw new NotFoundException('Entry not found');
    await this.suppressionRepo.remove(row);
    await this.recipientRepo
      .createQueryBuilder()
      .update(EmailCampaignRecipient)
      .set({ unsubscribedAt: null, status: 'Pending' })
      .where('organization_id = :orgId AND email = :email AND status IN (:...st)', {
        orgId,
        email: row.email,
        st: ['Unsubscribed', 'Bounced'],
      })
      .execute();
    return { deleted: true };
  }
}
