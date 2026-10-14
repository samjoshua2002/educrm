import { Injectable } from '@nestjs/common';
import { AnalyticsService } from './analytics.service.js';
import { num, pct } from './analytics-sql.js';

/** Superadmin (platform-wide) KPIs across all organizations. */
@Injectable()
export class PlatformAnalyticsService {
  constructor(private readonly analytics: AnalyticsService) {}

  private q = (sql: string, params: any[] = [], label = 'platform') => this.analytics.q(sql, params, label);

  async overview() {
    const [orgTotals, userRoles, platformTotals, orgRows, expiring, trend, activity, commsByChannel] = await Promise.all([
      this.q(
        `SELECT COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status::text = 'active')::int AS active,
           COUNT(*) FILTER (WHERE status::text = 'suspended')::int AS suspended,
           COUNT(*) FILTER (WHERE status::text = 'expired' OR subscription_end < now())::int AS expired,
           COUNT(*) FILTER (WHERE subscription_end >= now() AND subscription_end < now() + interval '30 days')::int AS expiring_30,
           COUNT(*) FILTER (WHERE subscription_end >= now() AND subscription_end < now() + interval '7 days')::int AS expiring_7,
           COUNT(*) FILTER (WHERE created_at >= now() - interval '30 days')::int AS new_30
         FROM organizations`,
        [],
        'org totals',
      ),
      this.q(
        `SELECT role::text AS role, COUNT(*)::int AS count, COUNT(*) FILTER (WHERE is_active)::int AS active
         FROM users WHERE role::text <> 'superadmin' GROUP BY 1 ORDER BY 2 DESC`,
        [],
        'user roles',
      ),
      this.q(
        `SELECT
           (SELECT COUNT(*) FROM leads)::int AS leads,
           (SELECT COUNT(*) FROM leads WHERE created_at >= now() - interval '30 days')::int AS leads_30,
           (SELECT COUNT(*) FROM applications)::int AS applications,
           (SELECT COUNT(*) FROM applications WHERE created_at >= now() - interval '30 days')::int AS applications_30,
           (SELECT COUNT(*) FROM applications WHERE submitted_at IS NOT NULL)::int AS submitted,
           (SELECT COUNT(*) FROM offer_acceptances WHERE enrollment_status = 'confirmed')::int AS enrolled,
           (SELECT COUNT(*) FROM admission_decisions WHERE final_decision = 'offer_made')::int AS offers,
           (SELECT COALESCE(SUM(amount), 0) FROM payment_orders WHERE status::text = 'paid') AS revenue,
           (SELECT COALESCE(SUM(amount), 0) FROM payment_orders WHERE status::text = 'paid' AND COALESCE(paid_at, created_at) >= now() - interval '30 days') AS revenue_30,
           (SELECT COUNT(*) FROM payment_orders WHERE status::text = 'paid')::int AS payments_paid,
           (SELECT COUNT(*) FROM payment_orders WHERE status::text = 'failed')::int AS payments_failed,
           (SELECT COUNT(*) FROM payment_orders WHERE status::text = 'failed' AND created_at >= now() - interval '7 days')::int AS payments_failed_7,
           (SELECT COUNT(*) FROM communication_logs)::int AS comms,
           (SELECT COUNT(*) FROM communication_logs WHERE sent_at >= now() - interval '30 days')::int AS comms_30,
           (SELECT COUNT(*) FROM communication_logs WHERE sent_at >= now() - interval '30 days' AND status = 'Failed')::int AS comms_failed_30,
           (SELECT COUNT(*) FROM interviews)::int AS interviews`,
        [],
        'platform totals',
      ),
      this.q(
        `SELECT o.id, o.name, o.slug, o.email, o.status::text AS status, o.subscription_start AS "subscriptionStart",
           o.subscription_end AS "subscriptionEnd", o.created_at AS "createdAt",
           CEIL(EXTRACT(EPOCH FROM (o.subscription_end - now())) / 86400)::int AS "daysLeft",
           (SELECT COUNT(*) FROM users u WHERE u.organization_id::text = o.id::text AND u.role::text <> 'student')::int AS staff,
           (SELECT COUNT(*) FROM users u WHERE u.organization_id::text = o.id::text AND u.role::text = 'student')::int AS students,
           (SELECT COUNT(*) FROM branches b WHERE b.organization_id::text = o.id::text)::int AS branches,
           (SELECT COUNT(*) FROM leads l WHERE l.organization_id::text = o.id::text)::int AS leads,
           (SELECT COUNT(*) FROM leads l WHERE l.organization_id::text = o.id::text AND l.created_at >= now() - interval '30 days')::int AS "leads30",
           (SELECT COUNT(*) FROM applications a WHERE a.organization_id::text = o.id::text)::int AS applications,
           (SELECT COUNT(*) FROM applications a WHERE a.organization_id::text = o.id::text AND a.submitted_at IS NOT NULL)::int AS submitted,
           (SELECT COUNT(*) FROM admission_decisions d WHERE d.organization_id::text = o.id::text AND d.final_decision = 'offer_made')::int AS offers,
           (SELECT COUNT(*) FROM offer_acceptances oa JOIN offer_letters ol ON ol.id::text = oa.offer_letter_id::text
              WHERE ol.organization_id::text = o.id::text AND oa.enrollment_status = 'confirmed')::int AS enrolled,
           (SELECT COALESCE(SUM(po.amount), 0) FROM payment_orders po JOIN applications a ON a.id::text = po.application_id::text
              WHERE a.organization_id::text = o.id::text AND po.status::text = 'paid') AS revenue,
           (SELECT COUNT(*) FROM payment_orders po JOIN applications a ON a.id::text = po.application_id::text
              WHERE a.organization_id::text = o.id::text AND po.status::text = 'failed' AND po.created_at >= now() - interval '7 days')::int AS "paymentFailures7d",
           (SELECT COUNT(*) FROM communication_logs c WHERE c.organization_id::text = o.id::text AND c.sent_at >= now() - interval '30 days')::int AS "communications30",
           (SELECT (s.smtp_host IS NOT NULL AND s.smtp_host <> '') FROM organization_settings s WHERE s.organization_id::text = o.id::text LIMIT 1) AS "smtpConfigured",
           (SELECT (s.razorpay_key_id IS NOT NULL AND s.razorpay_key_id <> '') FROM organization_settings s WHERE s.organization_id::text = o.id::text LIMIT 1) AS "paymentGatewayConfigured",
           GREATEST(
             (SELECT MAX(l.created_at) FROM leads l WHERE l.organization_id::text = o.id::text),
             (SELECT MAX(a.updated_at) FROM applications a WHERE a.organization_id::text = o.id::text),
             (SELECT MAX(c.sent_at) FROM communication_logs c WHERE c.organization_id::text = o.id::text)
           ) AS "lastActivityAt"
         FROM organizations o
         ORDER BY applications DESC, o.name`,
        [],
        'org comparison',
      ),
      this.q(
        `SELECT id, name, status::text AS status, subscription_end AS "subscriptionEnd",
           CEIL(EXTRACT(EPOCH FROM (subscription_end - now())) / 86400)::int AS "daysLeft"
         FROM organizations
         WHERE subscription_end < now() + interval '30 days'
         ORDER BY subscription_end ASC LIMIT 20`,
        [],
        'expiring',
      ),
      this.q(
        `WITH months AS (
           SELECT generate_series(date_trunc('month', now()) - interval '11 months', date_trunc('month', now()), interval '1 month') AS m
         )
         SELECT to_char(m, 'YYYY-MM') AS month,
           (SELECT COUNT(*) FROM leads WHERE date_trunc('month', created_at) = m)::int AS leads,
           (SELECT COUNT(*) FROM applications WHERE date_trunc('month', created_at) = m)::int AS applications,
           (SELECT COUNT(*) FROM offer_acceptances WHERE enrollment_status = 'confirmed' AND date_trunc('month', updated_at) = m)::int AS enrolled,
           (SELECT COALESCE(SUM(amount), 0) FROM payment_orders WHERE status::text = 'paid' AND date_trunc('month', COALESCE(paid_at, created_at)) = m) AS revenue,
           (SELECT COUNT(*) FROM organizations WHERE date_trunc('month', created_at) = m)::int AS organizations
         FROM months ORDER BY m`,
        [],
        'platform trend',
      ),
      this.q(
        `SELECT * FROM (
           SELECT 'organization' AS kind, 'Organization created' AS title, o.name AS subject, o.name AS organization,
             '/superadmin/organizations' AS link, o.created_at AS at
           FROM organizations o
           UNION ALL
           SELECT 'application', 'Application ' || COALESCE(a.form_status, 'started'), a.name, o.name,
             '/superadmin/organizations', a.created_at
           FROM applications a JOIN organizations o ON o.id::text = a.organization_id::text
           UNION ALL
           SELECT 'payment', 'Payment ' || po.status::text || ' - Rs. ' || po.amount, a.name, o.name,
             '/superadmin/organizations', COALESCE(po.paid_at, po.created_at)
           FROM payment_orders po JOIN applications a ON a.id::text = po.application_id::text
           JOIN organizations o ON o.id::text = a.organization_id::text
           UNION ALL
           SELECT 'user', 'User added (' || u.role::text || ')', u.name, o.name, '/superadmin/organizations', u.created_at
           FROM users u JOIN organizations o ON o.id::text = u.organization_id::text
           WHERE u.role::text <> 'student'
         ) x ORDER BY at DESC NULLS LAST LIMIT 20`,
        [],
        'platform activity',
      ),
      this.q(
        `SELECT channel, COUNT(*)::int AS count, COUNT(*) FILTER (WHERE status = 'Failed')::int AS failed
         FROM communication_logs WHERE sent_at >= now() - interval '30 days' GROUP BY 1 ORDER BY 2 DESC`,
        [],
        'comms by channel',
      ),
    ]);

    const o = orgTotals[0] || {};
    const t = platformTotals[0] || {};
    const organizations = orgRows.map((r: any) => ({
      ...r,
      staff: num(r.staff),
      students: num(r.students),
      branches: num(r.branches),
      leads: num(r.leads),
      leads30: num(r.leads30),
      applications: num(r.applications),
      submitted: num(r.submitted),
      offers: num(r.offers),
      enrolled: num(r.enrolled),
      revenue: num(r.revenue),
      paymentFailures7d: num(r.paymentFailures7d),
      communications30: num(r.communications30),
      smtpConfigured: !!r.smtpConfigured,
      paymentGatewayConfigured: !!r.paymentGatewayConfigured,
      conversionRate: pct(num(r.applications), num(r.leads)),
      subscriptionState:
        r.subscriptionEnd && new Date(r.subscriptionEnd).getTime() < Date.now()
          ? 'expired'
          : r.daysLeft !== null && num(r.daysLeft) <= 30
            ? 'expiring'
            : 'active',
    }));

    const staffUsers = userRoles.filter((u: any) => u.role !== 'student').reduce((s: number, u: any) => s + num(u.count), 0);
    const studentUsers = userRoles.filter((u: any) => u.role === 'student').reduce((s: number, u: any) => s + num(u.count), 0);

    return {
      generatedAt: new Date().toISOString(),
      kpis: {
        organizationsTotal: num(o.total),
        organizationsActive: num(o.active),
        organizationsSuspended: num(o.suspended),
        subscriptionsExpired: num(o.expired),
        subscriptionsExpiring30: num(o.expiring_30),
        subscriptionsExpiring7: num(o.expiring_7),
        newOrganizations30: num(o.new_30),
        staffUsers,
        studentUsers,
        leads: num(t.leads),
        leads30: num(t.leads_30),
        applications: num(t.applications),
        applications30: num(t.applications_30),
        submitted: num(t.submitted),
        offers: num(t.offers),
        enrolled: num(t.enrolled),
        revenue: num(t.revenue),
        revenue30: num(t.revenue_30),
        paymentsPaid: num(t.payments_paid),
        paymentsFailed: num(t.payments_failed),
        paymentsFailed7: num(t.payments_failed_7),
        paymentSuccessRate: pct(num(t.payments_paid), num(t.payments_paid) + num(t.payments_failed)),
        communications: num(t.comms),
        communications30: num(t.comms_30),
        communicationsFailed30: num(t.comms_failed_30),
        interviews: num(t.interviews),
        leadToApplication: pct(num(t.applications), num(t.leads)),
      },
      usersByRole: userRoles.map((u: any) => ({ role: u.role, count: num(u.count), active: num(u.active) })),
      organizations,
      expiringSubscriptions: expiring.map((e: any) => ({ ...e, daysLeft: e.daysLeft === null ? null : num(e.daysLeft) })),
      trend: trend.map((r: any) => ({
        month: r.month,
        leads: num(r.leads),
        applications: num(r.applications),
        enrolled: num(r.enrolled),
        revenue: num(r.revenue),
        organizations: num(r.organizations),
      })),
      communicationsByChannel: commsByChannel.map((c: any) => ({ channel: c.channel, count: num(c.count), failed: num(c.failed) })),
      recentActivity: activity,
    };
  }
}
