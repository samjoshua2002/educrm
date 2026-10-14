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
import { FormResponse, ResponseStatus } from '../forms/entities/form-response.entity.js';
import { FormStats } from '../forms/entities/form-stats.entity.js';
import { FormDailyStats } from '../forms/entities/form-daily-stats.entity.js';
import { SubmitPublicFormDto } from './dto/submit-public-form.dto.js';
import { LeadPipelineService } from './lead-pipeline.service.js';
import { mapPayload } from './lead-field-mapper.js';

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
    private readonly pipeline: LeadPipelineService,
  ) {}

  async submitPublicForm(
    slug: string,
    dto: SubmitPublicFormDto,
    meta: { ip: string; userAgent: string },
  ) {
    // 1. Fetch Form by Slug
    const form = await this.formRepository.findOne({
      where: { slug },
      relations: ['organization', 'organization.branches'],
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

    // 5. Map submitted values onto the standard lead fields
    const email = this.extractFieldByType(form, dto.data, 'email')?.toLowerCase();
    const phone = this.extractFieldByType(form, dto.data, 'phone');
    const { firstName, lastName } = this.extractFullName(form, dto.data);
    const mapped = mapPayload({ ...(dto.data || {}) });
    const utm = dto.utmData || {};

    // location → leads.branch_id, course → leads.course_id (UUIDs picked from real
    // Branch/Course records by the form builder). Non-UUID values are kept as text.
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const rawBranch = dto.data?.location;
    const rawCourse = dto.data?.course;
    const branchId = rawBranch && UUID_REGEX.test(String(rawBranch)) ? String(rawBranch) : null;
    const courseId = rawCourse && UUID_REGEX.test(String(rawCourse)) ? String(rawCourse) : null;

    const metaField = (form.fields || []).find(
      (f: any) => f && (f.id === 'form_metadata' || f.type === 'metadata'),
    );
    const formCampaign = (form as any).campaign || metaField?.campaign;
    const leadSource =
      form.source && form.source.toLowerCase() !== 'direct'
        ? form.source
        : dto.source || form.source || 'Direct';

    // 6-11. Unified capture pipeline: source tracking → duplicate / re-entry check → scoring → routing
    const result = await this.pipeline.ingest(
      form.organizationId,
      {
        ...mapped,
        firstName: firstName ?? mapped.firstName,
        lastName: lastName ?? mapped.lastName,
        email: email ?? mapped.email,
        phone: phone ?? mapped.phone,
        branchId,
        courseId: courseId ?? null,
        programInterest: courseId ? null : mapped.programInterest ?? (rawCourse ? String(rawCourse) : null),
        formId: form.id,
        formName: form.name,
        channelSource: 'Web',
        source: leadSource,
        campaignId: form.campaignId || null,
        utmSource: utm.utm_source ?? mapped.utmSource,
        utmMedium: utm.utm_medium ?? mapped.utmMedium,
        utmCampaign: utm.utm_campaign ?? mapped.utmCampaign ?? formCampaign ?? null,
        utmTerm: utm.utm_term ?? mapped.utmTerm,
        utmContent: utm.utm_content ?? mapped.utmContent,
        gclid: utm.gclid ?? null,
        fbclid: utm.fbclid ?? null,
        submissionUrl: utm.page_url ?? utm.url ?? mapped.submissionUrl ?? null,
        referrerUrl: utm.referrer ?? mapped.referrerUrl ?? null,
        rawPayload: dto.data,
      },
      { createdFrom: 'Web', channelSource: 'Web', mode: 'capture', note: `Form "${form.name}"` },
    );
    const isDuplicate = result.outcome !== 'created';

    await this.dataSource.transaction(async (manager) => {
      // Store raw submission
      const submission = manager.create(FormSubmission, {
        formId: form.id,
        organizationId: form.organizationId,
        data: dto.data,
        utmData: dto.utmData || {},
        source: leadSource,
        ipAddress: meta.ip,
        userAgent: meta.userAgent,
      });
      await manager.save(submission);

      // Processed form response (administrative review)
      const response = manager.create(FormResponse, {
        formId: form.id,
        organizationId: form.organizationId,
        data: dto.data,
        status: ResponseStatus.PENDING,
        isDuplicate,
      });
      await manager.save(response);

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
          let options = field.options || [];

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

  private extractFullName(form: any, data: Record<string, any>): { firstName?: string; lastName?: string } {
    const raw =
      data.full_name ??
      this.extractFieldByType(form, data, 'first_name') ??
      this.extractFieldByType(form, data, 'name') ??
      this.extractFieldByType(form, data, 'fullname');

    if (!raw) {
      const last = this.extractFieldByType(form, data, 'last_name');
      return { firstName: undefined, lastName: last };
    }

    const parts = String(raw).trim().split(/\s+/);
    if (parts.length === 1) {
      return { firstName: parts[0] };
    }
    return {
      firstName: parts[0],
      lastName: parts.slice(1).join(' '),
    };
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
    const leadSource =
      form.source && form.source.toLowerCase() !== 'direct'
        ? form.source
        : (dto.source || form.source || 'Direct');
    const submission = this.submissionRepository.create({
      formId: form.id,
      organizationId: form.organizationId,
      data: dto.data,
      utmData: dto.utmData || {},
      source: leadSource,
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
