import { ForbiddenException, Injectable } from '@nestjs/common';
import { AnalyticsService, DEFAULT_SLA_HOURS } from './analytics.service.js';
import { AnalyticsFilters, SqlParams, appFactsCte, appFilterSql, num, pct, round } from './analytics-sql.js';

export type DashboardView = 'admissions' | 'counselor' | 'marketing' | 'evaluator';

/** Which dashboards each role may open, first one = default. */
export const VIEWS_BY_ROLE: Record<string, DashboardView[]> = {
  superadmin: ['admissions', 'counselor', 'marketing', 'evaluator'],
  org_admin: ['admissions', 'marketing', 'counselor', 'evaluator'],
  application_manager: ['admissions', 'evaluator'],
  lead_manager: ['marketing', 'counselor'],
  counselor: ['counselor'],
  exam_manager: ['evaluator'],
};

export interface DashboardViewer {
  sub: string;
  role: string;
}

@Injectable()
export class DashboardService {
  constructor(private readonly analytics: AnalyticsService) {}

  private q = (sql: string, params: any[] = [], label = 'dashboard') => this.analytics.q(sql, params, label);

  async dashboard(orgId: string, viewer: DashboardViewer, requestedView: string | undefined, f: AnalyticsFilters) {
    const allowed = VIEWS_BY_ROLE[viewer.role] || ['counselor'];
    const view = (requestedView && allowed.includes(requestedView as DashboardView) ? requestedView : allowed[0]) as DashboardView;
    if (requestedView && !allowed.includes(requestedView as DashboardView)) {
      throw new ForbiddenException(`The ${requestedView} dashboard is not available for your role`);
    }

    // Counselors only ever see their own numbers.
    const filters: AnalyticsFilters = { ...f };
    if (viewer.role === 'counselor') filters.counselorId = viewer.sub;

    const [body, modules, activity] = await Promise.all([
      view === 'admissions'
        ? this.admissions(orgId, filters)
        : view === 'counselor'
          ? this.counselor(orgId, filters, viewer)
          : view === 'marketing'
            ? this.marketing(orgId, filters)
            : this.evaluator(orgId, filters, viewer),
      this.modulesOverview(orgId, viewer),
      this.recentActivity(orgId, viewer),
    ]);

    return {
      view,
      availableViews: allowed,
      generatedAt: new Date().toISOString(),
      filters,
      ...body,
      modules,
      recentActivity: activity,
    };
  }

  // ── Admissions Head ──────────────────────────────────────────────────────
  private async admissions(orgId: string, f: AnalyticsFilters) {
    const funnel = await this.analytics.funnel(orgId, f);
    const programs = funnel.byProgram;
    const trend = funnel.trend;
    const stage = (k: string) => funnel.stages.find((s) => s.key === k)?.count || 0;

    // Seat utilization across courses that define seats (whole intake, not date-filtered).
    const p = new SqlParams();
    const org = p.add(orgId);
    const sessionCond = f.academicSession ? `AND af.academic_session = ${p.add(f.academicSession)}` : '';
    const courseCond = f.courseId ? `AND c.id::text = ${p.add(f.courseId)}` : '';
    const seatsRows = await this.q(
      `WITH ${appFactsCte(org)}
       SELECT c.id, c.name, c.code, COALESCE(c.total_seats, 0) AS seats,
         (SELECT COUNT(*) FROM af WHERE af.course_id = c.id::text AND af.enrolled ${sessionCond})::int AS enrolled,
         (SELECT COUNT(*) FROM af WHERE af.course_id = c.id::text AND af.accepted ${sessionCond})::int AS accepted
       FROM courses c
       WHERE c.organization_id::text = ${org} AND COALESCE(c.is_active, true) ${courseCond}
       ORDER BY c.name`,
      p.values,
      'seat utilization',
    );
    const seats = seatsRows.map((r: any) => ({
      courseId: r.id,
      name: r.name,
      code: r.code,
      seats: num(r.seats),
      enrolled: num(r.enrolled),
      accepted: num(r.accepted),
      utilization: num(r.seats) > 0 ? pct(num(r.enrolled), num(r.seats)) : null,
    }));
    const totalSeats = seats.reduce((s, c) => s + c.seats, 0);
    const enrolledInSeatCourses = seats.filter((c) => c.seats > 0).reduce((s, c) => s + c.enrolled, 0);

    return {
      kpis: {
        totalApplications: stage('started'),
        submittedApplications: stage('submitted'),
        offersIssued: stage('offered'),
        offersAccepted: stage('accepted'),
        offerToAcceptance: pct(stage('accepted'), stage('offered')),
        enrollmentCount: stage('enrolled'),
        seatUtilization: totalSeats > 0 ? pct(enrolledInSeatCourses, totalSeats) : null,
        totalSeats,
        revenue: funnel.metrics.totalRevenue,
      },
      funnel: funnel.stages,
      funnelMetrics: funnel.metrics,
      programPerformance: programs.map((pr) => {
        const s = seats.find((x) => x.courseId === pr.courseId);
        return { ...pr, seats: s ? s.seats : pr.seats, seatUtilization: s && s.seats > 0 ? pct(pr.enrolled, s.seats) : pr.seatUtilization };
      }),
      seats,
      trend,
    };
  }

  // ── Counselor ────────────────────────────────────────────────────────────
  private async counselor(orgId: string, f: AnalyticsFilters, viewer: DashboardViewer) {
    const counselorId = f.counselorId;

    // Each query gets its own parameter list (Postgres rejects unused parameters).
    const build = () => {
      const p = new SqlParams();
      const org = p.add(orgId);
      const cid = counselorId ? p.add(counselorId) : null;
      return {
        p,
        org,
        mine: cid ? `AND l.assigned_to::text = ${cid}` : "",
        appMine: cid ? `AND af.counselor_id = ${cid}` : "",
      };
    };
    const openFollowUp = `l.status NOT IN ('closed', 'disqualified', 'converted')
      AND NOT EXISTS (SELECT 1 FROM lead_activities a WHERE a.lead_id::text = l.id::text
                        AND a.action NOT IN ('created', 'assigned') AND a.created_at >= l.next_follow_up_at)`;

    const k1 = build();
    const sla = k1.p.add(DEFAULT_SLA_HOURS);
    const kpiSql = `WITH ${appFactsCte(k1.org)}
      SELECT
        (SELECT COUNT(*) FROM leads l WHERE l.organization_id::text = ${k1.org} ${k1.mine}
           AND l.assigned_to IS NOT NULL AND COALESCE(l.assigned_at, l.created_at) >= date_trunc('day', now()))::int AS "assignedToday",
        (SELECT COUNT(*) FROM leads l WHERE l.organization_id::text = ${k1.org} ${k1.mine} AND l.assigned_to IS NOT NULL)::int AS "leadsAssigned",
        (SELECT COUNT(*) FROM leads l WHERE l.organization_id::text = ${k1.org} ${k1.mine}
           AND l.next_follow_up_at IS NOT NULL AND l.next_follow_up_at < date_trunc('day', now()) + interval '1 day'
           AND ${openFollowUp})::int AS "pendingFollowUps",
        (SELECT COUNT(*) FROM leads l WHERE l.organization_id::text = ${k1.org} ${k1.mine}
           AND l.assigned_to IS NOT NULL AND l.status NOT IN ('closed', 'disqualified', 'converted')
           AND COALESCE(l.assigned_at, l.created_at) + make_interval(hours => ${sla}::int) < now()
           AND NOT EXISTS (SELECT 1 FROM lead_activities a WHERE a.lead_id::text = l.id::text
                             AND a.action NOT IN ('created', 'assigned') AND a.created_at >= COALESCE(l.assigned_at, l.created_at)))::int AS "slaBreaches",
        (SELECT COUNT(*) FROM af WHERE 1=1 ${k1.appMine})::int AS applications,
        (SELECT COUNT(*) FROM af WHERE af.enrolled ${k1.appMine})::int AS enrolled,
        (SELECT COALESCE(SUM(af.interviews_pending), 0) FROM af WHERE 1=1 ${k1.appMine})::int AS "interviewsScheduled"`;

    const t = build();
    const taskSql = `SELECT l.id, TRIM(CONCAT(l.first_name, ' ', l.last_name)) AS name, l.phone, l.email, l.status,
        l.next_follow_up_at AS "dueAt", l.score_band AS "scoreBand", u.name AS "assignedToName",
        CASE WHEN l.next_follow_up_at < now() THEN 'overdue' ELSE 'upcoming' END AS urgency
      FROM leads l LEFT JOIN users u ON u.id::text = l.assigned_to::text
      WHERE l.organization_id::text = ${t.org} ${t.mine}
        AND l.next_follow_up_at IS NOT NULL AND l.next_follow_up_at < date_trunc('day', now()) + interval '2 day'
        AND ${openFollowUp}
      ORDER BY l.next_follow_up_at ASC
      LIMIT 25`;

    const iv = build();
    const ivSql = `WITH ${appFactsCte(iv.org)}
      SELECT i.id, i.interview_type AS "interviewType", i.round, i.status, s.start_time AS "startTime", s.slot_date AS "slotDate",
        a.name AS "applicantName", a.application_no AS "applicationNo"
      FROM interviews i
      JOIN af ON af.id = i.application_id::text
      JOIN applications a ON a.id::text = i.application_id::text
      LEFT JOIN interview_slots s ON s.id::text = i.slot_id::text
      WHERE i.organization_id::text = ${iv.org} AND i.status IN ('Scheduled', 'Rescheduled') ${iv.appMine}
        AND (s.start_time IS NULL OR s.start_time >= date_trunc('day', now()))
      ORDER BY s.start_time ASC NULLS LAST
      LIMIT 10`;

    const [kpiRows, tasks, interviews, funnel, leadStatus] = await Promise.all([
      this.q(kpiSql, k1.p.values, "counselor kpis"),
      this.q(taskSql, t.p.values, "counselor tasks"),
      this.q(ivSql, iv.p.values, "counselor interviews"),
      this.analytics.funnel(orgId, f),
      this.analytics.leadStatusBreakdown(orgId, { counselorId }),
    ]);

    const k = kpiRows[0] || {};
    return {
      kpis: {
        leadsAssignedToday: num(k.assignedToday),
        pendingFollowUps: num(k.pendingFollowUps),
        conversionRate: pct(num(k.applications), num(k.leadsAssigned)),
        admissionRate: pct(num(k.enrolled), num(k.leadsAssigned)),
        interviewsScheduled: num(k.interviewsScheduled),
        leadsAssigned: num(k.leadsAssigned),
        slaBreaches: num(k.slaBreaches),
        slaHours: DEFAULT_SLA_HOURS,
      },
      tasks: tasks.map((row: any) => ({ ...row, kind: "follow_up" })),
      upcomingInterviews: interviews,
      leadStatus,
      funnel: funnel.stages,
      counselorId: counselorId || null,
      scope: counselorId ? (counselorId === viewer.sub ? "mine" : "counselor") : "organization",
    };
  }

  // ── Marketing ────────────────────────────────────────────────────────────
  private async marketing(orgId: string, f: AnalyticsFilters) {
    const [campaigns, geo, trend] = await Promise.all([
      this.analytics.campaigns(orgId, f),
      this.analytics.geography(orgId, f),
      this.analytics.monthlyTrend(orgId, f),
    ]);
    return {
      kpis: {
        campaignRoi: campaigns.summary.roi,
        costPerAdmission: campaigns.summary.costPerAdmission,
        costPerLead: campaigns.summary.costPerLead,
        totalCost: campaigns.summary.totalCost,
        totalLeads: campaigns.summary.totalLeads,
        attributedRevenue: campaigns.summary.attributedRevenue,
        admissionConversionRate: campaigns.summary.admissionConversionRate,
        activeChannels: campaigns.channels.filter((c: any) => c.leads > 0).length,
      },
      campaigns: campaigns.campaigns,
      channels: campaigns.channels,
      geo: {
        byState: geo.leadsByState,
        byCountry: geo.leadsByCountry,
        byCity: geo.leadsByCity.slice(0, 15),
      },
      trend,
    };
  }

  // ── Evaluator / Committee ────────────────────────────────────────────────
  private async evaluator(orgId: string, f: AnalyticsFilters, viewer: DashboardViewer) {
    const p = new SqlParams();
    const org = p.add(orgId);
    const me = p.add(viewer.sub);
    const appWhere = appFilterSql({ ...f, counselorId: undefined }, p);

    const base = `
      WITH ${appFactsCte(org)},
      cohort AS (SELECT * FROM af WHERE ${appWhere}),
      iv AS (
        SELECT i.*, (${me}::text = ANY(SELECT x::text FROM unnest(i.assigned_panel) x)) AS on_my_panel
        FROM interviews i JOIN cohort c ON c.id = i.application_id::text
        WHERE i.organization_id::text = ${org}
      )`;

    const [kpiRows, upcoming, pendingEvals, decisionStages, recommendations] = await Promise.all([
      this.q(
        `${base}
         SELECT
           (SELECT COUNT(*) FROM iv WHERE status IN ('Scheduled', 'Rescheduled'))::int AS "interviewsPending",
           (SELECT COUNT(*) FROM iv WHERE status IN ('Scheduled', 'Rescheduled') AND on_my_panel)::int AS "myInterviewsPending",
           (SELECT COUNT(*) FROM iv WHERE status = 'Completed')::int AS "interviewsCompleted",
           (SELECT COUNT(*) FROM interview_evaluations e JOIN iv ON iv.id::text = e.interview_id::text WHERE e.status = 'submitted')::int AS "evaluationsSubmitted",
           (SELECT COUNT(*) FROM interview_evaluations e JOIN iv ON iv.id::text = e.interview_id::text
              WHERE e.status = 'submitted' AND e.evaluator_id::text = ${me})::int AS "myEvaluationsSubmitted",
           (SELECT COUNT(*) FROM iv WHERE status = 'Completed'
              AND NOT EXISTS (SELECT 1 FROM interview_evaluations e WHERE e.interview_id::text = iv.id::text AND e.status = 'submitted'))::int AS "evaluationsPending",
           (SELECT AVG(EXTRACT(EPOCH FROM (COALESCE(d.decision_date, d.updated_at) - COALESCE(c.completed_at, c.submitted_at, c.created_at))) / 86400)
              FROM admission_decisions d JOIN cohort c ON c.id = d.application_id::text
              WHERE d.final_decision IS NOT NULL
                AND COALESCE(d.decision_date, d.updated_at) >= COALESCE(c.completed_at, c.submitted_at, c.created_at)) AS "decisionTurnaroundDays",
           (SELECT COUNT(*) FROM admission_decisions d JOIN cohort c ON c.id = d.application_id::text WHERE d.final_decision IS NULL)::int AS "decisionsPending",
           (SELECT COUNT(*) FROM admission_decisions d JOIN cohort c ON c.id = d.application_id::text WHERE d.final_decision IS NOT NULL)::int AS "decisionsReleased"`,
        p.values,
        'evaluator kpis',
      ),
      this.q(
        `${base}
         SELECT iv.id, iv.interview_type AS "interviewType", iv.round, iv.status, iv.on_my_panel AS "onMyPanel",
           s.start_time AS "startTime", s.slot_date AS "slotDate", a.name AS "applicantName", a.application_no AS "applicationNo",
           COALESCE(co.name, a.program) AS program
         FROM iv
         JOIN applications a ON a.id::text = iv.application_id::text
         LEFT JOIN courses co ON co.id::text = a.course_id::text
         LEFT JOIN interview_slots s ON s.id::text = iv.slot_id::text
         WHERE iv.status IN ('Scheduled', 'Rescheduled')
         ORDER BY iv.on_my_panel DESC, s.start_time ASC NULLS LAST
         LIMIT 12`,
        p.values,
        'evaluator upcoming',
      ),
      this.q(
        `${base}
         SELECT iv.id, iv.interview_type AS "interviewType", iv.round, iv.updated_at AS "completedAt",
           a.name AS "applicantName", a.application_no AS "applicationNo", iv.on_my_panel AS "onMyPanel",
           (SELECT COUNT(*) FROM interview_evaluations e WHERE e.interview_id::text = iv.id::text AND e.status = 'draft')::int AS drafts
         FROM iv JOIN applications a ON a.id::text = iv.application_id::text
         WHERE iv.status = 'Completed'
           AND NOT EXISTS (SELECT 1 FROM interview_evaluations e WHERE e.interview_id::text = iv.id::text AND e.status = 'submitted')
         ORDER BY iv.on_my_panel DESC, iv.updated_at DESC
         LIMIT 12`,
        p.values,
        'evaluations pending',
      ),
      this.q(
        `${base}
         SELECT COALESCE(d.final_decision, d.decision_stage) AS stage, COUNT(*)::int AS count
         FROM admission_decisions d JOIN cohort c ON c.id = d.application_id::text
         GROUP BY 1 ORDER BY count DESC`,
        p.values,
        'decision stages',
      ),
      this.q(
        `${base}
         SELECT COALESCE(e.overall_recommendation, 'Not given') AS recommendation, COUNT(*)::int AS count
         FROM interview_evaluations e JOIN iv ON iv.id::text = e.interview_id::text
         WHERE e.status = 'submitted'
         GROUP BY 1 ORDER BY count DESC`,
        p.values,
        'recommendations',
      ),
    ]);

    const k = kpiRows[0] || {};
    return {
      kpis: {
        interviewsPending: num(k.interviewsPending),
        myInterviewsPending: num(k.myInterviewsPending),
        interviewsCompleted: num(k.interviewsCompleted),
        evaluationsSubmitted: num(k.evaluationsSubmitted),
        myEvaluationsSubmitted: num(k.myEvaluationsSubmitted),
        evaluationsPending: num(k.evaluationsPending),
        decisionTurnaroundDays: round(k.decisionTurnaroundDays),
        decisionsPending: num(k.decisionsPending),
        decisionsReleased: num(k.decisionsReleased),
      },
      upcomingInterviews: upcoming,
      pendingEvaluations: pendingEvals,
      decisionStages: decisionStages.map((d: any) => ({ stage: d.stage, count: num(d.count) })),
      recommendations: recommendations.map((d: any) => ({ recommendation: d.recommendation, count: num(d.count) })),
    };
  }

  // ── Connected modules overview (leads, applications, interviews, decisions, payments, communications, events) ──
  async modulesOverview(orgId: string, viewer: DashboardViewer) {
    const p = new SqlParams();
    const org = p.add(orgId);
    const mine = viewer.role === 'counselor' ? p.add(viewer.sub) : null;
    const leadMine = mine ? `AND l.assigned_to::text = ${mine}` : '';
    const appMine = mine
      ? `AND (a.assigned_counselor_id::text = ${mine} OR a.lead_id::text IN (SELECT id::text FROM leads WHERE assigned_to::text = ${mine}))`
      : '';
    const [row] = await this.q(
      `SELECT
         (SELECT COUNT(*) FROM leads l WHERE l.organization_id::text = ${org} ${leadMine})::int AS leads_total,
         (SELECT COUNT(*) FROM leads l WHERE l.organization_id::text = ${org} ${leadMine} AND l.created_at >= now() - interval '7 days')::int AS leads_week,
         (SELECT COUNT(*) FROM leads l WHERE l.organization_id::text = ${org} AND l.assigned_to IS NULL AND l.status NOT IN ('closed', 'disqualified'))::int AS leads_unassigned,
         (SELECT COUNT(*) FROM leads l WHERE l.organization_id::text = ${org} ${leadMine} AND l.score_band = 'hot')::int AS leads_hot,
         (SELECT COUNT(*) FROM applications a WHERE a.organization_id::text = ${org} ${appMine})::int AS apps_total,
         (SELECT COUNT(*) FROM applications a WHERE a.organization_id::text = ${org} ${appMine} AND a.created_at >= now() - interval '7 days')::int AS apps_week,
         (SELECT COUNT(*) FROM applications a WHERE a.organization_id::text = ${org} ${appMine} AND a.verification_status = 'pending' AND a.submitted_at IS NOT NULL)::int AS apps_pending_verification,
         (SELECT COUNT(*) FROM interviews i JOIN applications a ON a.id::text = i.application_id::text
            WHERE i.organization_id::text = ${org} ${appMine} AND i.status IN ('Scheduled', 'Rescheduled'))::int AS interviews_upcoming,
         (SELECT COUNT(*) FROM interviews i JOIN applications a ON a.id::text = i.application_id::text
            WHERE i.organization_id::text = ${org} ${appMine} AND i.status = 'Completed')::int AS interviews_completed,
         (SELECT COUNT(*) FROM admission_decisions d JOIN applications a ON a.id::text = d.application_id::text
            WHERE d.organization_id::text = ${org} ${appMine} AND d.final_decision IS NULL)::int AS decisions_pending,
         (SELECT COUNT(*) FROM admission_decisions d JOIN applications a ON a.id::text = d.application_id::text
            WHERE d.organization_id::text = ${org} ${appMine} AND d.final_decision = 'offer_made')::int AS offers_made,
         (SELECT COALESCE(SUM(po.amount), 0) FROM payment_orders po JOIN applications a ON a.id::text = po.application_id::text
            WHERE a.organization_id::text = ${org} ${appMine} AND po.status::text = 'paid') AS payments_total,
         (SELECT COALESCE(SUM(po.amount), 0) FROM payment_orders po JOIN applications a ON a.id::text = po.application_id::text
            WHERE a.organization_id::text = ${org} ${appMine} AND po.status::text = 'paid' AND COALESCE(po.paid_at, po.created_at) >= now() - interval '30 days') AS payments_month,
         (SELECT COUNT(*) FROM payment_orders po JOIN applications a ON a.id::text = po.application_id::text
            WHERE a.organization_id::text = ${org} ${appMine} AND po.status::text = 'failed' AND po.created_at >= now() - interval '30 days')::int AS payments_failed,
         (SELECT COUNT(*) FROM communication_logs c WHERE c.organization_id::text = ${org} AND c.sent_at >= now() - interval '30 days')::int AS comms_month,
         (SELECT COUNT(*) FROM communication_logs c WHERE c.organization_id::text = ${org} AND c.sent_at >= now() - interval '30 days' AND c.status = 'Failed')::int AS comms_failed,
         (SELECT COUNT(*) FROM announcement_events e WHERE (e.organization_id::text = ${org} OR e.organization_id IS NULL)
            AND e.type = 'event' AND e.status = 'Published' AND COALESCE(NULLIF(e.event_start_date, ''), '9999-12-31') >= to_char(now(), 'YYYY-MM-DD'))::int AS events_upcoming,
         (SELECT COUNT(*) FROM announcement_events e WHERE (e.organization_id::text = ${org} OR e.organization_id IS NULL)
            AND e.type = 'announcement' AND e.status = 'Published' AND e.created_at >= now() - interval '30 days')::int AS announcements_month`,
      p.values,
      'modules overview',
    );
    const r = row || {};

    const commByChannel = await this.q(
      `SELECT channel, COUNT(*)::int AS count FROM communication_logs
       WHERE organization_id::text = $1 AND sent_at >= now() - interval '30 days' GROUP BY 1 ORDER BY 2 DESC`,
      [orgId],
      'comms by channel',
    );
    const upcomingEvents = await this.q(
      `SELECT id, title, type, category, event_start_date AS "eventStartDate", event_start_time AS "eventStartTime",
         venue_type AS "venueType", venue_location AS "venueLocation", priority
       FROM announcement_events
       WHERE (organization_id::text = $1 OR organization_id IS NULL) AND status = 'Published'
         AND (type = 'announcement' OR COALESCE(NULLIF(event_start_date, ''), '9999-12-31') >= to_char(now(), 'YYYY-MM-DD'))
       ORDER BY CASE WHEN type = 'event' THEN 0 ELSE 1 END, event_start_date ASC NULLS LAST, created_at DESC
       LIMIT 5`,
      [orgId],
      'upcoming events',
    );

    return {
      leads: {
        total: num(r.leads_total),
        newThisWeek: num(r.leads_week),
        unassigned: num(r.leads_unassigned),
        hot: num(r.leads_hot),
      },
      applications: {
        total: num(r.apps_total),
        newThisWeek: num(r.apps_week),
        pendingVerification: num(r.apps_pending_verification),
      },
      interviews: { upcoming: num(r.interviews_upcoming), completed: num(r.interviews_completed) },
      decisions: { pending: num(r.decisions_pending), offersMade: num(r.offers_made) },
      payments: {
        collected: num(r.payments_total),
        collectedLast30Days: num(r.payments_month),
        failedLast30Days: num(r.payments_failed),
      },
      communications: {
        sentLast30Days: num(r.comms_month),
        failedLast30Days: num(r.comms_failed),
        byChannel: commByChannel.map((c: any) => ({ channel: c.channel, count: num(c.count) })),
      },
      events: {
        upcoming: num(r.events_upcoming),
        announcementsLast30Days: num(r.announcements_month),
        items: upcomingEvents,
      },
    };
  }

  /** Latest activity across leads, applications, communications, payments and announcements. */
  async recentActivity(orgId: string, viewer: DashboardViewer, limit = 15) {
    const p = new SqlParams();
    const org = p.add(orgId);
    const lim = p.add(limit);
    const mine = viewer.role === 'counselor' ? p.add(viewer.sub) : null;
    const leadMine = mine ? `AND (l.assigned_to::text = ${mine} OR la.actor_id::text = ${mine})` : '';
    const appMine = mine ? `AND (a.assigned_counselor_id::text = ${mine} OR aa.actor_id::text = ${mine})` : '';
    const rows = await this.q(
      `SELECT * FROM (
         SELECT 'leads' AS module, la.action AS type,
           COALESCE(NULLIF(la.content, ''), REPLACE(la.action, '_', ' ')) AS title,
           TRIM(CONCAT(l.first_name, ' ', l.last_name)) AS subject, u.name AS actor,
           '/organization/leads/edit?id=' || l.id AS link, la.created_at AS at
         FROM lead_activities la JOIN leads l ON l.id::text = la.lead_id::text
         LEFT JOIN users u ON u.id::text = la.actor_id::text
         WHERE la.organization_id::text = ${org} ${leadMine}
         UNION ALL
         SELECT 'applications', aa.action, COALESCE(NULLIF(aa.content, ''), REPLACE(aa.action, '_', ' ')),
           a.name, u.name, '/organization/applications/' || a.application_no, aa.created_at
         FROM application_activities aa JOIN applications a ON a.id::text = aa.application_id::text
         LEFT JOIN users u ON u.id::text = aa.actor_id::text
         WHERE aa.organization_id::text = ${org} ${appMine}
         ${
           mine
             ? ''
             : `UNION ALL
         SELECT 'communications', c.channel, c.subject, COALESCE(c.applicant_name, c.recipient_email, c.recipient_phone), c.sender,
           '/organization/communications', c.sent_at
         FROM communication_logs c WHERE c.organization_id::text = ${org}
         UNION ALL
         SELECT 'payments', po.status::text, 'Payment ' || po.status::text || ' - Rs. ' || po.amount, a.name, NULL,
           '/organization/payments', COALESCE(po.paid_at, po.created_at)
         FROM payment_orders po JOIN applications a ON a.id::text = po.application_id::text
         WHERE a.organization_id::text = ${org}
         UNION ALL
         SELECT 'announcements', e.type, e.title, e.category, e.created_by_name, '/organization/events', e.created_at
         FROM announcement_events e WHERE e.organization_id::text = ${org}`
         }
       ) x
       ORDER BY at DESC NULLS LAST
       LIMIT ${lim}`,
      p.values,
      'recent activity',
    );
    return rows;
  }
}
