import { Injectable, NotFoundException, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsWhere } from 'typeorm';
import { EmailTemplate } from './entities/email-template.entity.js';
import { CreateEmailTemplateDto } from './dto/create-email-template.dto.js';
import { UpdateEmailTemplateDto } from './dto/update-email-template.dto.js';
import { SendEmailTemplateDto } from './dto/send-email-template.dto.js';
import { MailerService } from '../notifications/mailer.service.js';

@Injectable()
export class EmailTemplatesService implements OnModuleInit {
  private readonly logger = new Logger(EmailTemplatesService.name);

  constructor(
    @InjectRepository(EmailTemplate)
    private readonly templateRepo: Repository<EmailTemplate>,
    private readonly mailerService: MailerService,
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

  private async seedDefaultTemplates() {
    try {
      const count = await this.templateRepo.count();
      if (count > 0) return;

      const defaultTemplates: Partial<EmailTemplate>[] = [
        {
          name: 'GD & Interview Slot Invitation',
          category: 'Interview Schedule',
          channel: 'Email',
          subject: 'Interview Schedule: GD & Personal Interview Slot Confirmed - {course} ({application_no})',
          body: `Dear {student},

We are pleased to inform you that your application {application_no} for the {course} program has been shortlisted for the upcoming selection round.

Selection Round Details:
- Date: {date}
- Time Slot: {time}
- Venue / Room: {venue}

Please ensure you carry a printed copy of your application form, admit card, government ID proof, and original academic certificates.

Best regards,
{sender}
Admissions Directorate`,
          description: 'Official candidate invite for GD and personal interview rounds with schedule variables.',
          variables: ['student', 'application_no', 'course', 'date', 'time', 'venue', 'sender'],
          status: 'active',
          isDefault: true,
          usageCount: 14,
        },
        {
          name: 'Provisional Admission Offer Letter Notice',
          category: 'Admission Offer',
          channel: 'Email',
          subject: 'Congratulations {student}! Admission Offer for {course} - {application_no}',
          body: `Congratulations {student}!

On behalf of the Admissions Committee, we are thrilled to offer you provisional admission to the {course} program for the upcoming academic session.

Application Number: {application_no}
Offer Issue Date: {date}

Please log in to your student portal to review your detailed scholarship breakdown, download your official Offer Letter, and complete your seat acceptance fee before the deadline.

Warm regards,
{sender}
Admissions Office`,
          description: 'Formal announcement of seat allotment and offer issuance.',
          variables: ['student', 'course', 'application_no', 'date', 'sender'],
          status: 'active',
          isDefault: true,
          usageCount: 9,
        },
        {
          name: 'Document Verification Reminder',
          category: 'Document Request',
          channel: 'Email',
          subject: 'Action Required: Pending Document Submission for {course} ({application_no})',
          body: `Dear {student},

During the preliminary verification of your application {application_no} for {course}, our review team noticed that certain required certificates are missing or unclear.

Required Action:
Please log in to your application dashboard by {date} and re-upload clear scanned copies of your pending marksheets and identification proof.

If you have questions, please reply directly to this communication.

Sincerely,
{sender}
Verification Desk`,
          description: 'Requests missing documents or marksheets from applicants.',
          variables: ['student', 'application_no', 'course', 'date', 'sender'],
          status: 'active',
          isDefault: true,
          usageCount: 6,
        },
        {
          name: 'Application Fee Payment Reminder',
          category: 'Payment Reminder',
          channel: 'Email',
          subject: 'Payment Reminder: Complete Application Fee for {course} - {application_no}',
          body: `Dear {student},

Your application {application_no} for {course} has been saved, but your application fee payment is still pending.

To ensure your application is considered in the current admissions cycle, please complete the payment on or before {date}.

Candidate: {student}
Application No: {application_no}
Program: {course}

Best regards,
{sender}
Admissions Finance Team`,
          description: 'Automated nudge for uncompleted application fee submissions.',
          variables: ['student', 'application_no', 'course', 'date', 'sender'],
          status: 'active',
          isDefault: true,
          usageCount: 21,
        },
        {
          name: 'General Admissions Advisory & Notice',
          category: 'General Notice',
          channel: 'Email',
          subject: 'Important Update Regarding Your Application: {course} ({application_no})',
          body: `Dear {student},

Thank you for your active interest in {course}. This is an official communication regarding your application {application_no}.

Please review your applicant portal for regular updates and announcements regarding upcoming orientation schedules, curriculum roadmaps, and campus guidelines.

Date: {date}

Warm regards,
{sender}
Admissions Committee`,
          description: 'General purpose announcement template for candidates.',
          variables: ['student', 'course', 'application_no', 'date', 'sender'],
          status: 'active',
          isDefault: true,
          usageCount: 4,
        },
      ];

      for (const t of defaultTemplates) {
        const created = this.templateRepo.create(t);
        await this.templateRepo.save(created);
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
    const allVars = Array.from(new Set([...varsInSubject, ...varsInBody, ...(dto.variables || [])]));

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

    if (dto.subject !== undefined || dto.body !== undefined) {
      const subj = dto.subject !== undefined ? dto.subject : template.subject;
      const body = dto.body !== undefined ? dto.body : template.body;
      const vars = Array.from(
        new Set([...this.extractVariables(subj), ...this.extractVariables(body)]),
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
