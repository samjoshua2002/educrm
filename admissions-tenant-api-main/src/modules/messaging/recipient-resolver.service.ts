import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Application } from '../applications/entities/application.entity.js';
import { Lead } from '../leads/entities/lead.entity.js';

export interface ResolvedRecipient {
  organizationId: string | null;
  applicationId: string | null;
  leadId: string | null;
  applicationNo: string | null;
  name: string | null;
  firstName: string | null;
  email: string | null;
  phone: string | null;
  program: string | null;
  courseId: string | null;
  academicSession: string | null;
  assignedUserId: string | null;
}

export function digitsOnly(v: string | null | undefined): string {
  return String(v || '').replace(/\D+/g, '');
}

/**
 * Splits a raw phone number into country code + national number.
 * "+91 98765 43210" → { countryCode: '91', national: '9876543210' }
 */
export function normalizePhone(
  raw: string | null | undefined,
  countryCode?: string | null,
  defaultCountryCode = '91',
): { countryCode: string; national: string; e164: string } | null {
  const d = digitsOnly(raw);
  if (d.length < 6) return null;
  let cc = digitsOnly(countryCode) || '';
  let national = d;
  if (cc && d.startsWith(cc) && d.length > 10) {
    national = d.slice(cc.length);
  } else if (!cc && d.length > 10) {
    cc = d.slice(0, d.length - 10);
    national = d.slice(-10);
  }
  national = national.replace(/^0+/, '');
  if (!cc) cc = digitsOnly(defaultCountryCode) || '91';
  return { countryCode: cc, national, e164: `+${cc}${national}` };
}

/** Looks up applicant / lead details used for personalisation and addressing. */
@Injectable()
export class RecipientResolverService {
  constructor(private readonly dataSource: DataSource) {}

  async fromApplication(applicationId: string, orgId?: string | null): Promise<ResolvedRecipient | null> {
    const app = await this.dataSource.getRepository(Application).findOne({
      where: orgId ? { id: applicationId, organizationId: orgId } : { id: applicationId },
      relations: ['course'],
    });
    if (!app) return null;
    return {
      organizationId: app.organizationId,
      applicationId: app.id,
      leadId: app.leadId || null,
      applicationNo: app.applicationNo || null,
      name: app.name || null,
      firstName: app.name ? app.name.trim().split(/\s+/)[0] : null,
      email: app.email || null,
      phone: app.primaryMobile || null,
      program: app.program || (app as any).course?.name || null,
      courseId: app.courseId || null,
      academicSession: app.academicSession || null,
      assignedUserId: app.assignedCounselorId || null,
    };
  }

  async fromLead(leadId: string, orgId?: string | null): Promise<ResolvedRecipient | null> {
    const lead = await this.dataSource.getRepository(Lead).findOne({
      where: orgId ? { id: leadId, organizationId: orgId } : { id: leadId },
      relations: ['course'],
    });
    if (!lead) return null;
    const app = await this.dataSource
      .getRepository(Application)
      .findOne({ where: { leadId: lead.id }, order: { createdAt: 'DESC' } });
    const name = [lead.firstName, lead.lastName].filter(Boolean).join(' ').trim() || null;
    return {
      organizationId: lead.organizationId,
      applicationId: app?.id || null,
      leadId: lead.id,
      applicationNo: app?.applicationNo || null,
      name,
      firstName: lead.firstName || null,
      email: lead.email || null,
      phone: lead.phone || null,
      program: lead.course?.name || app?.program || null,
      courseId: lead.courseId || null,
      academicSession: app?.academicSession || null,
      assignedUserId: lead.assignedTo || null,
    };
  }

  async resolve(opts: { applicationId?: string | null; leadId?: string | null; orgId?: string | null }) {
    if (opts.applicationId) return this.fromApplication(opts.applicationId, opts.orgId);
    if (opts.leadId) return this.fromLead(opts.leadId, opts.orgId);
    return null;
  }

  /** Finds an application / lead whose phone matches (last 10 digits). */
  async findByPhone(orgId: string, phone: string): Promise<ResolvedRecipient | null> {
    const last10 = digitsOnly(phone).slice(-10);
    if (last10.length < 6) return null;
    const app = await this.dataSource
      .getRepository(Application)
      .createQueryBuilder('a')
      .where('a.organization_id = :orgId', { orgId })
      .andWhere(
        "(RIGHT(regexp_replace(COALESCE(a.primary_mobile, ''), '\\D', '', 'g'), 10) = :p OR RIGHT(regexp_replace(COALESCE(a.alternate_mobile, ''), '\\D', '', 'g'), 10) = :p)",
        { p: last10 },
      )
      .orderBy('a.created_at', 'DESC')
      .getOne();
    if (app) return this.fromApplication(app.id, orgId);
    const lead = await this.dataSource
      .getRepository(Lead)
      .createQueryBuilder('l')
      .where('l.organization_id = :orgId', { orgId })
      .andWhere("RIGHT(regexp_replace(COALESCE(l.phone, ''), '\\D', '', 'g'), 10) = :p", { p: last10 })
      .orderBy('l.created_at', 'DESC')
      .getOne();
    if (lead) return this.fromLead(lead.id, orgId);
    return null;
  }
}
