import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Lead } from './entities/lead.entity.js';
import { Form, FormStatus } from '../forms/entities/form.entity.js';
import { FormSubmission } from '../forms/entities/form-submission.entity.js';
import { FormStats } from '../forms/entities/form-stats.entity.js';
import { FormDailyStats } from '../forms/entities/form-daily-stats.entity.js';
import { SubmitPublicFormDto } from './dto/submit-public-form.dto.js';
import { LeadAssignmentService } from './lead-assignment.service.js';

@Injectable()
export class LeadIngestionService {
  constructor(
    @InjectRepository(Lead)
    private readonly leadRepository: Repository<Lead>,
    @InjectRepository(Form)
    private readonly formRepository: Repository<Form>,
    @InjectRepository(FormSubmission)
    private readonly submissionRepository: Repository<FormSubmission>,
    @InjectRepository(FormStats)
    private readonly statsRepository: Repository<FormStats>,
    @InjectRepository(FormDailyStats)
    private readonly dailyStatsRepository: Repository<FormDailyStats>,
    private readonly dataSource: DataSource,
    private readonly assignmentService: LeadAssignmentService,
  ) {}

  async submitPublicForm(
    slug: string,
    dto: SubmitPublicFormDto,
    meta: { ip: string; userAgent: string },
  ) {
    // 1. Fetch Form by Slug
    const form = await this.formRepository.findOne({
      where: { slug },
    });

    if (!form) {
      throw new NotFoundException(`Form not found`);
    }

    // 2. Validate Form Status
    if (form.status === FormStatus.DRAFT) {
      throw new BadRequestException('Form is currently in draft mode');
    }
    if (form.status === FormStatus.EXPIRED) {
      throw new BadRequestException('Form has expired');
    }

    // 3. Validate Input against Form definition
    this.validateFormInput(form, dto.data);

    // 4. Rate Limiting (TO BE IMPLEMENTED WITH REDIS/MEMORY)
    // For now, we continue with the core logic.

    // 5. Extract Unique Key (email OR phone)
    const email = this.extractFieldByType(form, dto.data, 'email')?.toLowerCase();
    const phone = this.extractFieldByType(form, dto.data, 'phone');

    // 6. Duplicate Detection (same key + same form)
    let isDuplicate = false;
    let existingLead: Lead | null = null;

    if (email || phone) {
      const query = this.leadRepository
        .createQueryBuilder('lead')
        .where('lead.form_id = :formId', { formId: form.id });

      if (email && phone) {
        query.andWhere('(lead.email = :email OR lead.phone = :phone)', { email, phone });
      } else if (email) {
        query.andWhere('lead.email = :email', { email });
      } else {
        query.andWhere('lead.phone = :phone', { phone });
      }

      existingLead = await query.getOne();
      if (existingLead) {
        isDuplicate = true;
      }
    }

    // 7. Duplicate Limit Protection (Max 5)
    const MAX_DUPLICATE_LIMIT = 5;
    if (isDuplicate && existingLead && existingLead.duplicateCount >= MAX_DUPLICATE_LIMIT) {
      // Still log the submission but skip lead update/creation
      await this.logSubmission(form, dto, meta);
      return { success: true };
    }

    // Wrap in transaction for integrity
    await this.dataSource.transaction(async (manager) => {
      // 8. Store Raw Submission
      const submission = manager.create(FormSubmission, {
        formId: form.id,
        organizationId: form.organizationId,
        data: dto.data,
        utmData: dto.utmData || {},
        source: dto.source || 'public_form',
        ipAddress: meta.ip,
        userAgent: meta.userAgent,
      });
      await manager.save(submission);

      // 9. Store/Update Lead
      if (existingLead) {
        existingLead.duplicateCount += 1;
        existingLead.isDuplicate = true;
        existingLead.rawPayload = dto.data;
        await manager.save(existingLead);
      } else {
        const lead = manager.create(Lead, {
          organizationId: form.organizationId,
          formId: form.id,
          campaignId: form.campaignId,
          firstName: this.extractFieldByType(form, dto.data, 'first_name') || 
                    this.extractFieldByType(form, dto.data, 'name') ||
                    this.extractFieldByType(form, dto.data, 'fullname'),
          lastName: this.extractFieldByType(form, dto.data, 'last_name'),
          email,
          phone,
          source: dto.source || 'public_form',
          utmSource: dto.utmData?.utm_source,
          utmMedium: dto.utmData?.utm_medium,
          utmCampaign: dto.utmData?.utm_campaign || form.campaignId,
          rawPayload: dto.data,
          isDuplicate: false,
          duplicateCount: 0,
        });

        // 11. Assignment Engine
        const assignment = await this.assignmentService.assignLead(lead);
        if (assignment) {
          lead.assignedTo = assignment.userId;
          lead.assignedAt = assignment.timestamp;
        }

        await manager.save(lead);
      }

      // 12. Update Analytics
      await this.updateAnalytics(manager, form.id, isDuplicate);
    });

    return { success: true };
  }

  private validateFormInput(form: any, data: Record<string, any>) {
    for (const field of form.fields) {
      const value = data[field.id];

      // 1. Required Validation
      const isRequired = field.required === true || field.isRequired === true;
      if (isRequired && (value === undefined || value === null || value === '')) {
        throw new BadRequestException(`${field.label} is required`);
      }

      if (value !== undefined && value !== null && value !== '') {
        // 2. Type Specific Validation
        if (field.type === 'email') {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            throw new BadRequestException(`Invalid email format for ${field.label}`);
          }
        }

        // 3. Option-based fields validation (Check both id and label for compatibility)
        if (['select', 'radio', 'checkbox'].includes(field.type)) {
          const options = field.options || [];
          const optionIds = options.map((opt: any) => String(opt.id || opt).trim());
          const optionLabels = options.map((opt: any) => String(opt.label || opt).trim().toLowerCase());
          
          // Handle checkbox: if a single value is sent, wrap it in an array for flexibility
          let values = value;
          if (field.type === 'checkbox' && !Array.isArray(value)) {
            values = [value];
          }

          if (Array.isArray(values)) {
            // Check if all selected values exist as either id or label
            for (const val of values) {
              const valTrimmed = String(val).trim();
              const valLower = valTrimmed.toLowerCase();
              if (!optionIds.includes(valTrimmed) && !optionLabels.includes(valLower)) {
                console.log(`[Validation Error] Field: ${field.label}`, { 
                  type: field.type, 
                  submitted: valTrimmed, 
                  expectedIds: optionIds, 
                  expectedLabels: optionLabels,
                  fullField: field 
                });
                throw new BadRequestException(`Invalid option selected for ${field.label}`);
              }
            }
          } else {
            // Select or Radio (single value)
            const valTrimmed = String(values).trim();
            const valLower = valTrimmed.toLowerCase();
            if (!optionIds.includes(valTrimmed) && !optionLabels.includes(valLower)) {
              console.log(`[Validation Error] Field: ${field.label}`, { 
                type: field.type, 
                submitted: valTrimmed, 
                expectedIds: optionIds, 
                expectedLabels: optionLabels,
                fullField: field 
              });
              throw new BadRequestException(`Invalid option selected for ${field.label}`);
            }
          }
        }
      }
    }
  }

  private extractFieldByType(form: any, data: Record<string, any>, targetType: string): string | undefined {
    // Look for a field in the form definition that matches the targetType or common labels
    const field = form.fields.find((f: any) => 
      f.type === targetType || 
      f.id.toLowerCase().includes(targetType) || 
      f.label.toLowerCase().includes(targetType)
    );

    if (field && data[field.id]) {
      const value = data[field.id];
      return Array.isArray(value) ? value.join(', ') : String(value);
    }
    return undefined;
  }

  private async logSubmission(form: Form, dto: SubmitPublicFormDto, meta: any) {
    const submission = this.submissionRepository.create({
      formId: form.id,
      organizationId: form.organizationId,
      data: dto.data,
      utmData: dto.utmData || {},
      source: dto.source || 'public_form',
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
    });
    await this.submissionRepository.save(submission);
  }

  private async updateAnalytics(manager: any, formId: string, isDuplicate: boolean) {
    // Update daily stats
    const today = new Date().toISOString().split('T')[0];
    let daily = await manager.findOne(FormDailyStats, { where: { formId, date: today } });
    if (!daily) {
      daily = manager.create(FormDailyStats, { formId, date: today, totalSubmissions: 0, uniqueSubmissions: 0 });
    }
    daily.totalSubmissions += 1;
    if (!isDuplicate) daily.uniqueSubmissions += 1;
    await manager.save(daily);

    // Update aggregate stats
    let stats = await manager.findOne(FormStats, { where: { formId } });
    if (!stats) {
      stats = manager.create(FormStats, { formId, totalSubmissions: 0, uniqueSubmissions: 0, duplicateAttempts: 0 });
    }
    stats.totalSubmissions += 1;
    if (isDuplicate) stats.duplicateAttempts += 1;
    else stats.uniqueSubmissions += 1;
    stats.lastSubmissionAt = new Date();
    await manager.save(stats);
  }
}
