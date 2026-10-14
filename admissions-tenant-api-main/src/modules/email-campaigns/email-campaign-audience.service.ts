import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

export interface AudienceFilter {
  targetCourseId?: string | null;
  academicYear?: string | null;
  intakeTerm?: string | null;
  targetAudience?: string[] | null;
  segmentCriteria?: string[] | null;
  stopConditions?: string[] | null;
}

export interface AudienceMember {
  applicationId: string | null;
  leadId: string | null;
  applicationNo: string | null;
  name: string | null;
  firstName: string | null;
  email: string;
  program: string | null;
  audienceType: 'Prospects' | 'Applicants' | 'Admitted' | 'Waitlisted';
  formSubmitted: boolean;
  feePaid: boolean;
}

/** Narrows the audience to records created / submitted after a point in time (event triggers). */
export interface AudienceEventFilter {
  /** Signup: leads / applications created after `since` */
  createdAfter?: Date | null;
  /** Form Submission: applications submitted after `since` */
  submittedAfter?: Date | null;
  /** Deadline Missed: only incomplete applications / prospects without an application */
  incompleteOnly?: boolean;
}

const ADMITTED_STAGES = ['approved', 'admitted', 'offer accepted', 'offer released', 'enrolled'];
const PAID_STATUSES = ['paid', 'completed', 'success', 'captured', 'verified'];
const INACTIVE_LEAD_STATUSES = ['merged', 'disqualified', 'closed', 'converted'];

/**
 * Resolves an email campaign audience from the leads + applications tables.
 *
 *  - Prospects   : active leads (not merged / disqualified / closed / converted) with no application
 *  - Applicants  : applications that are not admitted or waitlisted
 *  - Admitted    : applications with an offer (decision 'offer_made') or an admitted stage
 *  - Waitlisted  : applications on the waitlist
 *
 * Segment criteria (Incomplete Application / Paid Fees / Attended Interview)
 * apply to application records; stop conditions (Form Submitted / Fee Paid)
 * remove recipients that already completed the action.
 */
@Injectable()
export class EmailCampaignAudienceService {
  private readonly logger = new Logger(EmailCampaignAudienceService.name);

  constructor(private readonly dataSource: DataSource) {}

  async resolve(orgId: string, f: AudienceFilter, ev: AudienceEventFilter = {}, limit = 20000): Promise<AudienceMember[]> {
    const audiences = f.targetAudience && f.targetAudience.length ? f.targetAudience : ['Prospects'];
    const segments = f.segmentCriteria || [];
    const stops = f.stopConditions || [];
    const byEmail = new Map<string, AudienceMember>();

    const wantsApps = audiences.some((a) => a !== 'Prospects');
    if (wantsApps) {
      const params: any[] = [orgId];
      const where: string[] = ['a.organization_id = $1', "COALESCE(a.email, '') <> ''"];
      if (f.targetCourseId) {
        params.push(f.targetCourseId);
        where.push(`a.course_id = $${params.length}`);
      }
      if (f.academicYear) {
        params.push(f.academicYear);
        where.push(`a.academic_session = $${params.length}`);
      }
      if (ev.createdAfter) {
        params.push(ev.createdAfter);
        where.push(`a.created_at > $${params.length}`);
      }
      if (ev.submittedAfter) {
        params.push(ev.submittedAfter);
        where.push(`a.submitted_at > $${params.length}`);
      }
      params.push(limit);
      const sql = `
        SELECT a.id, a.lead_id, a.application_no, a.name, a.email, COALESCE(a.program, c.name) AS program,
               (a.submitted_at IS NOT NULL OR LOWER(COALESCE(a.form_status, '')) = 'submitted') AS submitted,
               (LOWER(COALESCE(a.payment_status, '')) = ANY($${params.length + 1}::text[])) AS paid,
               (LOWER(COALESCE(a.current_stage, '')) = ANY($${params.length + 2}::text[])
                  OR EXISTS (SELECT 1 FROM admission_decisions d WHERE d.application_id = a.id AND d.final_decision = 'offer_made')) AS admitted,
               (LOWER(COALESCE(a.current_stage, '')) = 'waitlisted' OR a.waitlist_status IS NOT NULL
                  OR EXISTS (SELECT 1 FROM admission_decisions d WHERE d.application_id = a.id AND d.final_decision = 'waitlisted')) AS waitlisted
          FROM applications a
          LEFT JOIN courses c ON c.id = a.course_id
         WHERE ${where.join(' AND ')}
         ORDER BY a.created_at DESC
         LIMIT $${params.length}`;
      let rows: any[] = [];
      try {
        rows = await this.dataSource.query(sql, [...params, PAID_STATUSES, ADMITTED_STAGES]);
      } catch (err: any) {
        this.logger.warn(`Application audience query failed: ${err?.message}`);
      }

      let interviewed = new Set<string>();
      if (segments.includes('Attended Interview') && rows.length) {
        try {
          const ids = rows.map((r) => r.id);
          const iv = await this.dataSource.query(
            `SELECT DISTINCT application_id FROM interviews
              WHERE organization_id = $1 AND application_id = ANY($2::uuid[])
                AND LOWER(COALESCE(status, '')) IN ('completed', 'attended')`,
            [orgId, ids],
          );
          interviewed = new Set(iv.map((r: any) => r.application_id));
        } catch {
          interviewed = new Set();
        }
      }

      for (const r of rows) {
        const type: AudienceMember['audienceType'] = r.admitted ? 'Admitted' : r.waitlisted ? 'Waitlisted' : 'Applicants';
        if (!audiences.includes(type)) continue;
        if (segments.includes('Incomplete Application') && r.submitted) continue;
        if (segments.includes('Paid Fees') && !r.paid) continue;
        if (segments.includes('Attended Interview') && !interviewed.has(r.id)) continue;
        if (ev.incompleteOnly && r.submitted) continue;
        if (stops.includes('Form Submitted') && r.submitted) continue;
        if (stops.includes('Fee Paid') && r.paid) continue;
        const email = String(r.email).trim().toLowerCase();
        if (!email.includes('@') || byEmail.has(email)) continue;
        byEmail.set(email, {
          applicationId: r.id,
          leadId: r.lead_id || null,
          applicationNo: r.application_no || null,
          name: r.name || null,
          firstName: r.name ? String(r.name).trim().split(/\s+/)[0] : null,
          email,
          program: r.program || null,
          audienceType: type,
          formSubmitted: !!r.submitted,
          feePaid: !!r.paid,
        });
      }
    }

    // Form Submission triggers only concern applications.
    if (audiences.includes('Prospects') && !ev.submittedAfter) {
      const params: any[] = [orgId, INACTIVE_LEAD_STATUSES];
      const where: string[] = [
        'l.organization_id = $1',
        "COALESCE(l.email, '') <> ''",
        'NOT (LOWER(COALESCE(l.status, \'\')) = ANY($2::text[]))',
        'NOT EXISTS (SELECT 1 FROM applications a WHERE a.lead_id = l.id)',
      ];
      if (f.targetCourseId) {
        params.push(f.targetCourseId);
        where.push(`l.course_id = $${params.length}`);
      }
      if (f.intakeTerm) {
        params.push(`%${f.intakeTerm}%`);
        where.push(`COALESCE(l.intake, '') ILIKE $${params.length}`);
      }
      if (ev.createdAfter) {
        params.push(ev.createdAfter);
        where.push(`l.created_at > $${params.length}`);
      }
      params.push(limit);
      try {
        const rows = await this.dataSource.query(
          `SELECT l.id, l.first_name, l.last_name, l.email, COALESCE(c.name, l.program_interest) AS program
             FROM leads l
             LEFT JOIN courses c ON c.id = l.course_id
            WHERE ${where.join(' AND ')}
            ORDER BY l.created_at DESC
            LIMIT $${params.length}`,
          params,
        );
        for (const r of rows) {
          const email = String(r.email).trim().toLowerCase();
          if (!email.includes('@') || byEmail.has(email)) continue;
          const name = [r.first_name, r.last_name].filter(Boolean).join(' ').trim() || null;
          byEmail.set(email, {
            applicationId: null,
            leadId: r.id,
            applicationNo: null,
            name,
            firstName: r.first_name || (name ? name.split(/\s+/)[0] : null),
            email,
            program: r.program || null,
            audienceType: 'Prospects',
            formSubmitted: false,
            feePaid: false,
          });
        }
      } catch (err: any) {
        this.logger.warn(`Prospect audience query failed: ${err?.message}`);
      }
    }

    return Array.from(byEmail.values()).slice(0, limit);
  }

  /** Current stop-condition state of one recipient (checked right before each send). */
  async stopReason(applicationId: string | null, leadId: string | null, stops: string[]): Promise<string | null> {
    if (!stops?.length) return null;
    try {
      const rows: any[] = applicationId
        ? await this.dataSource.query(
            `SELECT submitted_at, form_status, payment_status FROM applications WHERE id = $1`,
            [applicationId],
          )
        : leadId
          ? await this.dataSource.query(
              `SELECT submitted_at, form_status, payment_status FROM applications WHERE lead_id = $1 ORDER BY created_at DESC LIMIT 1`,
              [leadId],
            )
          : [];
      const r = rows[0];
      if (!r) return null;
      if (stops.includes('Form Submitted') && (r.submitted_at || String(r.form_status || '').toLowerCase() === 'submitted')) {
        return 'Form Submitted';
      }
      if (stops.includes('Fee Paid') && PAID_STATUSES.includes(String(r.payment_status || '').toLowerCase())) return 'Fee Paid';
    } catch {
      return null;
    }
    return null;
  }
}
