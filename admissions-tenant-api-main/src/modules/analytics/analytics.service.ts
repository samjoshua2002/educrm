import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  AnalyticsFilters,
  SqlParams,
  appFactsCte,
  appFilterSql,
  leadFilterSql,
  dateRange,
  num,
  pct,
  round,
} from './analytics-sql.js';

export const FUNNEL_STAGES = [
  { key: 'leads', label: 'Lead Created', source: 'Leads.Created Time' },
  { key: 'started', label: 'Application Started', source: 'Applications.Status = Started' },
  { key: 'submitted', label: 'Application Submitted', source: 'Applications.Status = Submitted' },
  { key: 'shortlisted', label: 'Shortlisted', source: 'Applications.Status = Shortlisted' },
  { key: 'interviewed', label: 'Interview Completed', source: 'Interviews.Status = Completed' },
  { key: 'offered', label: 'Offer Issued', source: 'Admission Decisions.Final Decision = Offer' },
  { key: 'accepted', label: 'Offer Accepted', source: 'Offer Acceptances.Status = Accepted' },
  { key: 'enrolled', label: 'Enrolled', source: 'Enrollment Status = Confirmed' },
] as const;

const CLOSURE_REASON_LABELS: Record<string, string> = {
  not_interested: 'Not Interested',
  enrolled_elsewhere: 'Enrolled Elsewhere',
  unreachable: 'Unreachable',
  invalid_contact: 'Invalid Contact',
  do_not_call: 'Do Not Call',
  financial_constraints: 'Financial Constraints',
  timing_mismatch: 'Timing Mismatch',
  other: 'Other',
};

/** Default first-response SLA for a newly assigned lead, in hours. */
export const DEFAULT_SLA_HOURS = Number(process.env.LEAD_RESPONSE_SLA_HOURS) || 24;

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly ds: DataSource) {}

  /** Runs a query and returns [] on failure, so one broken metric never breaks a whole report. */
  async q<T = any>(sql: string, params: any[] = [], label = 'query'): Promise<T[]> {
    try {
      return await this.ds.query(sql, params);
    } catch (err) {
      this.logger.warn(`Analytics ${label} failed: ${(err as Error).message}`);
      return [];
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Filter options
  // ─────────────────────────────────────────────────────────────────────────
  async filterOptions(orgId: string) {
    const [courses, branches, sessionsFromApps, sessionsTable, counselors, sources, leadStatuses, appStatuses, campaigns] =
      await Promise.all([
        this.q(`SELECT id, name, code, total_seats AS "totalSeats" FROM courses WHERE organization_id::text = $1 ORDER BY name`, [orgId], 'courses'),
        this.q(`SELECT id, name, city, state FROM branches WHERE organization_id::text = $1 ORDER BY name`, [orgId], 'branches'),
        this.q(`SELECT DISTINCT academic_session AS name FROM applications WHERE organization_id::text = $1 AND academic_session IS NOT NULL ORDER BY 1 DESC`, [orgId], 'sessions'),
        this.q(`SELECT * FROM academic_sessions WHERE organization_id::text = $1`, [orgId], 'academic_sessions'),
        this.q(
          `SELECT id, name, role, branch_id AS "branchId" FROM users
           WHERE organization_id::text = $1 AND role::text IN ('counselor', 'lead_manager', 'org_admin', 'application_manager')
           ORDER BY name`,
          [orgId],
          'counselors',
        ),
        this.q(`SELECT DISTINCT source FROM leads WHERE organization_id::text = $1 AND source IS NOT NULL AND source <> '' ORDER BY 1`, [orgId], 'sources'),
        this.q(`SELECT status, COUNT(*)::int AS count FROM leads WHERE organization_id::text = $1 GROUP BY 1 ORDER BY 1`, [orgId], 'lead statuses'),
        this.q(`SELECT form_status AS status, COUNT(*)::int AS count FROM applications WHERE organization_id::text = $1 GROUP BY 1 ORDER BY 1`, [orgId], 'app statuses'),
        this.q(`SELECT id, name, source_type AS "sourceType" FROM marketing_campaigns WHERE organization_id::text = $1 ORDER BY created_at DESC`, [orgId], 'campaigns'),
      ]);

    const sessionNames = new Set<string>();
    sessionsFromApps.forEach((s: any) => s.name && sessionNames.add(String(s.name)));
    sessionsTable.forEach((s: any) => {
      const n = s.name || s.session_name || s.title || s.code;
      if (n) sessionNames.add(String(n));
    });

    return {
      courses,
      branches,
      academicSessions: Array.from(sessionNames).sort().reverse(),
      counselors,
      leadSources: sources.map((s: any) => s.source),
      leadStatuses,
      applicationStatuses: appStatuses,
      campaigns,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 1. Funnel analytics
  // ─────────────────────────────────────────────────────────────────────────
  async funnel(orgId: string, f: AnalyticsFilters) {
    const p = new SqlParams();
    const org = p.add(orgId);
    const where = appFilterSql(f, p);
    const leadWhere = leadFilterSql(org, f, p);

    const sql = `
      WITH ${appFactsCte(org)},
      cohort AS (SELECT * FROM af WHERE ${where})
      SELECT
        (SELECT COUNT(*) FROM leads l WHERE ${leadWhere}) AS leads,
        COUNT(*) AS started,
        COUNT(*) FILTER (WHERE submitted) AS submitted,
        COUNT(*) FILTER (WHERE shortlisted) AS shortlisted,
        COUNT(*) FILTER (WHERE interviewed) AS interviewed,
        COUNT(*) FILTER (WHERE offered) AS offered,
        COUNT(*) FILTER (WHERE accepted) AS accepted,
        COUNT(*) FILTER (WHERE enrolled) AS enrolled,
        AVG(EXTRACT(EPOCH FROM (created_at - lead_created_at)) / 86400) FILTER (WHERE lead_created_at IS NOT NULL AND created_at >= lead_created_at) AS t_started,
        AVG(EXTRACT(EPOCH FROM (submitted_at - created_at)) / 86400) FILTER (WHERE submitted_at IS NOT NULL AND submitted_at >= created_at) AS t_submitted,
        AVG(EXTRACT(EPOCH FROM (shortlisted_at - submitted_at)) / 86400) FILTER (WHERE shortlisted_at IS NOT NULL AND submitted_at IS NOT NULL AND shortlisted_at >= submitted_at) AS t_shortlisted,
        AVG(EXTRACT(EPOCH FROM (completed_at - COALESCE(shortlisted_at, submitted_at))) / 86400) FILTER (WHERE completed_at IS NOT NULL AND COALESCE(shortlisted_at, submitted_at) IS NOT NULL AND completed_at >= COALESCE(shortlisted_at, submitted_at)) AS t_interviewed,
        AVG(EXTRACT(EPOCH FROM (offered_at - completed_at)) / 86400) FILTER (WHERE offered_at IS NOT NULL AND completed_at IS NOT NULL AND offered_at >= completed_at) AS t_offered,
        AVG(EXTRACT(EPOCH FROM (accepted_at - offered_at)) / 86400) FILTER (WHERE accepted_at IS NOT NULL AND offered_at IS NOT NULL AND accepted_at >= offered_at) AS t_accepted,
        AVG(EXTRACT(EPOCH FROM (enrolled_at - accepted_at)) / 86400) FILTER (WHERE enrolled_at IS NOT NULL AND accepted_at IS NOT NULL AND enrolled_at >= accepted_at) AS t_enrolled,
        COALESCE(SUM(revenue), 0) AS revenue
      FROM cohort`;
    const [row] = await this.q(sql, p.values, 'funnel');
    const r = row || {};

    const stages = FUNNEL_STAGES.map((s, i) => {
      const count = num(r[s.key]);
      const prev = i > 0 ? num(r[FUNNEL_STAGES[i - 1].key]) : count;
      const next = i < FUNNEL_STAGES.length - 1 ? num(r[FUNNEL_STAGES[i + 1].key]) : null;
      return {
        key: s.key,
        label: s.label,
        source: s.source,
        count,
        conversionFromPrevious: i === 0 ? 100 : pct(count, prev),
        conversionFromStart: pct(count, num(r.leads) || num(r.started)),
        dropOff: next === null ? 0 : Math.max(0, Math.round((100 - pct(next, count)) * 10) / 10),
        dropOffCount: next === null ? 0 : Math.max(0, count - next),
        avgDaysFromPrevious: i === 0 ? null : round(r[`t_${s.key}`]),
      };
    });

    const byProgram = await this.funnelByProgram(orgId, f);
    const trend = await this.monthlyTrend(orgId, f);

    return {
      filters: f,
      stages,
      metrics: {
        leadToApplication: pct(num(r.started), num(r.leads)),
        applicationToInterview: pct(num(r.interviewed), num(r.started)),
        interviewToOffer: pct(num(r.offered), num(r.interviewed)),
        offerToAcceptance: pct(num(r.accepted), num(r.offered)),
        offerToAdmission: pct(num(r.enrolled), num(r.offered)),
        overallConversion: pct(num(r.enrolled), num(r.leads)),
        totalRevenue: num(r.revenue),
        avgDaysLeadToEnrolment: stages
          .slice(1)
          .reduce((sum, s) => (s.avgDaysFromPrevious !== null ? sum + s.avgDaysFromPrevious : sum), 0),
      },
      byProgram,
      trend,
    };
  }

  async funnelByProgram(orgId: string, f: AnalyticsFilters) {
    const p = new SqlParams();
    const org = p.add(orgId);
    const where = appFilterSql(f, p);
    const rows = await this.q(
      `WITH ${appFactsCte(org)}
       SELECT course_id AS "courseId", program, MAX(seats) AS seats,
         COUNT(*)::int AS started,
         COUNT(*) FILTER (WHERE submitted)::int AS submitted,
         COUNT(*) FILTER (WHERE shortlisted)::int AS shortlisted,
         COUNT(*) FILTER (WHERE interviewed)::int AS interviewed,
         COUNT(*) FILTER (WHERE offered)::int AS offered,
         COUNT(*) FILTER (WHERE accepted)::int AS accepted,
         COUNT(*) FILTER (WHERE enrolled)::int AS enrolled,
         COALESCE(SUM(revenue), 0) AS revenue
       FROM af WHERE ${where}
       GROUP BY course_id, program
       ORDER BY started DESC`,
      p.values,
      'funnel by program',
    );
    return rows.map((r: any) => ({
      courseId: r.courseId,
      program: r.program,
      seats: r.seats === null ? null : num(r.seats),
      started: num(r.started),
      submitted: num(r.submitted),
      shortlisted: num(r.shortlisted),
      interviewed: num(r.interviewed),
      offered: num(r.offered),
      accepted: num(r.accepted),
      enrolled: num(r.enrolled),
      revenue: num(r.revenue),
      offerRate: pct(num(r.offered), num(r.started)),
      offerToAcceptance: pct(num(r.accepted), num(r.offered)),
      seatUtilization: r.seats ? pct(num(r.enrolled), num(r.seats)) : null,
    }));
  }

  /** Month-by-month leads, applications, submissions, offers, enrolments and revenue. */
  async monthlyTrend(orgId: string, f: AnalyticsFilters, months = 12) {
    const end = f.to ? new Date(f.to) : new Date();
    const start = f.from ? new Date(f.from) : new Date(end.getFullYear(), end.getMonth() - (months - 1), 1);
    const p = new SqlParams();
    const org = p.add(orgId);
    const startP = p.add(new Date(start.getFullYear(), start.getMonth(), 1).toISOString());
    const endP = p.add(end.toISOString());
    const fNoDate: AnalyticsFilters = { ...f, from: undefined, to: undefined };
    const where = appFilterSql(fNoDate, p);
    const leadWhere = leadFilterSql(org, fNoDate, p);

    const rows = await this.q(
      `WITH ${appFactsCte(org)},
       months AS (
         SELECT generate_series(date_trunc('month', ${startP}::timestamp), date_trunc('month', ${endP}::timestamp), interval '1 month') AS m
       ),
       cohort AS (SELECT * FROM af WHERE ${where})
       SELECT to_char(m, 'YYYY-MM') AS month,
         (SELECT COUNT(*) FROM leads l WHERE ${leadWhere} AND date_trunc('month', l.created_at) = m)::int AS leads,
         (SELECT COUNT(*) FROM cohort WHERE date_trunc('month', created_at) = m)::int AS applications,
         (SELECT COUNT(*) FROM cohort WHERE date_trunc('month', submitted_at) = m)::int AS submitted,
         (SELECT COUNT(*) FROM cohort WHERE date_trunc('month', offered_at) = m)::int AS offers,
         (SELECT COUNT(*) FROM cohort WHERE date_trunc('month', enrolled_at) = m)::int AS enrolled,
         (SELECT COALESCE(SUM(po.amount), 0) FROM payment_orders po JOIN cohort c ON c.id = po.application_id::text
            WHERE po.status::text = 'paid' AND date_trunc('month', COALESCE(po.paid_at, po.created_at)) = m) AS revenue
       FROM months ORDER BY m`,
      p.values,
      'monthly trend',
    );
    return rows.map((r: any) => ({
      month: r.month,
      leads: num(r.leads),
      applications: num(r.applications),
      submitted: num(r.submitted),
      offers: num(r.offers),
      enrolled: num(r.enrolled),
      revenue: num(r.revenue),
    }));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 2. Campaign performance
  // ─────────────────────────────────────────────────────────────────────────
  async campaigns(orgId: string, f: AnalyticsFilters) {
    const p = new SqlParams();
    const org = p.add(orgId);
    const leadWhere = leadFilterSql(org, { ...f, academicSession: undefined }, p);
    const appExtra: string[] = [];
    if (f.academicSession) appExtra.push(`af.academic_session = ${p.add(f.academicSession)}`);

    const campaignDate: string[] = [];
    if (f.from) campaignDate.push(`(mc.end_date IS NULL OR mc.end_date >= ${p.add(f.from.slice(0, 10))}::date)`);
    if (f.to) campaignDate.push(`(mc.start_date IS NULL OR mc.start_date <= ${p.add(f.to.slice(0, 10))}::date)`);

    const leadStatsCte = `
      WITH ${appFactsCte(org)},
      lc AS (
        SELECT l.id::text AS id, l.created_at,
          COALESCE(l.campaign_id::text, mcu.id::text) AS campaign_id,
          NULLIF(TRIM(l.source), '') AS source,
          NULLIF(TRIM(l.utm_source), '') AS utm_source,
          NULLIF(TRIM(l.utm_medium), '') AS utm_medium,
          l.state, l.country
        FROM leads l
        LEFT JOIN LATERAL (
          SELECT mc.id FROM marketing_campaigns mc
          WHERE l.campaign_id IS NULL AND mc.organization_id::text = l.organization_id::text
            AND mc.utm_campaign IS NOT NULL AND l.utm_campaign IS NOT NULL
            AND LOWER(mc.utm_campaign) = LOWER(l.utm_campaign)
          ORDER BY mc.created_at DESC LIMIT 1
        ) mcu ON true
        WHERE ${leadWhere}
      ),
      ls AS (
        SELECT lc.id, lc.campaign_id, lc.source, lc.utm_source, lc.utm_medium, lc.created_at,
          COUNT(af.id) AS applications,
          COUNT(af.id) FILTER (WHERE af.submitted) AS submitted,
          COUNT(af.id) FILTER (WHERE af.offered) AS offers,
          COUNT(af.id) FILTER (WHERE af.accepted) AS accepted,
          COUNT(af.id) FILTER (WHERE af.enrolled) AS enrolled,
          COALESCE(SUM(af.revenue), 0) AS revenue
        FROM lc
        LEFT JOIN af ON af.lead_id = lc.id ${appExtra.length ? 'AND ' + appExtra.join(' AND ') : ''}
        GROUP BY lc.id, lc.campaign_id, lc.source, lc.utm_source, lc.utm_medium, lc.created_at
      ),
      mcf AS (
        SELECT mc.* FROM marketing_campaigns mc
        WHERE mc.organization_id::text = ${org} ${campaignDate.length ? 'AND ' + campaignDate.join(' AND ') : ''}
      )`;


    const [campaignRows, channelRows, sourceRows, totals] = await Promise.all([
      this.q(
        `${leadStatsCte}
         SELECT mc.id, mc.name, mc.source_type AS "sourceType", mc.sub_source AS "subSource", mc.status,
           mc.start_date AS "startDate", mc.end_date AS "endDate", COALESCE(mc.cost, 0) AS cost, mc.currency,
           COUNT(ls.id)::int AS leads,
           COALESCE(SUM(ls.applications), 0)::int AS applications,
           COALESCE(SUM(ls.submitted), 0)::int AS submitted,
           COALESCE(SUM(ls.offers), 0)::int AS offers,
           COALESCE(SUM(ls.accepted), 0)::int AS accepted,
           COALESCE(SUM(ls.enrolled), 0)::int AS enrolled,
           COALESCE(SUM(ls.revenue), 0) AS revenue
         FROM mcf mc
         LEFT JOIN ls ON ls.campaign_id = mc.id::text
         GROUP BY mc.id, mc.name, mc.source_type, mc.sub_source, mc.status, mc.start_date, mc.end_date, mc.cost, mc.currency
         ORDER BY revenue DESC, leads DESC`,
        p.values,
        'campaigns',
      ),
      this.q(
        `${leadStatsCte}
         SELECT COALESCE(NULLIF(mc.source_type, ''), ls.source, 'Unknown') AS channel,
           COUNT(ls.id)::int AS leads,
           COALESCE(SUM(ls.applications), 0)::int AS applications,
           COALESCE(SUM(ls.offers), 0)::int AS offers,
           COALESCE(SUM(ls.accepted), 0)::int AS accepted,
           COALESCE(SUM(ls.enrolled), 0)::int AS enrolled,
           COALESCE(SUM(ls.revenue), 0) AS revenue
         FROM ls LEFT JOIN marketing_campaigns mc ON mc.id::text = ls.campaign_id
         GROUP BY 1 ORDER BY leads DESC`,
        p.values,
        'channels',
      ),
      this.q(
        `${leadStatsCte}
         SELECT COALESCE(ls.utm_source, ls.source, 'Direct / Unknown') AS source,
           COALESCE(ls.utm_medium, '-') AS medium,
           COUNT(ls.id)::int AS leads,
           COALESCE(SUM(ls.applications), 0)::int AS applications,
           COALESCE(SUM(ls.accepted), 0)::int AS accepted,
           COALESCE(SUM(ls.enrolled), 0)::int AS enrolled,
           COALESCE(SUM(ls.revenue), 0) AS revenue
         FROM ls GROUP BY 1, 2 ORDER BY leads DESC LIMIT 50`,
        p.values,
        'sources',
      ),
      this.q(
        `${leadStatsCte}
         SELECT COUNT(*)::int AS leads,
           COUNT(*) FILTER (WHERE campaign_id IS NOT NULL)::int AS attributed_leads,
           COALESCE(SUM(applications), 0)::int AS applications,
           COALESCE(SUM(accepted), 0)::int AS accepted,
           COALESCE(SUM(enrolled), 0)::int AS enrolled,
           COALESCE(SUM(revenue), 0) AS revenue,
           COALESCE(SUM(revenue) FILTER (WHERE campaign_id IS NOT NULL), 0) AS attributed_revenue
         FROM ls`,
        p.values,
        'campaign totals',
      ),
    ]);

    const decorate = (r: any) => {
      const cost = num(r.cost);
      const leads = num(r.leads);
      const applications = num(r.applications);
      const accepted = num(r.accepted);
      const enrolled = num(r.enrolled);
      const revenue = num(r.revenue);
      return {
        ...r,
        cost,
        leads,
        applications,
        offers: num(r.offers),
        accepted,
        enrolled,
        revenue,
        costPerLead: leads > 0 ? round(cost / leads, 2) : null,
        costPerApplication: applications > 0 ? round(cost / applications, 2) : null,
        costPerAdmission: enrolled > 0 ? round(cost / enrolled, 2) : null,
        admissionConversionRate: pct(accepted, leads),
        leadToApplication: pct(applications, leads),
        roi: cost > 0 ? round(((revenue - cost) / cost) * 100, 1) : null,
      };
    };

    const campaigns = campaignRows.map(decorate);

    // Channel cost = cost of the campaigns of that source type.
    const costByChannel: Record<string, number> = {};
    campaigns.forEach((c: any) => {
      const key = c.sourceType || 'Unknown';
      costByChannel[key] = (costByChannel[key] || 0) + c.cost;
    });
    const channels = channelRows.map((r: any) => decorate({ ...r, cost: costByChannel[r.channel] || 0 }));
    Object.keys(costByChannel).forEach((ch) => {
      if (!channels.find((c: any) => c.channel === ch)) {
        channels.push(decorate({ channel: ch, cost: costByChannel[ch], leads: 0, applications: 0, offers: 0, accepted: 0, enrolled: 0, revenue: 0 }));
      }
    });

    const t = totals[0] || {};
    const totalCost = campaigns.reduce((s: number, c: any) => s + c.cost, 0);
    const attributedLeads = num(t.attributed_leads);
    const attributedRevenue = num(t.attributed_revenue);
    const attributedApps = campaigns.reduce((s: number, c: any) => s + c.applications, 0);
    const attributedEnrolled = campaigns.reduce((s: number, c: any) => s + c.enrolled, 0);
    const attributedAccepted = campaigns.reduce((s: number, c: any) => s + c.accepted, 0);

    return {
      filters: f,
      summary: {
        totalCost,
        totalLeads: num(t.leads),
        attributedLeads,
        applications: num(t.applications),
        accepted: num(t.accepted),
        enrolled: num(t.enrolled),
        revenue: num(t.revenue),
        attributedRevenue,
        costPerLead: attributedLeads > 0 ? round(totalCost / attributedLeads, 2) : null,
        costPerApplication: attributedApps > 0 ? round(totalCost / attributedApps, 2) : null,
        costPerAdmission: attributedEnrolled > 0 ? round(totalCost / attributedEnrolled, 2) : null,
        admissionConversionRate: pct(attributedAccepted, attributedLeads),
        roi: totalCost > 0 ? round(((attributedRevenue - totalCost) / totalCost) * 100, 1) : null,
      },
      campaigns,
      channels: channels.sort((a: any, b: any) => b.leads - a.leads),
      sources: sourceRows.map(decorate),
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 3. Geographic & demographic insights
  // ─────────────────────────────────────────────────────────────────────────
  async geography(orgId: string, f: AnalyticsFilters) {
    const p = new SqlParams();
    const org = p.add(orgId);
    const leadWhere = leadFilterSql(org, f, p);
    const appWhere = appFilterSql(f, p);

    const base = `
      WITH ${appFactsCte(org)},
      cohort AS (SELECT * FROM af WHERE ${appWhere}),
      lg AS (
        SELECT l.id::text AS id,
          COALESCE(NULLIF(INITCAP(TRIM(l.country)), ''), 'Unknown') AS country,
          COALESCE(NULLIF(INITCAP(TRIM(l.state)), ''), 'Unknown') AS state,
          COALESCE(NULLIF(INITCAP(TRIM(l.city)), ''), 'Unknown') AS city
        FROM leads l WHERE ${leadWhere}
      ),
      lgs AS (
        SELECT lg.*, COUNT(af.id) AS apps,
          COUNT(af.id) FILTER (WHERE af.offered) AS offers,
          COUNT(af.id) FILTER (WHERE af.enrolled) AS enrolled
        FROM lg LEFT JOIN af ON af.lead_id = lg.id
        GROUP BY lg.id, lg.country, lg.state, lg.city
      ),
      addr AS (
        SELECT DISTINCT ON (ad.application_id::text) ad.application_id::text AS application_id, ad.city, ad.state
        FROM application_addresses ad
        ORDER BY ad.application_id::text, ad.created_at
      ),
      cg AS (
        SELECT c.*,
          COALESCE(NULLIF(INITCAP(TRIM(COALESCE(addr.state, l.state))), ''), 'Unknown') AS geo_state,
          COALESCE(NULLIF(INITCAP(TRIM(COALESCE(addr.city, l.city))), ''), 'Unknown') AS geo_city,
          COALESCE(NULLIF(INITCAP(TRIM(l.country)), ''), 'India') AS geo_country
        FROM cohort c
        LEFT JOIN addr ON addr.application_id = c.id
        LEFT JOIN leads l ON l.id::text = c.lead_id
      )`;

    const geoLeadQuery = (dim: 'country' | 'state' | 'city') =>
      this.q(
        `${base}
         SELECT ${dim === 'city' ? 'city, state' : dim === 'state' ? 'state, country' : 'country'},
           COUNT(*)::int AS leads, SUM(apps)::int AS applications, SUM(offers)::int AS offers, SUM(enrolled)::int AS enrolled
         FROM lgs GROUP BY ${dim === 'city' ? 'city, state' : dim === 'state' ? 'state, country' : 'country'}
         ORDER BY leads DESC LIMIT 100`,
        p.values,
        `geo ${dim}`,
      );

    const dimQuery = (label: string, expr: string, extraCte = '', join = '') =>
      this.q(
        `${base}${extraCte}
         SELECT ${expr} AS label,
           COUNT(*)::int AS applications,
           COUNT(*) FILTER (WHERE cg.submitted)::int AS submitted,
           COUNT(*) FILTER (WHERE cg.offered)::int AS offers,
           COUNT(*) FILTER (WHERE cg.accepted)::int AS accepted,
           COUNT(*) FILTER (WHERE cg.enrolled)::int AS enrolled
         FROM cg ${join}
         GROUP BY 1 ORDER BY applications DESC LIMIT 60`,
        p.values,
        label,
      );

    const eduCte = `,
      edu AS (
        SELECT e.application_id::text AS application_id,
          (ARRAY_AGG(COALESCE(NULLIF(UPPER(REGEXP_REPLACE(e.degree_name, '[^A-Za-z]', '', 'g')), ''), 'UG (unspecified)') ORDER BY e.created_at))[1] AS degree
        FROM application_education e
        WHERE e.level::text = 'UG'
        GROUP BY 1
      )`;
    const expCte = `,
      wx AS (
        SELECT w.application_id::text AS application_id,
          SUM(GREATEST(0, EXTRACT(EPOCH FROM (COALESCE(w.to_date::timestamp, now()) - w.from_date::timestamp)) / 2629800)) AS months
        FROM application_work_experience w
        WHERE w.from_date IS NOT NULL
        GROUP BY 1
      )`;
    const expMonths = `COALESCE(
        NULLIF(REGEXP_REPLACE(COALESCE(cg.validated_experience_months, ''), '[^0-9.]', '', 'g'), '')::numeric,
        NULLIF(REGEXP_REPLACE(COALESCE(cg.claimed_experience_months, ''), '[^0-9.]', '', 'g'), '')::numeric,
        wx.months, 0)`;
    const testCte = `,
      tst AS (
        SELECT t.application_id::text AS application_id, MAX(t.percentile) AS percentile
        FROM application_entrance_tests t GROUP BY 1
      )`;

    const [byCountry, byState, byCity, appsByState, appsByCity, academic, experience, tests, testNames, programs, gender, age] =
      await Promise.all([
        geoLeadQuery('country'),
        geoLeadQuery('state'),
        geoLeadQuery('city'),
        dimQuery('apps by state', 'cg.geo_state'),
        dimQuery('apps by city', `cg.geo_city || ', ' || cg.geo_state`),
        dimQuery('academic background', `COALESCE(edu.degree, 'Not specified')`, eduCte, 'LEFT JOIN edu ON edu.application_id = cg.id'),
        dimQuery(
          'work experience',
          `CASE WHEN ${expMonths} <= 0 THEN '0. Fresher'
                WHEN ${expMonths} < 12 THEN '1. Under 1 year'
                WHEN ${expMonths} < 24 THEN '2. 1-2 years'
                WHEN ${expMonths} < 60 THEN '3. 2-5 years'
                ELSE '4. 5+ years' END`,
          expCte,
          'LEFT JOIN wx ON wx.application_id = cg.id',
        ),
        dimQuery(
          'test scores',
          `CASE WHEN tst.percentile IS NULL THEN '0. No test score'
                WHEN tst.percentile < 50 THEN '1. Below 50'
                WHEN tst.percentile < 70 THEN '2. 50-70'
                WHEN tst.percentile < 85 THEN '3. 70-85'
                WHEN tst.percentile < 95 THEN '4. 85-95'
                ELSE '5. 95+' END`,
          testCte,
          'LEFT JOIN tst ON tst.application_id = cg.id',
        ),
        this.q(
          `${base}
           SELECT UPPER(TRIM(t.test_name)) AS test, COUNT(DISTINCT cg.id)::int AS applications,
             ROUND(AVG(t.percentile)::numeric, 1) AS "avgPercentile", ROUND(AVG(t.composite_score)::numeric, 1) AS "avgScore",
             COUNT(DISTINCT cg.id) FILTER (WHERE cg.offered)::int AS offers
           FROM cg JOIN application_entrance_tests t ON t.application_id::text = cg.id
           GROUP BY 1 ORDER BY applications DESC LIMIT 20`,
          p.values,
          'test names',
        ),
        dimQuery('program', 'cg.program'),
        dimQuery('gender', `COALESCE(NULLIF(INITCAP(TRIM(cg.gender)), ''), 'Not specified')`),
        dimQuery(
          'age group',
          `CASE WHEN cg.date_of_birth IS NULL THEN '9. Unknown'
                WHEN date_part('year', age(cg.date_of_birth)) < 21 THEN '1. Under 21'
                WHEN date_part('year', age(cg.date_of_birth)) < 24 THEN '2. 21-23'
                WHEN date_part('year', age(cg.date_of_birth)) < 27 THEN '3. 24-26'
                WHEN date_part('year', age(cg.date_of_birth)) < 31 THEN '4. 27-30'
                ELSE '5. 31+' END`,
        ),
      ]);

    const geoRow = (r: any) => ({
      ...r,
      leads: num(r.leads),
      applications: num(r.applications),
      offers: num(r.offers),
      enrolled: num(r.enrolled),
      conversionRate: pct(num(r.applications), num(r.leads)),
      admissionRate: pct(num(r.enrolled), num(r.leads)),
    });
    const strip = (label: string) => String(label ?? '').replace(/^\d\.\s*/, '');
    const dimRow = (r: any) => ({
      label: strip(r.label),
      applications: num(r.applications),
      submitted: num(r.submitted),
      offers: num(r.offers),
      accepted: num(r.accepted),
      enrolled: num(r.enrolled),
      offerRate: pct(num(r.offers), num(r.applications)),
      admissionRate: pct(num(r.enrolled), num(r.applications)),
    });
    const ordered = (rows: any[]) =>
      [...rows].sort((a, b) => String(a.label).localeCompare(String(b.label))).map(dimRow);

    return {
      filters: f,
      leadsByCountry: byCountry.map(geoRow),
      leadsByState: byState.map(geoRow),
      leadsByCity: byCity.map(geoRow),
      applicationsByState: appsByState.map(dimRow),
      applicationsByCity: appsByCity.map(dimRow),
      academicBackground: academic.map(dimRow),
      workExperience: ordered(experience),
      testScores: ordered(tests),
      testsTaken: testNames.map((r: any) => ({
        test: r.test,
        applications: num(r.applications),
        avgPercentile: r.avgPercentile === null ? null : num(r.avgPercentile),
        avgScore: r.avgScore === null ? null : num(r.avgScore),
        offers: num(r.offers),
        offerRate: pct(num(r.offers), num(r.applications)),
      })),
      programs: programs.map(dimRow),
      gender: gender.map(dimRow),
      ageGroups: ordered(age),
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 4. Counselor performance
  // ─────────────────────────────────────────────────────────────────────────
  async counselors(orgId: string, f: AnalyticsFilters, slaHours = DEFAULT_SLA_HOURS) {
    const p = new SqlParams();
    const org = p.add(orgId);
    const sla = p.add(slaHours);
    const leadWhere = leadFilterSql(org, { ...f, counselorId: undefined }, p);
    const appWhere = appFilterSql({ ...f, counselorId: undefined }, p);
    const userFilter = f.counselorId ? `AND u.id::text = ${p.add(f.counselorId)}` : '';

    const base = `
      WITH ${appFactsCte(org)},
      cfg AS (SELECT make_interval(hours => ${sla}::int) AS sla),
      cohort AS (SELECT * FROM af WHERE ${appWhere}),
      ml AS (
        SELECT l.id::text AS id, l.assigned_to::text AS counselor_id, l.status, l.closure_reason,
          l.assigned_at, l.created_at, l.next_follow_up_at,
          (SELECT MIN(a.created_at) FROM lead_activities a
            WHERE a.lead_id::text = l.id::text AND a.action NOT IN ('created', 'assigned')
              AND a.created_at >= COALESCE(l.assigned_at, l.created_at)) AS first_response_at,
          (SELECT MAX(a.created_at) FROM lead_activities a
            WHERE a.lead_id::text = l.id::text AND a.action NOT IN ('created', 'assigned')) AS last_activity_at
        FROM leads l
        WHERE ${leadWhere} AND l.assigned_to IS NOT NULL
      ),
      people AS (
        SELECT u.id::text AS id, u.name, u.role::text AS role, u.email
        FROM users u
        WHERE u.organization_id::text = ${org}
          AND (u.role::text IN ('counselor', 'lead_manager')
               OR u.id::text IN (SELECT counselor_id FROM ml) OR u.id::text IN (SELECT counselor_id FROM cohort WHERE counselor_id IS NOT NULL))
          ${userFilter}
      )`;

    const [kpis, monthly, dropOffs] = await Promise.all([
      this.q(
        `${base}
         SELECT pe.id AS "counselorId", pe.name, pe.role, pe.email,
           (SELECT COUNT(*) FROM ml WHERE ml.counselor_id = pe.id)::int AS "leadsAssigned",
           (SELECT COUNT(*) FROM ml WHERE ml.counselor_id = pe.id AND ml.status IN ('closed', 'disqualified'))::int AS "leadsClosed",
           (SELECT COUNT(*) FROM cohort c WHERE c.counselor_id = pe.id)::int AS applications,
           (SELECT COUNT(*) FROM cohort c WHERE c.counselor_id = pe.id AND c.submitted)::int AS "applicationsSubmitted",
           (SELECT COALESCE(SUM(c.interviews_total), 0) FROM cohort c WHERE c.counselor_id = pe.id)::int AS "interviewsScheduled",
           (SELECT COUNT(*) FROM cohort c WHERE c.counselor_id = pe.id AND c.interviewed)::int AS "interviewsCompleted",
           (SELECT COUNT(*) FROM cohort c WHERE c.counselor_id = pe.id AND c.offered)::int AS "offersGenerated",
           (SELECT COUNT(*) FROM cohort c WHERE c.counselor_id = pe.id AND c.accepted)::int AS "offersAccepted",
           (SELECT COUNT(*) FROM cohort c WHERE c.counselor_id = pe.id AND c.enrolled)::int AS enrolled,
           (SELECT COALESCE(SUM(c.revenue), 0) FROM cohort c WHERE c.counselor_id = pe.id) AS "revenueGenerated",
           (SELECT AVG(EXTRACT(EPOCH FROM (ml.first_response_at - COALESCE(ml.assigned_at, ml.created_at))) / 3600)
              FROM ml WHERE ml.counselor_id = pe.id AND ml.first_response_at IS NOT NULL) AS "avgResponseHours",
           (SELECT COUNT(*) FROM ml WHERE ml.counselor_id = pe.id AND ml.first_response_at IS NOT NULL
              AND ml.first_response_at <= COALESCE(ml.assigned_at, ml.created_at) + (SELECT sla FROM cfg))::int AS "withinSla",
           (SELECT COUNT(*) FROM ml WHERE ml.counselor_id = pe.id
              AND (ml.first_response_at IS NOT NULL OR COALESCE(ml.assigned_at, ml.created_at) + (SELECT sla FROM cfg) < now()))::int AS "slaMeasured",
           (SELECT COUNT(*) FROM ml WHERE ml.counselor_id = pe.id AND ml.first_response_at IS NULL
              AND ml.status NOT IN ('closed', 'disqualified', 'converted')
              AND COALESCE(ml.assigned_at, ml.created_at) + (SELECT sla FROM cfg) < now())::int AS "slaBreachesOpen",
           (SELECT COUNT(*) FROM ml WHERE ml.counselor_id = pe.id AND ml.next_follow_up_at IS NOT NULL)::int AS "followUpsScheduled",
           (SELECT COUNT(*) FROM ml WHERE ml.counselor_id = pe.id AND ml.next_follow_up_at IS NOT NULL
              AND (ml.next_follow_up_at > now() OR ml.status IN ('closed', 'disqualified', 'converted')
                   OR (ml.last_activity_at IS NOT NULL AND ml.last_activity_at >= ml.next_follow_up_at)))::int AS "followUpsCompleted",
           (SELECT COUNT(*) FROM ml WHERE ml.counselor_id = pe.id AND ml.next_follow_up_at IS NOT NULL AND ml.next_follow_up_at <= now()
              AND ml.status NOT IN ('closed', 'disqualified', 'converted')
              AND (ml.last_activity_at IS NULL OR ml.last_activity_at < ml.next_follow_up_at))::int AS "followUpsOverdue"
         FROM people pe
         ORDER BY "leadsAssigned" DESC, pe.name`,
        p.values,
        'counselor kpis',
      ),
      this.q(
        `${base},
         months AS (
           SELECT generate_series(date_trunc('month', now()) - interval '5 months', date_trunc('month', now()), interval '1 month') AS m
         )
         SELECT pe.id AS "counselorId", pe.name, to_char(mo.m, 'YYYY-MM') AS month,
           (SELECT COUNT(*) FROM leads l WHERE l.organization_id::text = ${org} AND l.assigned_to::text = pe.id
              AND date_trunc('month', COALESCE(l.assigned_at, l.created_at)) = mo.m)::int AS "leadsAssigned",
           (SELECT COUNT(*) FROM lead_activities a WHERE a.organization_id::text = ${org} AND a.actor_id::text = pe.id
              AND a.action NOT IN ('created', 'assigned') AND date_trunc('month', a.created_at) = mo.m)::int AS activities,
           (SELECT COUNT(*) FROM af WHERE af.counselor_id = pe.id AND date_trunc('month', af.submitted_at) = mo.m)::int AS submitted,
           (SELECT COUNT(*) FROM af WHERE af.counselor_id = pe.id AND date_trunc('month', af.offered_at) = mo.m)::int AS offers,
           (SELECT COUNT(*) FROM af WHERE af.counselor_id = pe.id AND date_trunc('month', af.enrolled_at) = mo.m)::int AS enrolled
         FROM people pe CROSS JOIN months mo
         ORDER BY pe.name, mo.m`,
        p.values,
        'counselor monthly',
      ),
      this.q(
        `${base}
         SELECT pe.id AS "counselorId", pe.name, COALESCE(ml.closure_reason, ml.status) AS reason, COUNT(*)::int AS count
         FROM ml JOIN people pe ON pe.id = ml.counselor_id
         WHERE ml.status IN ('closed', 'disqualified')
         GROUP BY pe.id, pe.name, COALESCE(ml.closure_reason, ml.status)
         ORDER BY count DESC`,
        p.values,
        'drop-off reasons',
      ),
    ]);

    const counselors = kpis.map((r: any) => {
      const leads = num(r.leadsAssigned);
      return {
        counselorId: r.counselorId,
        name: r.name,
        role: r.role,
        email: r.email,
        leadsAssigned: leads,
        leadsClosed: num(r.leadsClosed),
        applications: num(r.applications),
        applicationsSubmitted: num(r.applicationsSubmitted),
        interviewsScheduled: num(r.interviewsScheduled),
        interviewsCompleted: num(r.interviewsCompleted),
        offersGenerated: num(r.offersGenerated),
        offersAccepted: num(r.offersAccepted),
        enrolled: num(r.enrolled),
        revenueGenerated: num(r.revenueGenerated),
        avgResponseHours: round(r.avgResponseHours),
        slaAdherence: num(r.slaMeasured) > 0 ? pct(num(r.withinSla), num(r.slaMeasured)) : null,
        slaBreachesOpen: num(r.slaBreachesOpen),
        followUpsScheduled: num(r.followUpsScheduled),
        followUpsCompleted: num(r.followUpsCompleted),
        followUpsOverdue: num(r.followUpsOverdue),
        followUpCompletionRate: num(r.followUpsScheduled) > 0 ? pct(num(r.followUpsCompleted), num(r.followUpsScheduled)) : null,
        conversionRate: pct(num(r.applications), leads),
        admissionRate: pct(num(r.enrolled), leads),
        funnel: [
          { stage: 'Leads Assigned', count: leads },
          { stage: 'Applications', count: num(r.applications) },
          { stage: 'Submitted', count: num(r.applicationsSubmitted) },
          { stage: 'Interviewed', count: num(r.interviewsCompleted) },
          { stage: 'Offers', count: num(r.offersGenerated) },
          { stage: 'Accepted', count: num(r.offersAccepted) },
          { stage: 'Enrolled', count: num(r.enrolled) },
        ],
      };
    });

    const totals = counselors.reduce(
      (t: any, c: any) => {
        t.leadsAssigned += c.leadsAssigned;
        t.applicationsSubmitted += c.applicationsSubmitted;
        t.offersGenerated += c.offersGenerated;
        t.offersAccepted += c.offersAccepted;
        t.revenueGenerated += c.revenueGenerated;
        t.slaBreachesOpen += c.slaBreachesOpen;
        t.followUpsOverdue += c.followUpsOverdue;
        return t;
      },
      { leadsAssigned: 0, applicationsSubmitted: 0, offersGenerated: 0, offersAccepted: 0, revenueGenerated: 0, slaBreachesOpen: 0, followUpsOverdue: 0 },
    );
    const responseRows = counselors.filter((c: any) => c.avgResponseHours !== null);
    const slaRows = counselors.filter((c: any) => c.slaAdherence !== null);

    return {
      filters: f,
      slaHours,
      summary: {
        ...totals,
        counselors: counselors.length,
        avgResponseHours: responseRows.length
          ? round(responseRows.reduce((s: number, c: any) => s + (c.avgResponseHours as number), 0) / responseRows.length)
          : null,
        slaAdherence: slaRows.length
          ? round(slaRows.reduce((s: number, c: any) => s + (c.slaAdherence as number), 0) / slaRows.length)
          : null,
      },
      counselors,
      monthly: monthly.map((m: any) => ({
        counselorId: m.counselorId,
        name: m.name,
        month: m.month,
        leadsAssigned: num(m.leadsAssigned),
        activities: num(m.activities),
        submitted: num(m.submitted),
        offers: num(m.offers),
        enrolled: num(m.enrolled),
      })),
      dropOffReasons: dropOffs.map((d: any) => ({
        counselorId: d.counselorId,
        name: d.name,
        reason: CLOSURE_REASON_LABELS[d.reason] || (d.reason ? String(d.reason).replace(/_/g, ' ') : 'Unspecified'),
        count: num(d.count),
      })),
    };
  }

  /** Leads grouped by status (optionally for one counselor). */
  async leadStatusBreakdown(orgId: string, f: AnalyticsFilters) {
    const p = new SqlParams();
    const org = p.add(orgId);
    const where = leadFilterSql(org, f, p);
    const rows = await this.q(
      `SELECT COALESCE(l.status, 'unknown') AS status, COUNT(*)::int AS count FROM leads l WHERE ${where} GROUP BY 1 ORDER BY count DESC`,
      p.values,
      'lead status',
    );
    return rows.map((r: any) => ({ status: r.status, count: num(r.count) }));
  }

  /** Re-exported for the dashboard service. */
  dateRange = dateRange;
}
