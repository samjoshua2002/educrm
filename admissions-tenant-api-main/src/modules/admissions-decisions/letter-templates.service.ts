import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LetterTemplate, LetterTemplateType } from './entities/letter-template.entity.js';
import { LetterTemplateDto, UpdateLetterTemplateDto } from './dto/offer.dto.js';

export const MERGE_FIELDS: { key: string; description: string }[] = [
  { key: 'Name', description: "Applicant's full name" },
  { key: 'Program', description: 'Program offered / applied for' },
  { key: 'Scholarship_Amount', description: 'Scholarship amount (offer letters)' },
  { key: 'Offer_Valid_Till', description: 'Date the offer is valid till' },
  { key: 'Conditions', description: 'Conditions attached to the offer' },
  { key: 'Application_No', description: 'Application number' },
  { key: 'Date', description: "Today's date" },
  { key: 'Offer_Type', description: 'Offer type (Regular / Conditional / Scholarship)' },
  { key: 'Acceptance_Deadline', description: 'Last date to accept the offer' },
  { key: 'Seat_Booking_Fee', description: 'Seat booking fee' },
  { key: 'Waitlist_Rank', description: 'Waitlist rank (waitlist letters)' },
  { key: 'Rejection_Reason', description: 'Rejection reason (rejection letters)' },
  { key: 'Detailed_Reason', description: 'Detailed reason (rejection letters)' },
  { key: 'Alternate_Options', description: 'Alternate options suggested (rejection letters)' },
  { key: 'Next_Intake', description: 'Next intake the applicant may apply for' },
  { key: 'Organization', description: 'Institution name' },
];

const DEFAULT_TEMPLATES: Record<LetterTemplateType, { name: string; subject: string; bodyHtml: string }> = {
  offer: {
    name: 'Standard Offer Letter',
    subject: 'Offer of Admission - {{Application_No}}',
    bodyHtml: `<h1 style="text-align:center">OFFER OF ADMISSION</h1>
<p style="text-align:right">Date: {{Date}}</p>
<p>Dear <strong>{{Name}}</strong>,</p>
<p>We are pleased to offer you admission (Application No. <strong>{{Application_No}}</strong>) to the <strong>{{Program}}</strong> programme.</p>
<p><strong>Offer type:</strong> {{Offer_Type}}</p>
<p><strong>Scholarship awarded:</strong> {{Scholarship_Amount}}</p>
<p><strong>Conditions:</strong><br/>{{Conditions}}</p>
<p>This offer is valid till <strong>{{Offer_Valid_Till}}</strong>. Please confirm your acceptance and pay the seat booking fee of {{Seat_Booking_Fee}} by {{Acceptance_Deadline}} through the applicant portal.</p>
<p>We look forward to welcoming you.</p>
<p>Sincerely,<br/>Admissions Committee<br/>{{Organization}}</p>`,
  },
  rejection: {
    name: 'Standard Rejection Letter',
    subject: 'Your application {{Application_No}}',
    bodyHtml: `<p style="text-align:right">Date: {{Date}}</p>
<p>Dear <strong>{{Name}}</strong>,</p>
<p>Thank you for applying to the <strong>{{Program}}</strong> programme (Application No. {{Application_No}}). After careful review, we regret that we are unable to offer you admission in this round.</p>
<p><strong>Reason:</strong> {{Rejection_Reason}}</p>
<p>{{Detailed_Reason}}</p>
<p><strong>Other options you may consider:</strong><br/>{{Alternate_Options}}</p>
<p>You are welcome to apply again for the <strong>{{Next_Intake}}</strong> intake.</p>
<p>We wish you every success.</p>
<p>Sincerely,<br/>Admissions Committee<br/>{{Organization}}</p>`,
  },
  waitlist: {
    name: 'Standard Waitlist Letter',
    subject: 'Waitlist status - {{Application_No}}',
    bodyHtml: `<p style="text-align:right">Date: {{Date}}</p>
<p>Dear <strong>{{Name}}</strong>,</p>
<p>Thank you for applying to the <strong>{{Program}}</strong> programme (Application No. {{Application_No}}). You have been placed on the waitlist at rank <strong>{{Waitlist_Rank}}</strong>.</p>
<p>Seats are offered in rank order as they become available. If a seat becomes available for you, we will send you an offer letter by email and you will also see it in the applicant portal.</p>
<p>Sincerely,<br/>Admissions Committee<br/>{{Organization}}</p>`,
  },
};

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function formatLetterDate(value?: Date | string | null): string {
  if (!value) return '';
  const d = typeof value === 'string' ? new Date(value.length === 10 ? `${value}T00:00:00` : value) : value;
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
}

export function formatMoney(value?: number | string | null): string {
  const n = Number(value ?? 0);
  if (!n) return 'Nil';
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

@Injectable()
export class LetterTemplatesService {
  constructor(
    @InjectRepository(LetterTemplate)
    private readonly repo: Repository<LetterTemplate>,
  ) {}

  // Creates one standard template per type for an organization that has none
  // of that type, so letters can always be generated.
  async ensureDefaults(orgId: string): Promise<void> {
    for (const type of Object.keys(DEFAULT_TEMPLATES) as LetterTemplateType[]) {
      const count = await this.repo.count({ where: { organizationId: orgId, type } });
      if (count === 0) {
        const def = DEFAULT_TEMPLATES[type];
        await this.repo.save(
          this.repo.create({
            organizationId: orgId,
            type,
            name: def.name,
            subject: def.subject,
            bodyHtml: def.bodyHtml,
            status: 'active',
            isDefault: true,
            version: 1,
          }),
        );
      }
    }
  }

  async list(orgId: string, type?: string, status?: string) {
    await this.ensureDefaults(orgId);
    const where: any = { organizationId: orgId };
    if (type) where.type = type;
    if (status) where.status = status;
    return this.repo.find({ where, order: { type: 'ASC', isDefault: 'DESC', name: 'ASC' } });
  }

  async get(orgId: string, id: string) {
    const t = await this.repo.findOne({ where: { id, organizationId: orgId } });
    if (!t) throw new NotFoundException('Letter template not found');
    return t;
  }

  // Template to use: the requested one (must be active and of the right type),
  // otherwise the default active template of that type.
  async resolve(orgId: string, type: LetterTemplateType, templateId?: string | null): Promise<LetterTemplate> {
    if (templateId) {
      const t = await this.get(orgId, templateId);
      if (t.type !== type) throw new BadRequestException(`Template "${t.name}" is a ${t.type} template, not ${type}.`);
      if (t.status !== 'active') throw new BadRequestException(`Template "${t.name}" is inactive.`);
      return t;
    }
    await this.ensureDefaults(orgId);
    const t =
      (await this.repo.findOne({ where: { organizationId: orgId, type, status: 'active', isDefault: true } })) ||
      (await this.repo.findOne({ where: { organizationId: orgId, type, status: 'active' }, order: { updatedAt: 'DESC' } }));
    if (!t) throw new BadRequestException(`No active ${type} letter template exists. Activate one in Settings > Letter Templates.`);
    return t;
  }

  private async clearOtherDefaults(orgId: string, type: string, keepId: string) {
    await this.repo
      .createQueryBuilder()
      .update(LetterTemplate)
      .set({ isDefault: false })
      .where('organization_id = :orgId AND type = :type AND id != :keepId', { orgId, type, keepId })
      .execute();
  }

  async create(orgId: string, dto: LetterTemplateDto, actorId: string) {
    const t = await this.repo.save(
      this.repo.create({
        organizationId: orgId,
        name: dto.name,
        type: dto.type,
        subject: dto.subject ?? null,
        bodyHtml: dto.bodyHtml,
        status: dto.status ?? 'active',
        isDefault: !!dto.isDefault,
        version: 1,
        createdBy: actorId,
        updatedBy: actorId,
      }),
    );
    if (t.isDefault) await this.clearOtherDefaults(orgId, t.type, t.id);
    return t;
  }

  async update(orgId: string, id: string, dto: UpdateLetterTemplateDto, actorId: string) {
    const t = await this.get(orgId, id);
    const contentChanged =
      (dto.bodyHtml !== undefined && dto.bodyHtml !== t.bodyHtml) ||
      (dto.subject !== undefined && dto.subject !== t.subject);
    if (dto.name !== undefined) t.name = dto.name;
    if (dto.type !== undefined) t.type = dto.type;
    if (dto.subject !== undefined) t.subject = dto.subject;
    if (dto.bodyHtml !== undefined) t.bodyHtml = dto.bodyHtml;
    if (dto.status !== undefined) t.status = dto.status;
    if (dto.isDefault !== undefined) t.isDefault = dto.isDefault;
    if (t.isDefault && t.status !== 'active') {
      throw new BadRequestException('A default template must be active.');
    }
    if (contentChanged) t.version = (t.version || 1) + 1;
    t.updatedBy = actorId;
    const saved = await this.repo.save(t);
    if (saved.isDefault) await this.clearOtherDefaults(orgId, saved.type, saved.id);
    return saved;
  }

  async remove(orgId: string, id: string) {
    const t = await this.get(orgId, id);
    await this.repo.remove(t);
    return { id };
  }

  // Replaces {{Field}} merge fields. Values are HTML-escaped; multi-line
  // values keep their line breaks.
  render(bodyHtml: string, values: Record<string, unknown>): string {
    const lookup: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(values)) lookup[k.toLowerCase()] = v;
    return (bodyHtml || '').replace(/\{\{\s*([A-Za-z_]+)\s*\}\}/g, (match, key: string) => {
      const v = lookup[key.toLowerCase()];
      if (v === undefined) return match;
      return escapeHtml(v).replace(/\r?\n/g, '<br/>');
    });
  }

  renderText(text: string, values: Record<string, unknown>): string {
    const lookup: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(values)) lookup[k.toLowerCase()] = v;
    return (text || '').replace(/\{\{\s*([A-Za-z_]+)\s*\}\}/g, (match, key: string) => {
      const v = lookup[key.toLowerCase()];
      return v === undefined ? match : String(v ?? '');
    });
  }
}
