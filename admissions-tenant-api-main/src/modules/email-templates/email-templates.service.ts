import { Injectable, NotFoundException, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsWhere, IsNull } from 'typeorm';
import { EmailTemplate } from './entities/email-template.entity.js';
import { CreateEmailTemplateDto } from './dto/create-email-template.dto.js';
import { UpdateEmailTemplateDto } from './dto/update-email-template.dto.js';
import { SendEmailTemplateDto } from './dto/send-email-template.dto.js';
import { MailerService } from '../notifications/mailer.service.js';
import { EmailTemplateCategoriesService } from '../email-template-categories/email-template-categories.service.js';
import { CommunicationsService } from '../communications/communications.service.js';

@Injectable()
export class EmailTemplatesService implements OnModuleInit {
  private readonly logger = new Logger(EmailTemplatesService.name);

  constructor(
    @InjectRepository(EmailTemplate)
    private readonly templateRepo: Repository<EmailTemplate>,
    private readonly mailerService: MailerService,
    private readonly categoriesService: EmailTemplateCategoriesService,
    private readonly communicationsService: CommunicationsService,
  ) {}

  async onModuleInit() {
    await this.seedDefaultTemplates();
  }

  private extractVariables(text: string): string[] {
    const matches = text.match(/\{([a-zA-Z0-9_-]+)\}/g) || [];
    const vars = new Set<string>();
    matches.forEach((m) => {
      vars.add(m.replace(/[\{\}]/g, '').trim().toLowerCase());
    });
    return Array.from(vars);
  }

  private renderText(text: string, vars: Record<string, string | null | undefined>): string {
    return text.replace(/\{([a-zA-Z0-9_-]+)\}/g, (match, key) => {
      const val = vars[key.toLowerCase()];
      return val !== undefined && val !== null && val !== '' ? String(val) : match;
    });
  }

  private async findTemplateForCategory(
    categoryId: string,
    orgId: string | null,
  ): Promise<EmailTemplate | null> {
    if (orgId) {
      const orgTemplate = await this.templateRepo.findOne({
        where: { categoryId, organizationId: orgId, status: 'active' },
        order: { createdAt: 'ASC' },
      });
      if (orgTemplate) return orgTemplate;
    }
    return this.templateRepo.findOne({
      where: { categoryId, organizationId: IsNull(), status: 'active' },
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

    const category = await this.categoriesService.findBySlugForOrg(categorySlug, organizationId);
    if (!category) {
      this.logger.warn(`No email category found for slug "${categorySlug}" — skipping send.`);
      return null;
    }

    const template = await this.findTemplateForCategory(category.id, organizationId);
    if (!template) {
      this.logger.warn(`No active template configured for category "${categorySlug}" — skipping send.`);
      return null;
    }

    const normalizedVars: Record<string, string | null | undefined> = {};
    Object.entries(variables).forEach(([k, v]) => {
      normalizedVars[k.toLowerCase()] = v;
    });

    const subject = this.renderText(template.subject, normalizedVars);
    const body = this.renderText(template.body, normalizedVars);
    const footer = template.footer ? this.renderText(template.footer, normalizedVars) : undefined;

    let result: { success: boolean; messageId?: string };
    try {
      result = await this.sendEmail({
        to,
        subject,
        body,
        footer,
        senderName,
        category: category.name,
        templateId: template.id,
        applicationNo,
        applicantName,
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
        category: category.name,
        categoryId: category.id,
        templateId: template.id,
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

Congratulations! Your application {application_no} for {course} has been shortlisted for the next stage of the admissions process, with a shortlist score of {shortlist_score}.

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
      subject: 'Evaluation Results Available - {course} ({application_no})',
      body: `Dear {name},

Your evaluation for {course} has been finalized.

Composite Score: {composite_score}
GD + PI Total: {gdpi_total}
Panel Recommendation: {recommendation}

Application Number: {application_no}`,
      footer: `Application Number: {application_no}`,
      description: 'Sent when interview/GD evaluation results are finalized for a candidate.',
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
      const count = await this.templateRepo.count();
      if (count > 0) return;

      const categories = await this.categoriesService.findAll();

      for (const category of categories) {
        const def = this.seedTemplateDefinitions[category.slug];
        if (!def) continue;

        const allowedKeys = new Set(category.variables.map((v) => v.key));
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
          channel: 'Email',
          subject: def.subject,
          body: def.body,
          footer: def.footer,
          description: def.description,
          variables,
          status: 'active',
          isDefault: true,
          usageCount: 0,
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
  ): Promise<EmailTemplate[]> {
    const qb = this.templateRepo.createQueryBuilder('tmpl');

    if (orgId) {
      qb.where('(tmpl.organization_id = :orgId OR tmpl.organization_id IS NULL)', { orgId });
    }

    if (category && category !== 'all') {
      qb.andWhere('LOWER(tmpl.category) = LOWER(:category)', { category });
    }

    if (status && status !== 'all') {
      qb.andWhere('tmpl.status = :status', { status });
    }

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

  async create(orgId: string | null, dto: CreateEmailTemplateDto): Promise<EmailTemplate> {
    const varsInSubject = this.extractVariables(dto.subject);
    const varsInBody = this.extractVariables(dto.body);
    const varsInFooter = this.extractVariables(dto.footer || '');
    const allVars = Array.from(
      new Set([...varsInSubject, ...varsInBody, ...varsInFooter, ...(dto.variables || [])]),
    );

    const template = this.templateRepo.create({
      ...dto,
      organizationId: orgId,
      variables: allVars,
      status: dto.status || 'active',
      channel: dto.channel || 'Email',
    });

    return this.templateRepo.save(template);
  }

  async update(id: string, dto: UpdateEmailTemplateDto): Promise<EmailTemplate> {
    const template = await this.findOne(id);

    if (dto.subject !== undefined || dto.body !== undefined || dto.footer !== undefined) {
      const subj = dto.subject !== undefined ? dto.subject : template.subject;
      const body = dto.body !== undefined ? dto.body : template.body;
      const footer = dto.footer !== undefined ? dto.footer : template.footer;
      const vars = Array.from(
        new Set([
          ...this.extractVariables(subj),
          ...this.extractVariables(body),
          ...this.extractVariables(footer || ''),
        ]),
      );
      template.variables = vars;
    }

    Object.assign(template, dto);
    return this.templateRepo.save(template);
  }

  async delete(id: string): Promise<void> {
    const template = await this.findOne(id);
    await this.templateRepo.remove(template);
  }

  async duplicate(id: string): Promise<EmailTemplate> {
    const orig = await this.findOne(id);
    const copy = this.templateRepo.create({
      name: `${orig.name} (Copy)`,
      category: orig.category,
      channel: orig.channel,
      subject: orig.subject,
      body: orig.body,
      description: orig.description,
      variables: orig.variables,
      status: 'draft',
      isDefault: false,
      organizationId: orig.organizationId,
      usageCount: 0,
    });
    return this.templateRepo.save(copy);
  }

  async sendEmail(dto: SendEmailTemplateDto): Promise<{ success: boolean; messageId?: string }> {
    if (dto.templateId) {
      try {
        const tmpl = await this.templateRepo.findOne({ where: { id: dto.templateId } });
        if (tmpl) {
          tmpl.usageCount = (tmpl.usageCount || 0) + 1;
          await this.templateRepo.save(tmpl);
        }
      } catch {
        // Ignore template usage bump errors
      }
    }

    // Convert newlines in plain text to html paragraphs/breaks
    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; color: #1e293b; line-height: 1.6; font-size: 14px; background: #ffffff; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <div style="border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 20px;">
          <h2 style="color: #0f172a; margin: 0; font-size: 18px; font-weight: 700;">${dto.subject}</h2>
          ${
            dto.category
              ? `<span style="display:inline-block; margin-top: 6px; font-size: 11px; font-weight: 600; text-transform: uppercase; background: #eff6ff; color: #1d4ed8; padding: 2px 8px; border-radius: 9999px;">${dto.category}</span>`
              : ''
          }
        </div>
        <div style="white-space: pre-line; margin-bottom: 24px;">${dto.body}</div>
        ${
          dto.footer
            ? `<div style="border-top: 1px solid #e2e8f0; padding-top: 12px; margin-bottom: 20px; font-size: 12px; color: #64748b; white-space: pre-line;">${dto.footer}</div>`
            : ''
        }
        <div style="border-top: 1px solid #f1f5f9; padding-top: 14px; font-size: 12px; color: #64748b;">
          <p style="margin: 0;">Sent by: <strong>${dto.senderName || 'Admissions Desk'}</strong></p>
          ${dto.applicationNo ? `<p style="margin: 2px 0 0 0;">Application Ref: ${dto.applicationNo}</p>` : ''}
        </div>
      </div>
    `;

    const success = await this.mailerService.sendCustomEmail({
      to: dto.to,
      subject: dto.subject,
      text: dto.body,
      html: htmlBody,
      fromName: dto.senderName,
    });

    return {
      success,
      messageId: `COMM-${Date.now()}`,
    };
  }
}
