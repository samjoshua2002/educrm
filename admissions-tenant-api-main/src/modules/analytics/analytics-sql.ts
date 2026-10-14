/**
 * Shared SQL building blocks for the analytics reports.
 *
 * Several foreign-key columns in this schema are varchar while the referenced
 * primary keys are uuid (e.g. applications.lead_id, payment_orders.application_id),
 * so every join compares `::text` on both sides.
 */

export interface AnalyticsFilters {
  /** ISO date (inclusive) */
  from?: string;
  /** ISO date (inclusive) */
  to?: string;
  courseId?: string;
  branchId?: string;
  academicSession?: string;
  counselorId?: string;
}

/** Positional-parameter collector for DataSource.query(). */
export class SqlParams {
  readonly values: any[] = [];
  add(value: any): string {
    this.values.push(value);
    return `$${this.values.length}`;
  }
}

export function normalizeFilters(raw: Record<string, any> | undefined): AnalyticsFilters {
  const clean = (v: any) => (typeof v === 'string' && v.trim() && v !== 'all' ? v.trim() : undefined);
  const date = (v: any) => {
    const s = clean(v);
    if (!s) return undefined;
    const d = new Date(s);
    return isNaN(d.getTime()) ? undefined : s;
  };
  return {
    from: date(raw?.from),
    to: date(raw?.to),
    courseId: clean(raw?.courseId),
    branchId: clean(raw?.branchId),
    academicSession: clean(raw?.academicSession),
    counselorId: clean(raw?.counselorId),
  };
}

/** Exclusive upper bound for an inclusive `to` date. */
export function endExclusive(to: string): string {
  const d = new Date(to);
  if (/^\d{4}-\d{2}-\d{2}$/.test(to)) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString();
}

export function dateRange(col: string, f: AnalyticsFilters, p: SqlParams): string[] {
  const out: string[] = [];
  if (f.from) out.push(`${col} >= ${p.add(new Date(f.from).toISOString())}`);
  if (f.to) out.push(`${col} < ${p.add(endExclusive(f.to))}`);
  return out;
}

/** Per-application revenue (paid payment orders + offline-marked application fee). */
export function appRevenueCte(orgParam: string): string {
  return `
  app_rev AS (
    SELECT a.id::text AS application_id,
      COALESCE(p.paid, 0)
      + CASE WHEN COALESCE(p.app_fee_paid, 0) = 0
              AND LOWER(COALESCE(a.payment_status, '')) IN ('paid', 'success', 'completed', 'captured')
             THEN COALESCE(a.payment_amount, 0) ELSE 0 END AS revenue
    FROM applications a
    LEFT JOIN (
      SELECT po.application_id::text AS application_id,
             SUM(po.amount) AS paid,
             SUM(CASE WHEN po.purpose::text = 'application_fee' THEN po.amount ELSE 0 END) AS app_fee_paid
      FROM payment_orders po
      WHERE po.status::text = 'paid'
      GROUP BY 1
    ) p ON p.application_id = a.id::text
    WHERE a.organization_id::text = ${orgParam}
  )`;
}

/**
 * `af` = one row per application of the organization with every funnel flag
 * already made monotonic (an application that reached a later stage is
 * counted in every earlier stage too).
 */
export function appFactsCte(orgParam: string): string {
  return `
  ${appRevenueCte(orgParam)},
  app_iv AS (
    SELECT i.application_id::text AS application_id,
      BOOL_OR(i.status = 'Completed') AS completed,
      MIN(CASE WHEN i.status = 'Completed' THEN COALESCE(s.start_time, i.updated_at) END) AS completed_at,
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE i.status IN ('Scheduled', 'Rescheduled')) AS pending
    FROM interviews i
    LEFT JOIN interview_slots s ON s.id::text = i.slot_id::text
    WHERE i.organization_id::text = ${orgParam}
    GROUP BY 1
  ),
  app_sl AS (
    SELECT aa.application_id::text AS application_id, MIN(aa.created_at) AS at
    FROM application_activities aa
    WHERE aa.organization_id::text = ${orgParam} AND aa.new_status = 'Shortlisted'
    GROUP BY 1
  ),
  app_offer AS (
    SELECT d.application_id::text AS application_id, MIN(COALESCE(d.decision_date, d.updated_at)) AS at
    FROM admission_decisions d
    WHERE d.organization_id::text = ${orgParam} AND d.final_decision = 'offer_made'
    GROUP BY 1
  ),
  app_acc AS (
    SELECT ol.application_id::text AS application_id,
      BOOL_OR(oa.acceptance_status::text = 'accepted') AS accepted,
      MIN(CASE WHEN oa.acceptance_status::text = 'accepted' THEN COALESCE(oa.candidate_confirmation_date, oa.updated_at) END) AS accepted_at,
      BOOL_OR(oa.enrollment_status = 'confirmed') AS enrolled,
      MIN(CASE WHEN oa.enrollment_status = 'confirmed' THEN oa.updated_at END) AS enrolled_at,
      BOOL_OR(oa.acceptance_status::text IN ('declined', 'expired')) AS declined
    FROM offer_acceptances oa
    JOIN offer_letters ol ON ol.id::text = oa.offer_letter_id::text
    WHERE ol.organization_id::text = ${orgParam}
    GROUP BY 1
  ),
  app_raw AS (
    SELECT a.id::text AS id,
      a.lead_id::text AS lead_id,
      a.course_id::text AS course_id,
      COALESCE(c.name, NULLIF(a.program, ''), 'Unspecified') AS program,
      c.total_seats AS seats,
      a.branch_id::text AS branch_id,
      a.academic_session,
      a.created_at,
      a.submitted_at,
      a.gender,
      a.date_of_birth,
      a.form_status,
      a.shortlist_status,
      a.claimed_experience_months,
      a.validated_experience_months,
      COALESCE(a.assigned_counselor_id::text, l.assigned_to::text) AS counselor_id,
      l.created_at AS lead_created_at,
      (a.submitted_at IS NOT NULL OR LOWER(COALESCE(a.form_status, '')) IN ('submitted', 'accepted', 'rejected', 'verified', 'under_review', 'completed')) AS s_submitted,
      (a.shortlist_status = 'Shortlisted' OR sl.at IS NOT NULL) AS s_shortlisted,
      sl.at AS shortlisted_at,
      COALESCE(iv.completed, false) AS s_interviewed,
      iv.completed_at,
      COALESCE(iv.total, 0) AS interviews_total,
      COALESCE(iv.pending, 0) AS interviews_pending,
      (o.application_id IS NOT NULL) AS s_offered,
      o.at AS offered_at,
      COALESCE(ac.accepted, false) AS s_accepted,
      ac.accepted_at,
      COALESCE(ac.enrolled, false) AS s_enrolled,
      ac.enrolled_at,
      COALESCE(ac.declined, false) AS declined,
      COALESCE(r.revenue, 0) AS revenue
    FROM applications a
    LEFT JOIN leads l ON l.id::text = a.lead_id::text
    LEFT JOIN courses c ON c.id::text = a.course_id::text
    LEFT JOIN app_iv iv ON iv.application_id = a.id::text
    LEFT JOIN app_sl sl ON sl.application_id = a.id::text
    LEFT JOIN app_offer o ON o.application_id = a.id::text
    LEFT JOIN app_acc ac ON ac.application_id = a.id::text
    LEFT JOIN app_rev r ON r.application_id = a.id::text
    WHERE a.organization_id::text = ${orgParam}
  ),
  af AS (
    SELECT r.*,
      (r.s_enrolled) AS enrolled,
      (r.s_accepted OR r.s_enrolled) AS accepted,
      (r.s_offered OR r.s_accepted OR r.s_enrolled) AS offered,
      (r.s_interviewed OR r.s_offered OR r.s_accepted OR r.s_enrolled) AS interviewed,
      (r.s_shortlisted OR r.s_interviewed OR r.s_offered OR r.s_accepted OR r.s_enrolled) AS shortlisted,
      (r.s_submitted OR r.s_shortlisted OR r.s_interviewed OR r.s_offered OR r.s_accepted OR r.s_enrolled) AS submitted
    FROM app_raw r
  )`;
}

/** WHERE conditions (without "WHERE") on the `af` CTE for the given filters. */
export function appFilterSql(f: AnalyticsFilters, p: SqlParams, alias = 'af'): string {
  const c: string[] = ['1=1', ...dateRange(`${alias}.created_at`, f, p)];
  if (f.courseId) c.push(`${alias}.course_id = ${p.add(f.courseId)}`);
  if (f.branchId) c.push(`${alias}.branch_id = ${p.add(f.branchId)}`);
  if (f.academicSession) c.push(`${alias}.academic_session = ${p.add(f.academicSession)}`);
  if (f.counselorId) c.push(`${alias}.counselor_id = ${p.add(f.counselorId)}`);
  return c.join(' AND ');
}

/** WHERE conditions on leads alias `l` (organization condition included). */
export function leadFilterSql(orgParam: string, f: AnalyticsFilters, p: SqlParams, alias = 'l'): string {
  const c: string[] = [`${alias}.organization_id::text = ${orgParam}`, ...dateRange(`${alias}.created_at`, f, p)];
  if (f.courseId) c.push(`${alias}.course_id::text = ${p.add(f.courseId)}`);
  if (f.branchId) c.push(`${alias}.branch_id::text = ${p.add(f.branchId)}`);
  if (f.counselorId) c.push(`${alias}.assigned_to::text = ${p.add(f.counselorId)}`);
  if (f.academicSession) {
    // Leads carry no session: keep leads not tied to an application of another session.
    c.push(
      `NOT EXISTS (SELECT 1 FROM applications ax WHERE ax.lead_id::text = ${alias}.id::text AND ax.academic_session <> ${p.add(f.academicSession)})`,
    );
  }
  return c.join(' AND ');
}

export const num = (v: any): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export const pct = (part: number, whole: number): number =>
  whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0;

export const round = (v: any, digits = 1): number | null => {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  const f = Math.pow(10, digits);
  return Math.round(n * f) / f;
};
