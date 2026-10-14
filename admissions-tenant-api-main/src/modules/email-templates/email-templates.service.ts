import {
  Injectable,
  NotFoundException,
  Logger,
  OnModuleInit,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, In } from 'typeorm';
import { EmailTemplate, DEFAULT_EDITING_ROLES } from './entities/email-template.entity.js';
import { CreateEmailTemplateDto } from './dto/create-email-template.dto.js';
import { UpdateEmailTemplateDto } from './dto/update-email-template.dto.js';
import { SendEmailTemplateDto } from './dto/send-email-template.dto.js';
import { MailerService } from '../notifications/mailer.service.js';
import { EmailTemplateCategoriesService } from '../email-template-categories/email-template-categories.service.js';
import { CommunicationsService } from '../communications/communications.service.js';
import { EmailSuppression } from '../email-campaigns/entities/email-suppression.entity.js';
import { renderMergeFields, extractMergeFields } from '../messaging/merge-fields.js';
import { buildEmailHtml, sendOrgEmail } from './email-sender.js';

export interface TemplateActor {
  id?: string | null;
  name?: string | null;
  role?: string | null;
}

const ADMIN_ROLES = ['org_admin', 'superadmin'];
const APPROVED = ['approved', 'active'];

/** Maps lifecycle category slugs onto the scope's template categories. */
const SLUG_TO_SCOPE_CATEGORY: Record<string, string> = {
  application_submitted: 'Reminder',
  fee_payment_confirmation: 'Fee',
  shortlisted: 'Interview',
  interview_gd_slot_invitation: 'Interview',
  interview_gd_reschedule: 'Interview',
  interview_gd_cancellation: 'Interview',
  results_scores_updated: 'Interview',
  offer_letter_sent: 'Offer',
  waitlisted: 'Rejection',
  waitlist_offer_conversion: 'Offer',
  enrollment_confirmed: 'Offer',
};

@Injectable()
export class EmailTemplatesService implements OnModuleInit {
  private readonly logger = new Logger(EmailTemplatesService.name);

  constructor(
    @InjectRepository(EmailTemplate)
    private readonly templateRepo: Repository<EmailTemplate>,
    @InjectRepository(EmailSuppression)
    private readonly suppressionRepo: Repository<EmailSuppression>,
    private readonly mailerService: MailerService,
    private readonly categoriesService: EmailTemplateCategoriesService,
    private readonly communicationsService: CommunicationsService,
  ) {}

  async onModuleInit() {
    await this.migrateLegacyStatuses();
    await this.seedDefaultTemplates();
  }

  /** 'active' (legacy) → 'approved' so the scope statuses Draft / Approved / Archived apply everywhere. */
  private async migrateLegacyStatuses() {
    try {
      await this.templateRepo
        .createQueryBuilder()
        .update(EmailTemplate)
        .set({ status: 'approved' })
        .where('status = :s', { s: 'active' })
        .execute();
    } catch (err: any) {
      this.logger.warn(`Template status migration skipped: ${err?.message || err}`);
    }
  }

  private extractVariables(text: string): string[] {
    const matches = (text || '').replace(/\{\{[^}]*\}\}/g, '').match(/\{([a-zA-Z0-9_-]+)\}/g) || [];
    const vars = new Set<string>();
    matches.forEach((m) => {
      vars.add(m.replace(/[\{\}]/g, '').trim().toLowerCase());
    });
    extractMergeFields(text).forEach((f) => vars.add(f));
    return Array.from(vars);
  }

  /** Renders {{Merge_Fields}} first, then legacy single-brace {variables}. */
  renderText(text: string, vars: Record<string, string | null | undefined>): string {
    const merged = renderMergeFields(text, {
      name: vars.name || vars.student,
      program: vars.course || vars.program || vars.program_offered,
      applicationNo: vars.application_no,
      date: vars.date,
      link: vars.link || vars.login_url || vars.meeting_link,
      email: vars.email,
      phone: vars.phone,
      extra: vars,
    });
    return merged.replace(/\{([a-zA-Z0-9_-]+)\}/g, (match, key) => {
      const val = vars[key.toLowerCase()];
      return val !== undefined && val !== null && val !== '' ? String(val) : match;
    });
  }

  async isSuppressed(orgId: string | null | undefined, email: string): Promise<boolean> {
    if (!orgId || !email) return false;
    try {
      const row = await this.suppressionRepo.findOne({
        where: { organizationId: orgId, email: email.trim().toLowerCase() },
      });
      return !!row;
    } catch {
      return false;
    }
  }

  private async findTemplateForCategory(
    categoryId: string,
    orgId: string | null,
  ): Promise<EmailTemplate | null> {
    if (orgId) {
      const orgTemplate = await this.templateRepo.findOne({
        where: { categoryId, organizationId: orgId, status: In(APPROVED), channel: 'Email' },
        order: { createdAt: 'ASC' },
      });
      if (orgTemplate) return orgTemplate;
    }
    return this.templateRepo.findOne({
      where: { categoryId, organizationId: IsNull(), status: In(APPROVED), channel: 'Email' },
      order: { isDefault: 'DESC', createdAt: 'ASC' },
    });
  }

  /**
   * Sends a transactional, lifecycle-triggered email using whatever template
   * is configured (via the admin's Email Templates UI) for the given
   * category slug — never hardcoded copy. Falls back to a no-op (logged,
   * not thrown) if no template/category is configured, so a missing
   * template never blocks the calling business flow (application submit,
   * payment capture, etc). Every attempt is recorded in communication_logs
   * so it shows up in that application's Conversation History.
   */
  async sendTransactional(params: {
    organizationId: string | null;
    categorySlug: string;
    to: string;
    applicationNo?: string;
    applicantName?: string;
    senderName?: string;
    variables: Record<string, string | null | undefined>;
  }): Promise<{ success: boolean; messageId?: string } | null> {
    const { organizationId, categorySlug, to, applicationNo, applicantName, senderName, variables } = params;

    if (!to) {
      this.logger.warn(`Skipping transactional email "${categorySlug}" — no recipient email.`);
      return null;
    }

    if (await this.isSuppressed(organizationId, to)) {
      this.logger.warn(`Skipping transactional email "${categorySlug}" — ${to} is on the suppression list.`);
      return { success: false };
    }

    const category = await this.categoriesService.findBySlugForOrg(categorySlug, organizationId);
    if (!category) {
      this.logger.warn(`No email category found for slug "${categorySlug}" — skipping send.`);
      return null;
    }

    const template = await this.findTemplateForCategory(category.id, organizationId);

    const normalizedVars: Record<string, string | null | undefined> = {};
    Object.entries(variables).forEach(([k, v]) => {
      normalizedVars[k.toLowerCase()] = v;
    });

    let subject = '';
    let body = '';
    let footer: string | undefined = undefined;
    let header: string | undefined = undefined;
    let signature: string | undefined = undefined;
    let templateId: string | undefined = undefined;

    if (template) {
      subject = this.renderText(template.subject, normalizedVars);
      body = this.renderText(template.body, normalizedVars);
      footer = template.footer ? this.renderText(template.footer, normalizedVars) : undefined;
      header = template.header ? this.renderText(template.header, normalizedVars) : undefined;
      signature = template.signature ? this.renderText(template.signature, normalizedVars) : undefined;
      templateId = template.id;
    } else {
      const def = this.seedTemplateDefinitions[categorySlug];
      if (def) {
        subject = this.renderText(def.subject, normalizedVars);
        body = this.renderText(def.body, normalizedVars);
        footer = def.footer ? this.renderText(def.footer, normalizedVars) : undefined;
      } else {
        this.logger.warn(`No active template configured for category "${categorySlug}" — skipping send.`);
        return null;
      }
    }

    let result: { success: boolean; messageId?: string };
    try {
      result = await this.sendEmail({
        to,
        subject,
        body,
        footer,
        header,
        signature,
        senderName,
        category: category.name,
        templateId,
        applicationNo,
        applicantName,
        organizationId: organizationId || undefined,
      });
    } catch (err: any) {
      this.logger.error(`Failed to send transactional email "${categorySlug}": ${err?.message || err}`);
      result = { success: false };
    }

    try {
      await this.communicationsService.create({
        organizationId: organizationId || undefined,
        applicationNo,
        applicantName,
        recipientEmail: to,
        channel: 'Email',
        direction: 'System Generated',
        handledBy: 'System',
        category: category.name,
        categoryId: category.id,
        templateId: templateId || undefined,
        subject,
        content: body,
        footer,
        sender: senderName,
        status: result.success ? 'Sent' : 'Failed',
        messageId: result.messageId,
      });
    } catch (err: any) {
      this.logger.warn(`Failed to log communication for "${categorySlug}": ${err?.message || err}`);
    }

    return result;
  }

  // Each seed template is scoped to exactly one category slug and only uses
  // that category's variables (common + category-specific) in its subject,
  // body, and footer — org_admin can remove/re-add these but never introduce
  // a variable outside the category's allowed set.
  private readonly seedTemplateDefinitions: Record<
    string,
    { name: string; subject: string; body: string; footer: string; description: string }
  > = {
    application_submitted: {
      name: 'Application Submitted Confirmation',
      subject: 'Application Received: {course} - {application_no}',
      body: `Dear {name},

Thank you for submitting your application for {course}. We have successfully received it on {submitted_at}.

Application Number: {application_no}
Academic Session: {academic_session}

Our admissions team will review your application and keep you updated on the next steps.`,
      footer: `Reference: {application_no}\nThis is an automated confirmation — no action is required from you right now.`,
      description: 'Sent when a candidate completes and submits their application form.',
    },
    fee_payment_confirmation: {
      name: 'Application Fee Payment Confirmation',
      subject: 'Payment Received: {course} - {application_no}',
      body: `Dear {name},

We have received your application fee payment of {currency} {amount} via {payment_method}.

Transaction ID: {transaction_id}
Payment Date: {paid_at}
Application Number: {application_no}

Your application is now complete on the payment step.`,
      footer: `Reference: {application_no} • Transaction {transaction_id}`,
      description: 'Sent when the application fee payment succeeds via Razorpay.',
    },
    shortlisted: {
      name: 'Shortlisted for Next Round',
      subject: "You've Been Shortlisted - {course} ({application_no})",
      body: `Dear {name},

Congratulations! Your application {application_no} for {course} has been shortlisted for the next stage of the admissions process.

Our team will schedule your interview shortly. You will receive a separate email with the date, time, and venue once it is confirmed.`,
      footer: `Application Number: {application_no}`,
      description: 'Sent when a candidate is shortlisted for the next selection round.',
    },
    interview_gd_slot_invitation: {
      name: 'Interview/GD Slot Invitation',
      subject: '{interview_type} Round {round} Scheduled - {course} ({application_no})',
      body: `Dear {name},

Your {interview_type} for {course} (Round {round}) has been scheduled.

Date: {date}
Time: {time}
Venue: {venue}
Meeting Link: {meeting_link}

Application Number: {application_no}

Please be available a few minutes early.`,
      footer: `Application Number: {application_no} • Round {round}`,
      description: 'Sent when an interview or group discussion slot is booked for a candidate.',
    },
    interview_gd_reschedule: {
      name: 'Interview/GD Reschedule Notice',
      subject: '{interview_type} Rescheduled - {course} ({application_no})',
      body: `Dear {name},

Your {interview_type} for {course}, previously scheduled on {old_date}, has been rescheduled.

New Date: {date}
New Time: {time}
Venue: {venue}
Meeting Link: {meeting_link}

Application Number: {application_no}`,
      footer: `Application Number: {application_no}`,
      description: 'Sent when an interview or group discussion slot is rescheduled.',
    },
    interview_gd_cancellation: {
      name: 'Interview/GD Cancellation Notice',
      subject: '{interview_type} Cancelled - {course} ({application_no})',
      body: `Dear {name},

Your {interview_type} for {course} scheduled on {date} at {time} has been cancelled.

Application Number: {application_no}

Our team will be in touch if it needs to be rescheduled.`,
      footer: `Application Number: {application_no}`,
      description: 'Sent when a scheduled interview or group discussion is cancelled.',
    },
    results_scores_updated: {
      name: 'Results/Scores Updated',
      subject: 'GD & Interview Results Published - {course} ({application_no})',
      body: `Dear {name},

The GD & Personal Interview evaluation results for your application {application_no} ({course}) have been officially published.

Please log in to your Student Portal to view your complete evaluation breakdown, composite score, and admission decision.

Portal Login: {login_url}

Application Number: {application_no}`,
      footer: `Application Number: {application_no} • EduCRM Admissions`,
      description: 'Sent when interview/GD evaluation results are published for a candidate.',
    },
    offer_letter_sent: {
      name: 'Offer Letter Sent',
      subject: 'Congratulations {name}! Offer for {course} - {application_no}',
      body: `Dear {name},

We are pleased to offer you admission to {program_offered} ({offer_type}).

Scholarship Amount: {scholarship_amount}
Conditions: {conditions}
Offer Valid Till: {offer_valid_till}
Offer Sent On: {sent_at}

Application Number: {application_no}

Please log in to your student portal to review and accept your offer.`,
      footer: `Application Number: {application_no}`,
      description: 'Sent when an offer letter is issued to a candidate.',
    },
    waitlisted: {
      name: 'Waitlisted Notice',
      subject: 'Application Status: Waitlisted - {course} ({application_no})',
      body: `Dear {name},

Your application {application_no} for {course} has been placed on the waitlist at rank {waitlist_rank}.

{alternate_program}

We will notify you if a seat becomes available.`,
      footer: `Application Number: {application_no}`,
      description: 'Sent when a candidate is placed on the waitlist.',
    },
    waitlist_offer_conversion: {
      name: 'Waitlist to Offer Conversion',
      subject: 'Good News! A Seat Has Opened Up - {course} ({application_no})',
      body: `Dear {name},

A seat has become available for {program_offered} ({movement_trigger}). Your position on the waitlist was rank {waitlist_rank}.

Offer Valid Till: {offer_valid_till}
Application Number: {application_no}

Please watch for your offer letter and further instructions.`,
      footer: `Application Number: {application_no}`,
      description: 'Sent when a waitlisted candidate is moved off the waitlist with an offer.',
    },
    enrollment_confirmed: {
      name: 'Enrollment Confirmed',
      subject: 'Enrollment Confirmed - {course} ({application_no})',
      body: `Dear {name},

Your enrollment for {course} has been confirmed on {confirmation_date}.

Seat Booking Fee: {seat_booking_fee}
Fee Payment Status: {fee_payment_status}
Onboarding Info: {onboarding_info}

Application Number: {application_no}

Welcome aboard!`,
      footer: `Application Number: {application_no}`,
      description: 'Sent when a candidate confirms enrollment, marking the end of the funnel.',
    },
  };

  private async seedDefaultTemplates() {
    try {
      const categories = await this.categoriesService.findAll();

      for (const category of categories) {
        const def = this.seedTemplateDefinitions[category.slug];
        if (!def) continue;

        const existing = await this.templateRepo.findOne({
          where: { categoryId: category.id, organizationId: IsNull() },
        });
        if (existing) {
          if (!existing.templateCategory && SLUG_TO_SCOPE_CATEGORY[category.slug]) {
            existing.templateCategory = SLUG_TO_SCOPE_CATEGORY[category.slug];
            await this.templateRepo.save(existing);
          }
          continue;
        }

        const allowedKeys = new Set((category.variables || []).map((v) => v.key));
        const variables = Array.from(
          new Set([
            ...this.extractVariables(def.subject),
            ...this.extractVariables(def.body),
            ...this.extractVariables(def.footer),
          ]),
        ).filter((v) => allowedKeys.has(v));

        const template = this.templateRepo.create({
          organizationId: null,
          name: def.name,
          category: category.name,
          categoryId: category.id,
          templateCategory: SLUG_TO_SCOPE_CATEGORY[category.slug] || null,
          channel: 'Email',
          subject: def.subject,
          body: def.body,
          footer: def.footer,
          description: def.description,
          variables,
          language: 'English',
          status: 'approved',
          versionNumber: 1,
          isDefault: true,
          usageCount: 0,
          editableByRoles: DEFAULT_EDITING_ROLES,
          createdByName: 'System',
          approvedByName: 'System',
          approvedAt: new Date(),
        });
        await this.templateRepo.save(template);
      }

      this.logger.log('Seeded default email templates successfully.');
    } catch (err: any) {
      this.logger.warn(`Failed to seed default email templates: ${err?.message || err}`);
    }
  }

  async findAll(
    orgId?: string,
    search?: string,
    category?: string,
    status?: string,
    filters: { type?: string; templateCategory?: string; language?: string } = {},
  ): Promise<EmailTemplate[]> {
    const qb = this.templateRepo.createQueryBuilder('tmpl');

    if (orgId) {
      qb.where('(tmpl.organization_id = :orgId OR tmpl.organization_id IS NULL)', { orgId });
    }

    if (category && category !== 'all') {
      qb.andWhere('LOWER(tmpl.category) = LOWER(:category)', { category });
    }

    if (status && status !== 'all') {
      if (status === 'approved' || status === 'active') qb.andWhere("tmpl.status IN ('approved','active')");
      else qb.andWhere('tmpl.status = :status', { status });
    }

    if (filters.type && filters.type !== 'all') qb.andWhere('tmpl.channel = :type', { type: filters.type });
    if (filters.templateCategory && filters.templateCategory !== 'all') {
      qb.andWhere('tmpl.template_category = :tc', { tc: filters.templateCategory });
    }
    if (filters.language && filters.language !== 'all') qb.andWhere('tmpl.language = :lang', { lang: filters.language });

    if (search && search.trim() !== '') {
      const q = `%${search.trim().toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(tmpl.name) LIKE :q OR LOWER(tmpl.subject) LIKE :q OR LOWER(tmpl.category) LIKE :q OR LOWER(tmpl.body) LIKE :q)',
        { q },
      );
    }

    qb.orderBy('tmpl.is_default', 'DESC');
    qb.addOrderBy('tmpl.created_at', 'DESC');

    return qb.getMany();
  }

  async findOne(id: string): Promise<EmailTemplate> {
    const template = await this.templateRepo.findOne({ where: { id } });
    if (!template) {
      throw new NotFoundException(`Email template with ID ${id} not found`);
    }
    return template;
  }

  private isAdmin(actor?: TemplateActor | null) {
    return !!actor?.role && ADMIN_ROLES.includes(actor.role);
  }

  /** Role-based editing rights: org_admin / superadmin always; others only when listed on the template. */
  canEdit(template: EmailTemplate, actor?: TemplateActor | null): boolean {
    if (!actor?.role) return true; // internal calls
    if (this.isAdmin(actor)) return true;
    if (!template.organizationId) return false; // global defaults: admins only
    const roles = Array.isArray(template.editableByRoles) && template.editableByRoles.length
      ? template.editableByRoles
      : DEFAULT_EDITING_ROLES;
    return roles.includes(actor.role);
  }

  private validateContent(channel: string, subject?: string | null) {
    if ((channel || 'Email') === 'Email' && !String(subject || '').trim()) {
      throw new BadRequestException('Subject line is required for Email templates');
    }
  }

  async create(orgId: string | null, dto: CreateEmailTemplateDto, actor?: TemplateActor): Promise<EmailTemplate> {
    const channel = dto.channel || 'Email';
    this.validateContent(channel, dto.subject);
    const subject = channel === 'Email' ? dto.subject || '' : dto.subject || '';
    const allVars = Array.from(
      new Set([
        ...this.extractVariables(subject),
        ...this.extractVariables(dto.body),
        ...this.extractVariables(dto.header || ''),
        ...this.extractVariables(dto.footer || ''),
        ...this.extractVariables(dto.signature || ''),
        ...(dto.variables || []),
      ]),
    );

    let status = dto.status === 'active' ? 'approved' : dto.status || 'draft';
    if (status === 'approved' && actor && !this.isAdmin(actor)) {
      status = 'draft'; // only org_admin approves
    }
    const editableByRoles = Array.from(
      new Set([...(dto.editableByRoles?.length ? dto.editableByRoles : DEFAULT_EDITING_ROLES), 'org_admin']),
    );

    const template = this.templateRepo.create({
      ...dto,
      subject,
      category: dto.category || dto.templateCategory || 'General Notice',
      organizationId: orgId,
      variables: allVars,
      status,
      channel,
      language: dto.language || 'English',
      versionNumber: 1,
      editableByRoles,
      createdBy: actor?.id || null,
      createdByName: actor?.name || null,
      updatedBy: actor?.id || null,
      updatedByName: actor?.name || null,
      approvedBy: status === 'approved' ? actor?.id || null : null,
      approvedByName: status === 'approved' ? actor?.name || null : null,
      approvedAt: status === 'approved' ? new Date() : null,
    });

    return this.templateRepo.save(template);
  }

  async update(id: string, dto: UpdateEmailTemplateDto, actor?: TemplateActor): Promise<EmailTemplate> {
    const template = await this.findOne(id);
    if (!this.canEdit(template, actor)) {
      throw new ForbiddenException('Your role is not allowed to edit this template');
    }

    const contentKeys = ['subject', 'body', 'header', 'footer', 'signature'] as const;
    const contentChanged = contentKeys.some(
      (k) => (dto as any)[k] !== undefined && ((dto as any)[k] || '') !== ((template as any)[k] || ''),
    );

    const nextChannel = dto.channel || template.channel;
    const nextSubject = dto.subject !== undefined ? dto.subject : template.subject;
    this.validateContent(nextChannel, nextSubject);

    if (contentChanged) {
      const parts = contentKeys.map((k) => ((dto as any)[k] !== undefined ? (dto as any)[k] : (template as any)[k]) || '');
      template.variables = Array.from(new Set(parts.flatMap((p) => this.extractVariables(p))));
      template.versionNumber = (template.versionNumber || 1) + 1;
    }

    const { status: requestedStatus, editableByRoles, ...rest } = dto as any;
    delete rest.variables;
    Object.assign(template, rest);

    if (editableByRoles !== undefined) {
      if (!this.isAdmin(actor) && actor?.role) {
        throw new ForbiddenException('Only an organization admin can change editing rights');
      }
      template.editableByRoles = Array.from(new Set([...(editableByRoles || []), 'org_admin']));
    }

    if (requestedStatus !== undefined) {
      const st = requestedStatus === 'active' ? 'approved' : requestedStatus;
      if (st === 'approved' && template.status !== 'approved') {
        if (actor?.role && !this.isAdmin(actor)) throw new ForbiddenException('Only an organization admin can approve templates');
        template.approvedBy = actor?.id || null;
        template.approvedByName = actor?.name || null;
        template.approvedAt = new Date();
      }
      template.status = st;
    }

    // A non-admin content change sends an approved template back for approval.
    if (contentChanged && actor?.role && !this.isAdmin(actor) && APPROVED.includes(template.status)) {
      template.status = 'draft';
      template.approvedBy = null;
      template.approvedByName = null;
      template.approvedAt = null;
    } else if (contentChanged && this.isAdmin(actor) && APPROVED.includes(template.status)) {
      template.approvedBy = actor?.id || template.approvedBy;
      template.approvedByName = actor?.name || template.approvedByName;
      template.approvedAt = new Date();
    }

    template.updatedBy = actor?.id || template.updatedBy;
    template.updatedByName = actor?.name || template.updatedByName;
    return this.templateRepo.save(template);
  }

  async approve(id: string, actor: TemplateActor): Promise<EmailTemplate> {
    if (!this.isAdmin(actor)) throw new ForbiddenException('Only an organization admin can approve templates');
    const template = await this.findOne(id);
    template.status = 'approved';
    template.approvedBy = actor.id || null;
    template.approvedByName = actor.name || null;
    template.approvedAt = new Date();
    template.updatedBy = actor.id || template.updatedBy;
    template.updatedByName = actor.name || template.updatedByName;
    return this.templateRepo.save(template);
  }

  async archive(id: string, actor: TemplateActor): Promise<EmailTemplate> {
    const template = await this.findOne(id);
    if (!this.isAdmin(actor) && !this.canEdit(template, actor)) {
      throw new ForbiddenException('Your role is not allowed to archive this template');
    }
    template.status = 'archived';
    template.updatedBy = actor.id || template.updatedBy;
    template.updatedByName = actor.name || template.updatedByName;
    return this.templateRepo.save(template);
  }

  async restore(id: string, actor: TemplateActor): Promise<EmailTemplate> {
    const template = await this.findOne(id);
    if (!this.canEdit(template, actor)) throw new ForbiddenException('Your role is not allowed to edit this template');
    template.status = 'draft';
    template.approvedBy = null;
    template.approvedByName = null;
    template.approvedAt = null;
    template.updatedBy = actor.id || template.updatedBy;
    template.updatedByName = actor.name || template.updatedByName;
    return this.templateRepo.save(template);
  }

  async delete(id: string, actor?: TemplateActor): Promise<void> {
    const template = await this.findOne(id);
    if (actor?.role && !this.isAdmin(actor)) throw new ForbiddenException('Only an organization admin can delete templates');
    await this.templateRepo.remove(template);
  }

  async duplicate(id: string, actor?: TemplateActor, orgId?: string | null): Promise<EmailTemplate> {
    const orig = await this.findOne(id);
    const copy = this.templateRepo.create({
      name: `${orig.name} (Copy)`,
      category: orig.category,
      categoryId: orig.categoryId,
      templateCategory: orig.templateCategory,
      channel: orig.channel,
      subject: orig.subject,
      body: orig.body,
      header: orig.header,
      footer: orig.footer,
      signature: orig.signature,
      language: orig.language,
      description: orig.description,
      variables: orig.variables,
      status: 'draft',
      versionNumber: 1,
      isDefault: false,
      organizationId: orgId !== undefined ? orgId : orig.organizationId,
      usageCount: 0,
      editableByRoles: orig.editableByRoles?.length ? orig.editableByRoles : DEFAULT_EDITING_ROLES,
      createdBy: actor?.id || null,
      createdByName: actor?.name || null,
      updatedBy: actor?.id || null,
      updatedByName: actor?.name || null,
    });
    return this.templateRepo.save(copy);
  }

  async bumpUsage(templateId?: string | null) {
    if (!templateId) return;
    try {
      await this.templateRepo.increment({ id: templateId }, 'usageCount', 1);
    } catch {
      // Ignore template usage bump errors
    }
  }

  async sendEmail(
    dto: SendEmailTemplateDto & { organizationId?: string },
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (await this.isSuppressed(dto.organizationId, dto.to)) {
      return { success: false, error: 'Recipient is on the suppression list (unsubscribed)' };
    }
    await this.bumpUsage(dto.templateId);

    const html = buildEmailHtml({
      subject: dto.subject,
      body: dto.body,
      header: dto.header,
      footer: dto.footer,
      signature: dto.signature,
      category: dto.category,
      senderName: dto.senderName,
      applicationNo: dto.applicationNo,
    });

    const res = await sendOrgEmail(this.mailerService, {
      organizationId: dto.organizationId,
      to: dto.to,
      subject: dto.subject,
      html,
      text: dto.body,
      fromName: dto.senderName,
    });
    if (!res.ok) this.logger.error(`Failed to send email to ${dto.to}: ${res.error}`);

    return {
      success: res.ok,
      messageId: res.messageId || `COMM-${Date.now()}`,
      error: res.error,
    };
  }

  /** Staff "send" from the templates page — sends and records it in the communication history. */
  async sendAndLog(
    dto: SendEmailTemplateDto & { organizationId?: string },
    actor?: TemplateActor,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const result = await this.sendEmail(dto);
    try {
      await this.communicationsService.create({
        organizationId: dto.organizationId,
        applicationNo: dto.applicationNo,
        applicantName: dto.applicantName,
        recipientEmail: dto.to,
        channel: 'Email',
        direction: 'Outbound',
        category: dto.category,
        templateId: dto.templateId && /^[0-9a-f-]{36}$/i.test(dto.templateId) ? dto.templateId : undefined,
        subject: dto.subject,
        content: dto.body,
        footer: dto.footer,
        sender: dto.senderName || actor?.name || undefined,
        handledBy: actor?.name || dto.senderName || 'Staff',
        handledByUserId: actor?.id || undefined,
        status: result.success ? 'Sent' : 'Failed',
        failureReason: result.error,
        messageId: result.messageId,
      });
    } catch (err: any) {
      this.logger.warn(`Failed to log sent email: ${err?.message || err}`);
    }
    return result;
  }
}
