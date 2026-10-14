import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { In, LessThanOrEqual, Not, Repository } from 'typeorm';
import * as crypto from 'crypto';
import { Reminder, REMINDER_CHANNELS } from './entities/reminder.entity.js';
import { ReminderRule, REMINDER_SCENARIOS, ReminderScenario } from './entities/reminder-rule.entity.js';
import { Application } from '../applications/entities/application.entity.js';
import { EmailTemplate } from '../email-templates/entities/email-template.entity.js';
import { ApplicationDocument } from '../documents/entities/application-document.entity.js';
import { ApplicationStatusService, RequestUser } from '../applications/application-status.service.js';
import { InAppNotificationsService } from '../in-app-notifications/in-app-notifications.service.js';
import { MessagingService } from '../messaging/messaging.service.js';
import { MailerService } from '../notifications/mailer.service.js';
import { FINAL_STAGES } from '../applications/application-workflow.constants.js';

const SCENARIOS = Object.keys(REMINDER_SCENARIOS) as ReminderScenario[];

const DEFAULT_RULES: Record<ReminderScenario, Partial<ReminderRule>> = {
  fee_not_paid: { channels: ['Email', 'SMS', 'In-app'], firstReminderAfterHours: 24, frequencyHours: 48, maxAttempts: 3 },
  documents_missing: { channels: ['Email', 'In-app'], firstReminderAfterHours: 24, frequencyHours: 48, maxAttempts: 3 },
  documents_rejected: { channels: ['Email', 'WhatsApp', 'In-app'], firstReminderAfterHours: 0, frequencyHours: 48, maxAttempts: 3 },
  deadline_approaching: { channels: ['Email', 'SMS', 'In-app'], firstReminderAfterHours: 0, frequencyHours: 72, maxAttempts: 3, deadlineDaysBefore: 7 },
};

const DEFAULT_TEXT: Record<ReminderScenario, { subject: string; body: string }> = {
  fee_not_paid: {
    subject: 'Complete your application {application_no} — fee pending',
    body: 'Dear {name}, your application {application_no} for {course} is waiting for the application fee. Pay now to continue: {portal_link}',
  },
  documents_missing: {
    subject: 'Upload your documents for application {application_no}',
    body: 'Dear {name}, thank you for paying the fee. Please upload the remaining documents ({missing_documents}) for application {application_no}: {portal_link}',
  },
  documents_rejected: {
    subject: 'Re-upload required for application {application_no}',
    body: 'Dear {name}, the following documents need to be uploaded again: {rejected_documents}. Reason: {reason}. Upload them here: {portal_link}',
  },
  deadline_approaching: {
    subject: 'Deadline approaching for application {application_no}',
    body: 'Dear {name}, the application deadline is {deadline}. Complete the pending steps of application {application_no} before then: {portal_link}',
  },
};

interface Condition {
  applies: boolean;
  triggeredAt: Date;
  vars: Record<string, string>;
}

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);
  private running = false;

  constructor(
    @InjectRepository(Reminder) private readonly reminderRepo: Repository<Reminder>,
    @InjectRepository(ReminderRule) private readonly ruleRepo: Repository<ReminderRule>,
    @InjectRepository(Application) private readonly appRepo: Repository<Application>,
    @InjectRepository(EmailTemplate) private readonly templateRepo: Repository<EmailTemplate>,
    @InjectRepository(ApplicationDocument) private readonly docRepo: Repository<ApplicationDocument>,
    private readonly statusService: ApplicationStatusService,
    private readonly inApp: InAppNotificationsService,
    private readonly messaging: MessagingService,
    private readonly mailer: MailerService,
    private readonly config: ConfigService,
  ) {}

  // ===========================================================================
  // RULES (settings page)
  // ===========================================================================

  async getRules(orgId: string): Promise<(ReminderRule & { label: string; reminderType: string; triggerEvent: string })[]> {
    const existing = await this.ruleRepo.find({ where: { organizationId: orgId } });
    const out: any[] = [];
    for (const scenario of SCENARIOS) {
      let rule = existing.find((r) => r.scenario === scenario);
      if (!rule) {
        rule = await this.ruleRepo.save(
          this.ruleRepo.create({ organizationId: orgId, scenario, isEnabled: true, autoClose: true, ...DEFAULT_RULES[scenario] }),
        );
      }
      out.push({ ...rule, ...REMINDER_SCENARIOS[scenario] });
    }
    return out;
  }

  async updateRule(orgId: string, scenario: string, dto: Partial<ReminderRule>) {
    if (!SCENARIOS.includes(scenario as ReminderScenario)) throw new BadRequestException('Unknown reminder scenario');
    await this.getRules(orgId);
    const rule = await this.ruleRepo.findOne({ where: { organizationId: orgId, scenario } });
    if (!rule) throw new NotFoundException('Rule not found');
    if (dto.channels !== undefined) {
      const ch = (dto.channels || []).filter((c) => (REMINDER_CHANNELS as readonly string[]).includes(c));
      if (ch.length === 0) throw new BadRequestException('Select at least one channel');
      rule.channels = ch;
    }
    if (dto.isEnabled !== undefined) rule.isEnabled = !!dto.isEnabled;
    if (dto.autoClose !== undefined) rule.autoClose = !!dto.autoClose;
    if (dto.templateId !== undefined) {
      if (dto.templateId) {
        const t = await this.templateRepo.findOne({ where: { id: dto.templateId } });
        if (!t || (t.organizationId && t.organizationId !== orgId)) throw new BadRequestException('Template not found');
      }
      rule.templateId = dto.templateId || null;
    }
    if (dto.firstReminderAfterHours !== undefined) rule.firstReminderAfterHours = Math.max(0, Math.round(Number(dto.firstReminderAfterHours)));
    if (dto.frequencyHours !== undefined) {
      const f = Math.round(Number(dto.frequencyHours));
      if (!(f >= 1)) throw new BadRequestException('Frequency must be at least 1 hour');
      rule.frequencyHours = f;
    }
    if (dto.maxAttempts !== undefined) {
      const m = Math.round(Number(dto.maxAttempts));
      if (!(m >= 1 && m <= 20)) throw new BadRequestException('Attempts must be between 1 and 20');
      rule.maxAttempts = m;
    }
    if (dto.deadlineDate !== undefined) rule.deadlineDate = dto.deadlineDate || null;
    if (dto.deadlineDaysBefore !== undefined) rule.deadlineDaysBefore = Math.max(0, Math.round(Number(dto.deadlineDaysBefore)));
    const saved = await this.ruleRepo.save(rule);
    return { ...saved, ...REMINDER_SCENARIOS[scenario as ReminderScenario] };
  }

  async templates(orgId: string) {
    const rows = await this.templateRepo
      .createQueryBuilder('t')
      .where('(t.organization_id = :orgId OR t.organization_id IS NULL)', { orgId })
      .andWhere("t.status = 'active'")
      .orderBy('t.name', 'ASC')
      .getMany();
    return rows.map((t) => ({ id: t.id, name: t.name, channel: t.channel, subject: t.subject, category: t.category }));
  }

  // ===========================================================================
  // ENGINE
  // ===========================================================================

  private portalLink() {
    const base = this.config.get<string>('STUDENT_PORTAL_URL') || this.config.get<string>('FRONTEND_URL') || 'http://localhost:3001';
    return `${base.replace(/\/$/, '')}/my-application`;
  }

  private apiBase() {
    const base = this.config.get<string>('API_PUBLIC_URL') || `http://localhost:${this.config.get('PORT') || 3000}/api`;
    return base.replace(/\/$/, '');
  }

  unsubscribeToken(applicationId: string) {
    const secret = this.config.get<string>('JWT_SECRET') || 'reminders';
    return crypto.createHmac('sha256', secret).update(`unsubscribe:${applicationId}`).digest('hex').slice(0, 32);
  }

  private async evaluateCondition(app: Application, rule: ReminderRule): Promise<Condition> {
    const scenario = rule.scenario as ReminderScenario;
    const base = {
      name: app.name || 'Applicant',
      application_no: app.applicationNo,
      course: app.program || '',
      academic_session: app.academicSession || '',
      portal_link: this.portalLink(),
    };
    const stage = app.currentStage || 'Application Started';
    const final = FINAL_STAGES.includes(stage) || ['rejected', 'accepted'].includes((app.formStatus || '').toLowerCase());
    const paid = ['success', 'paid'].includes((app.paymentStatus || '').toLowerCase());
    const no = (): Condition => ({ applies: false, triggeredAt: new Date(), vars: base });
    if (final) return no();

    if (scenario === 'fee_not_paid') {
      return { applies: !paid, triggeredAt: app.createdAt, vars: base };
    }
    const docs = await this.statusService.documentProgress(app);
    if (scenario === 'documents_missing') {
      const missing = docs.missing.filter((t) => !docs.rejected.includes(t));
      return {
        applies: paid && missing.length > 0,
        triggeredAt: app.paymentDate || app.stageUpdatedAt || app.updatedAt,
        vars: { ...base, missing_documents: missing.join(', ') },
      };
    }
    if (scenario === 'documents_rejected') {
      const latest = await this.docRepo.find({ where: { applicationId: app.id, isLatest: true } });
      const rejected = latest.filter((d) => d.reuploadRequired || d.verificationStatus === 'Rejected');
      const when = rejected.reduce<Date | null>((m, d) => (!m || (d.verificationDate && d.verificationDate > m) ? d.verificationDate : m), null);
      return {
        applies: rejected.length > 0,
        triggeredAt: when || new Date(),
        vars: {
          ...base,
          rejected_documents: rejected.map((d) => d.documentType).join(', '),
          reason: rejected.map((d) => `${d.documentType}: ${d.rejectionReason || 're-upload requested'}`).join('; '),
        },
      };
    }
    // deadline_approaching
    if (!rule.deadlineDate) return no();
    const deadline = new Date(`${rule.deadlineDate}T23:59:59`);
    const start = new Date(deadline.getTime() - rule.deadlineDaysBefore * 86400000);
    const now = new Date();
    const incomplete = !paid || docs.missing.length > 0 || !['submitted', 'under_review'].includes((app.formStatus || '').toLowerCase());
    return {
      applies: incomplete && now >= start && now <= deadline,
      triggeredAt: start,
      vars: { ...base, deadline: deadline.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) },
    };
  }

  /** Create / close reminder records for one application against the given rules. */
  private async syncApplication(app: Application, rules: ReminderRule[]) {
    const open = await this.reminderRepo.find({ where: { applicationId: app.id, isClosed: false } });
    for (const rule of rules) {
      const cond = await this.evaluateCondition(app, rule);
      const current = open.find((r) => r.scenario === rule.scenario);
      if (cond.applies && rule.isEnabled) {
        if (!current) {
          const def = REMINDER_SCENARIOS[rule.scenario as ReminderScenario];
          const template = rule.templateId ? await this.templateRepo.findOne({ where: { id: rule.templateId } }) : null;
          const first = new Date(Math.max(Date.now(), cond.triggeredAt.getTime() + rule.firstReminderAfterHours * 3600000));
          await this.reminderRepo.save(
            this.reminderRepo.create({
              organizationId: app.organizationId,
              applicationId: app.id,
              scenario: rule.scenario,
              reminderType: def.reminderType,
              triggerEvent: def.triggerEvent,
              reminderChannels: rule.channels,
              reminderTemplateId: template?.id ?? null,
              reminderTemplateName: template?.name ?? null,
              attemptCount: 0,
              nextScheduledDate: first,
              applicantResponse: 'No Action',
              autoClose: rule.autoClose,
              isClosed: false,
            }),
          );
        }
      } else if (current && !cond.applies) {
        // The applicant completed the step.
        current.applicantResponse = 'Completed';
        current.nextScheduledDate = null;
        if (current.autoClose) {
          current.isClosed = true;
          current.closedAt = new Date();
        }
        await this.reminderRepo.save(current);
      } else if (current && !rule.isEnabled) {
        current.nextScheduledDate = null;
        await this.reminderRepo.save(current);
      }
    }
  }

  private render(text: string, vars: Record<string, string>) {
    return (text || '').replace(/\{([a-zA-Z0-9_-]+)\}/g, (m, k) => {
      const v = vars[k.toLowerCase()];
      return v !== undefined && v !== null && v !== '' ? String(v) : m;
    });
  }

  private stripHtml(html: string) {
    return html.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  }

  /** Sends one attempt of a reminder over its channels. */
  async sendReminder(reminder: Reminder, force = false): Promise<Reminder> {
    const app = await this.appRepo.findOne({ where: { id: reminder.applicationId } });
    if (!app) {
      reminder.isClosed = true;
      reminder.closedAt = new Date();
      return this.reminderRepo.save(reminder);
    }
    const rule = await this.ruleRepo.findOne({ where: { organizationId: reminder.organizationId, scenario: reminder.scenario } });
    if (!rule) return reminder;
    const cond = await this.evaluateCondition(app, rule);
    if (!cond.applies) {
      reminder.applicantResponse = 'Completed';
      reminder.nextScheduledDate = null;
      if (reminder.autoClose) {
        reminder.isClosed = true;
        reminder.closedAt = new Date();
      }
      return this.reminderRepo.save(reminder);
    }

    // Opt-in / opt-out compliance.
    const optedOut = (app.reminderOptOutChannels || []).map((c) => c.toLowerCase());
    const channels = app.remindersOptIn === false ? [] : reminder.reminderChannels.filter((c) => !optedOut.includes(c.toLowerCase()));

    const template = reminder.reminderTemplateId ? await this.templateRepo.findOne({ where: { id: reminder.reminderTemplateId } }) : null;
    const def = DEFAULT_TEXT[reminder.scenario as ReminderScenario] || DEFAULT_TEXT.fee_not_paid;
    const subject = this.render(template?.subject || def.subject, cond.vars);
    const bodyRaw = this.render(template?.body || def.body, cond.vars);
    const plain = this.stripHtml(bodyRaw);
    const unsubscribe = `${this.apiBase()}/reminders/unsubscribe?a=${app.id}&t=${this.unsubscribeToken(app.id)}`;

    const results: Record<string, { success: boolean; error?: string; at: string }> = {};
    const at = () => new Date().toISOString();
    for (const channel of channels) {
      try {
        if (channel === 'Email') {
          if (!app.email) {
            results[channel] = { success: false, error: 'No e-mail address', at: at() };
            continue;
          }
          const html = `${template ? bodyRaw : `<p>${plain.replace(/\n/g, '<br/>')}</p>`}
            <p style="font-size:11px;color:#6b7280;margin-top:24px;">You receive this because your application is incomplete.
            <a href="${unsubscribe}">Stop reminders</a></p>`;
          const ok = await this.mailer.sendMail({ to: app.email, subject, html, text: `${plain}\n\nStop reminders: ${unsubscribe}`, organizationId: app.organizationId });
          results[channel] = ok ? { success: true, at: at() } : { success: false, error: 'E-mail could not be sent', at: at() };
        } else if (channel === 'SMS' || channel === 'WhatsApp') {
          if (!app.primaryMobile) {
            results[channel] = { success: false, error: 'No mobile number', at: at() };
            continue;
          }
          const r = await this.messaging.send({
            organizationId: app.organizationId,
            channel: channel === 'SMS' ? 'sms' : 'whatsapp',
            to: app.primaryMobile,
            body: plain,
            messageType: 'Reminder',
            templateId: reminder.reminderTemplateId,
            ctaLink: cond.vars.portal_link,
            recipientName: app.name,
            applicationId: app.id,
            triggerEvent: reminder.scenario,
            priority: 'Normal',
          });
          results[channel] = r.success ? { success: true, at: at() } : { success: false, error: r.error || 'Not sent', at: at() };
        } else if (channel === 'In-app') {
          const userId = await this.statusService.findStudentUserId(app);
          if (!userId) {
            results[channel] = { success: false, error: 'Applicant has no portal account', at: at() };
            continue;
          }
          const n = await this.inApp.notify({
            organizationId: app.organizationId,
            recipientUserId: userId,
            module: 'applications',
            type: `reminder_${reminder.scenario}`,
            severity: 'warning',
            title: subject,
            body: plain,
            link: '/my-application',
            relatedEntityId: app.id,
            metadata: { reminderId: reminder.id },
          });
          results[channel] = n ? { success: true, at: at() } : { success: false, error: 'Notification failed', at: at() };
        }
      } catch (e) {
        results[channel] = { success: false, error: (e as Error).message, at: at() };
      }
    }

    const anySuccess = Object.values(results).some((r) => r.success);
    reminder.attemptCount += 1;
    reminder.reminderSentDate = new Date();
    reminder.reminderStatus = anySuccess ? 'Sent' : 'Failed';
    reminder.channelResults = results;
    reminder.lastError =
      channels.length === 0
        ? 'Applicant opted out of all reminder channels'
        : anySuccess
        ? null
        : Object.entries(results).map(([c, r]) => `${c}: ${r.error}`).join('; ');
    if (reminder.attemptCount >= rule.maxAttempts && !force) {
      reminder.nextScheduledDate = null;
      reminder.applicantResponse = 'No Action';
      if (reminder.autoClose) {
        reminder.isClosed = true;
        reminder.closedAt = new Date();
      }
    } else if (reminder.attemptCount >= rule.maxAttempts) {
      reminder.nextScheduledDate = null;
    } else {
      reminder.nextScheduledDate = new Date(Date.now() + rule.frequencyHours * 3600000);
    }
    return this.reminderRepo.save(reminder);
  }

  /** Re-evaluate one application right away (status-change triggers). */
  async refreshForApplication(applicationId: string) {
    const app = await this.appRepo.findOne({ where: { id: applicationId } });
    if (!app) return;
    const rules = (await this.getRules(app.organizationId)) as ReminderRule[];
    await this.syncApplication(app, rules);
    const due = await this.reminderRepo.find({
      where: { applicationId, isClosed: false, nextScheduledDate: LessThanOrEqual(new Date()) },
    });
    for (const r of due) await this.sendReminder(r);
  }

  async runForOrganization(orgId: string) {
    const rules = (await this.getRules(orgId)) as ReminderRule[];
    const apps = await this.appRepo.find({
      where: { organizationId: orgId, currentStage: Not(In(FINAL_STAGES)) },
      take: 5000,
    });
    for (const app of apps) await this.syncApplication(app, rules);
    const due = await this.reminderRepo.find({
      where: { organizationId: orgId, isClosed: false, nextScheduledDate: LessThanOrEqual(new Date()) },
      take: 1000,
    });
    let sent = 0;
    let failed = 0;
    for (const r of due) {
      const res = await this.sendReminder(r);
      if (res.reminderStatus === 'Sent') sent++;
      else if (res.reminderStatus === 'Failed') failed++;
    }
    return { applicationsChecked: apps.length, remindersDue: due.length, sent, failed };
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  async cron() {
    if (this.running) return;
    this.running = true;
    try {
      const orgs: { organization_id: string }[] = await this.appRepo
        .createQueryBuilder('app')
        .select('DISTINCT app.organization_id', 'organization_id')
        .where('app.current_stage NOT IN (:...final)', { final: FINAL_STAGES })
        .getRawMany();
      for (const o of orgs) {
        try {
          await this.runForOrganization(o.organization_id);
        } catch (e) {
          this.logger.error(`Reminder run failed for org ${o.organization_id}: ${(e as Error).message}`);
        }
      }
    } finally {
      this.running = false;
    }
  }

  // ===========================================================================
  // QUERIES & ACTIONS
  // ===========================================================================

  private toView(r: Reminder & { application?: Application }) {
    return {
      id: r.id,
      reminderId: r.reminderNo,
      applicationId: r.applicationId,
      applicationNo: r.application?.applicationNo,
      applicantName: r.application?.name,
      scenario: r.scenario,
      scenarioLabel: REMINDER_SCENARIOS[r.scenario as ReminderScenario]?.label ?? r.scenario,
      reminderType: r.reminderType,
      triggerEvent: r.triggerEvent,
      reminderChannels: r.reminderChannels,
      reminderTemplateId: r.reminderTemplateId,
      reminderTemplate: r.reminderTemplateName,
      reminderSentDate: r.reminderSentDate,
      reminderStatus: r.reminderStatus,
      attemptCount: r.attemptCount,
      nextScheduledDate: r.nextScheduledDate,
      applicantResponse: r.applicantResponse,
      autoClose: r.autoClose,
      isClosed: r.isClosed,
      closedAt: r.closedAt,
      lastError: r.lastError,
      channelResults: r.channelResults,
      createdAt: r.createdAt,
    };
  }

  async list(orgId: string, q: any) {
    const page = Math.max(1, Number(q.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(q.limit) || 20));
    const qb = this.reminderRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.application', 'app')
      .where('r.organization_id = :orgId', { orgId });
    if (q.reminderType && q.reminderType !== 'all') qb.andWhere('r.reminder_type = :rt', { rt: q.reminderType });
    if (q.reminderStatus && q.reminderStatus !== 'all') {
      if (q.reminderStatus === 'Scheduled') qb.andWhere('r.reminder_status IS NULL');
      else qb.andWhere('r.reminder_status = :rs', { rs: q.reminderStatus });
    }
    if (q.applicantResponse && q.applicantResponse !== 'all') qb.andWhere('r.applicant_response = :ar', { ar: q.applicantResponse });
    if (q.state === 'open') qb.andWhere('r.is_closed = false');
    if (q.state === 'closed') qb.andWhere('r.is_closed = true');
    if (q.search) qb.andWhere('(app.name ILIKE :s OR app.application_no ILIKE :s)', { s: `%${q.search}%` });
    const [rows, total] = await qb.orderBy('r.updated_at', 'DESC').skip((page - 1) * limit).take(limit).getManyAndCount();

    const stats = await this.reminderRepo
      .createQueryBuilder('r')
      .select('COUNT(*)', 'total')
      .addSelect(`SUM(CASE WHEN r.reminder_status = 'Sent' THEN 1 ELSE 0 END)`, 'sent')
      .addSelect(`SUM(CASE WHEN r.reminder_status = 'Failed' THEN 1 ELSE 0 END)`, 'failed')
      .addSelect(`SUM(CASE WHEN r.applicant_response = 'Completed' THEN 1 ELSE 0 END)`, 'completed')
      .addSelect(`SUM(CASE WHEN r.is_closed = false THEN 1 ELSE 0 END)`, 'open')
      .where('r.organization_id = :orgId', { orgId })
      .getRawOne();
    return {
      items: rows.map((r) => this.toView(r)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      stats: {
        total: Number(stats?.total || 0),
        sent: Number(stats?.sent || 0),
        failed: Number(stats?.failed || 0),
        completed: Number(stats?.completed || 0),
        open: Number(stats?.open || 0),
      },
    };
  }

  async forApplication(orgId: string, appIdOrNo: string, user: RequestUser) {
    const app = await this.statusService.findApplication(appIdOrNo, orgId);
    this.statusService.assertAccess(app, user);
    const rows = await this.reminderRepo.find({ where: { applicationId: app.id }, order: { createdAt: 'DESC' } });
    return {
      preferences: { remindersOptIn: app.remindersOptIn !== false, optOutChannels: app.reminderOptOutChannels || [] },
      reminders: rows.map((r) => this.toView(r)),
    };
  }

  async updatePreferences(orgId: string, appIdOrNo: string, user: RequestUser, dto: { remindersOptIn?: boolean; optOutChannels?: string[] }) {
    const app = await this.statusService.findApplication(appIdOrNo, orgId);
    this.statusService.assertAccess(app, user);
    const patch: Partial<Application> = {};
    if (dto.remindersOptIn !== undefined) patch.remindersOptIn = !!dto.remindersOptIn;
    if (dto.optOutChannels !== undefined) {
      patch.reminderOptOutChannels = (dto.optOutChannels || []).filter((c) => (REMINDER_CHANNELS as readonly string[]).includes(c));
    }
    await this.appRepo.update({ id: app.id }, patch);
    return { remindersOptIn: patch.remindersOptIn ?? app.remindersOptIn, optOutChannels: patch.reminderOptOutChannels ?? app.reminderOptOutChannels };
  }

  async sendNow(orgId: string, id: string) {
    const r = await this.reminderRepo.findOne({ where: { id, organizationId: orgId } });
    if (!r) throw new NotFoundException('Reminder not found');
    if (r.isClosed) throw new BadRequestException('Reminder is closed');
    const res = await this.sendReminder(r, true);
    const fresh = await this.reminderRepo.findOne({ where: { id: res.id }, relations: ['application'] });
    return this.toView(fresh!);
  }

  async close(orgId: string, id: string, applicantResponse?: string) {
    const r = await this.reminderRepo.findOne({ where: { id, organizationId: orgId }, relations: ['application'] });
    if (!r) throw new NotFoundException('Reminder not found');
    r.isClosed = true;
    r.closedAt = new Date();
    r.nextScheduledDate = null;
    if (applicantResponse === 'Completed' || applicantResponse === 'No Action') r.applicantResponse = applicantResponse;
    await this.reminderRepo.save(r);
    return this.toView(r);
  }

  async unsubscribe(applicationId: string, token: string) {
    if (!applicationId || !token || token !== this.unsubscribeToken(applicationId)) return false;
    const res = await this.appRepo.update({ id: applicationId }, { remindersOptIn: false });
    return (res.affected ?? 0) > 0;
  }
}
