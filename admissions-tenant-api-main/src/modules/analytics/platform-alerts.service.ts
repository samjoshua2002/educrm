import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InAppNotificationsService, NotifyInput } from '../in-app-notifications/in-app-notifications.service.js';
import { AnalyticsService, DEFAULT_SLA_HOURS } from './analytics.service.js';
import { num } from './analytics-sql.js';

interface AlertCandidate extends NotifyInput {
  /** Do not repeat the same alert (type + related entity) within this many hours. */
  dedupeHours: number;
}

/**
 * Generates platform alerts for the superadmin (organizationId = null) and
 * a few organization alerts (SLA backlog, payment failures) automatically.
 */
@Injectable()
export class PlatformAlertsService {
  private readonly logger = new Logger(PlatformAlertsService.name);
  private running = false;

  constructor(
    private readonly analytics: AnalyticsService,
    private readonly notifications: InAppNotificationsService,
  ) {}

  /** Every 3 hours. De-duplication keeps each alert to once per window. */
  @Cron('0 15 */3 * * *')
  async scheduledRun() {
    await this.run();
  }

  async run(): Promise<{ checked: number; created: number; alerts: { type: string; title: string }[] }> {
    if (this.running) return { checked: 0, created: 0, alerts: [] };
    this.running = true;
    try {
      const candidates: AlertCandidate[] = [
        ...(await this.subscriptionAlerts()),
        ...(await this.configurationAlerts()),
        ...(await this.paymentFailureAlerts()),
        ...(await this.slaAlerts()),
        ...(await this.inactiveOrgAlerts()),
      ];

      const created: { type: string; title: string }[] = [];
      for (const c of candidates) {
        const { dedupeHours, ...input } = c;
        const exists = await this.notifications.existsRecent(
          input.type || 'general',
          input.relatedEntityId ?? null,
          dedupeHours,
          input.organizationId ?? null,
        );
        if (exists) continue;
        const saved = await this.notifications.notify(input);
        if (saved) created.push({ type: saved.type, title: saved.title });
      }
      if (created.length) this.logger.log(`Platform alerts: ${created.length} new of ${candidates.length} checked`);
      return { checked: candidates.length, created: created.length, alerts: created };
    } catch (err) {
      this.logger.error(`Platform alert run failed: ${(err as Error).message}`);
      return { checked: 0, created: 0, alerts: [] };
    } finally {
      this.running = false;
    }
  }

  private async subscriptionAlerts(): Promise<AlertCandidate[]> {
    const rows = await this.analytics.q(
      `SELECT id::text AS id, name, status::text AS status, subscription_end AS "end",
         CEIL(EXTRACT(EPOCH FROM (subscription_end - now())) / 86400)::int AS "daysLeft"
       FROM organizations
       WHERE status::text <> 'suspended' AND subscription_end < now() + interval '7 days'`,
      [],
      'subscription alerts',
    );
    return rows.map((r: any) => {
      const days = num(r.daysLeft);
      const expired = new Date(r.end).getTime() < Date.now();
      const endStr = new Date(r.end).toISOString().slice(0, 10);
      return expired
        ? {
            organizationId: null,
            module: 'subscriptions',
            type: 'subscription.expired',
            severity: 'critical' as const,
            title: `Subscription expired: ${r.name}`,
            body: `The subscription of ${r.name} ended on ${endStr}${r.status === 'active' ? ' but the organization is still active' : ''}. Renew or update its status.`,
            link: '/superadmin/subscriptions',
            relatedEntityId: r.id,
            metadata: { organizationId: r.id, organizationName: r.name, subscriptionEnd: r.end },
            dedupeHours: 24 * 7,
          }
        : {
            organizationId: null,
            module: 'subscriptions',
            type: 'subscription.expiring',
            severity: 'warning' as const,
            title: `Subscription expiring in ${days} day${days === 1 ? '' : 's'}: ${r.name}`,
            body: `${r.name}'s subscription ends on ${endStr}.`,
            link: '/superadmin/subscriptions',
            relatedEntityId: r.id,
            metadata: { organizationId: r.id, organizationName: r.name, subscriptionEnd: r.end, daysLeft: days },
            dedupeHours: 24 * 3,
          };
    });
  }

  private async configurationAlerts(): Promise<AlertCandidate[]> {
    const rows = await this.analytics.q(
      `SELECT o.id::text AS id, o.name,
         COALESCE((SELECT (s.smtp_host IS NOT NULL AND s.smtp_host <> '' AND s.smtp_user IS NOT NULL AND s.smtp_user <> '')
                   FROM organization_settings s WHERE s.organization_id::text = o.id::text LIMIT 1), false) AS smtp,
         COALESCE((SELECT (s.razorpay_key_id IS NOT NULL AND s.razorpay_key_id <> '' AND s.razorpay_key_secret IS NOT NULL AND s.razorpay_key_secret <> '')
                   FROM organization_settings s WHERE s.organization_id::text = o.id::text LIMIT 1), false) AS gateway
       FROM organizations o WHERE o.status::text = 'active'`,
      [],
      'configuration alerts',
    );
    const out: AlertCandidate[] = [];
    for (const r of rows) {
      if (!r.smtp) {
        out.push({
          organizationId: null,
          module: 'organizations',
          type: 'config.smtp_missing',
          severity: 'warning',
          title: `No SMTP configured: ${r.name}`,
          body: `${r.name} has no email (SMTP) settings, so its emails go through the platform default sender.`,
          link: '/superadmin/organizations',
          relatedEntityId: r.id,
          metadata: { organizationId: r.id, organizationName: r.name },
          dedupeHours: 24 * 7,
        });
      }
      if (!r.gateway) {
        out.push({
          organizationId: null,
          module: 'organizations',
          type: 'config.payment_gateway_missing',
          severity: 'warning',
          title: `No payment gateway configured: ${r.name}`,
          body: `${r.name} has no payment gateway keys, so applicants cannot pay online.`,
          link: '/superadmin/organizations',
          relatedEntityId: r.id,
          metadata: { organizationId: r.id, organizationName: r.name },
          dedupeHours: 24 * 7,
        });
      }
    }
    return out;
  }

  private async paymentFailureAlerts(): Promise<AlertCandidate[]> {
    const rows = await this.analytics.q(
      `SELECT o.id::text AS id, o.name,
         COUNT(*) FILTER (WHERE po.status::text = 'failed')::int AS failed,
         COUNT(*)::int AS total
       FROM payment_orders po
       JOIN applications a ON a.id::text = po.application_id::text
       JOIN organizations o ON o.id::text = a.organization_id::text
       WHERE po.created_at >= now() - interval '24 hours'
       GROUP BY o.id, o.name
       HAVING COUNT(*) FILTER (WHERE po.status::text = 'failed') >= 3
          AND COUNT(*) FILTER (WHERE po.status::text = 'failed')::float / GREATEST(COUNT(*), 1) >= 0.3`,
      [],
      'payment failure alerts',
    );
    const out: AlertCandidate[] = [];
    for (const r of rows) {
      const rate = Math.round((num(r.failed) / Math.max(1, num(r.total))) * 100);
      const body = `${num(r.failed)} of ${num(r.total)} payment attempts failed in the last 24 hours (${rate}%).`;
      out.push({
        organizationId: null,
        module: 'payments',
        type: 'payment.failure_spike',
        severity: 'critical',
        title: `Payment failure spike: ${r.name}`,
        body,
        link: '/superadmin/organizations',
        relatedEntityId: r.id,
        metadata: { organizationId: r.id, organizationName: r.name, failed: num(r.failed), total: num(r.total) },
        dedupeHours: 12,
      });
      out.push({
        organizationId: r.id,
        recipientRole: 'org_admin',
        module: 'payments',
        type: 'payment.failure_spike',
        severity: 'critical',
        title: 'Payment failures are rising',
        body: `${body} Check the payment gateway settings.`,
        link: '/organization/payments',
        relatedEntityId: r.id,
        metadata: { failed: num(r.failed), total: num(r.total) },
        dedupeHours: 12,
      });
    }
    return out;
  }

  private async slaAlerts(): Promise<AlertCandidate[]> {
    const rows = await this.analytics.q(
      `SELECT l.organization_id::text AS org_id, o.name AS org_name, l.assigned_to::text AS counselor_id, u.name AS counselor_name,
         COUNT(*)::int AS breaches
       FROM leads l
       JOIN organizations o ON o.id::text = l.organization_id::text
       LEFT JOIN users u ON u.id::text = l.assigned_to::text
       WHERE l.assigned_to IS NOT NULL
         AND l.status NOT IN ('closed', 'disqualified', 'converted')
         AND COALESCE(l.assigned_at, l.created_at) + make_interval(hours => $1::int) < now()
         AND NOT EXISTS (SELECT 1 FROM lead_activities a WHERE a.lead_id::text = l.id::text
                           AND a.action NOT IN ('created', 'assigned') AND a.created_at >= COALESCE(l.assigned_at, l.created_at))
       GROUP BY 1, 2, 3, 4`,
      [DEFAULT_SLA_HOURS],
      'sla alerts',
    );
    const out: AlertCandidate[] = [];
    const byOrg = new Map<string, { name: string; total: number }>();
    for (const r of rows) {
      const n = num(r.breaches);
      const cur = byOrg.get(r.org_id) || { name: r.org_name, total: 0 };
      cur.total += n;
      byOrg.set(r.org_id, cur);
      if (r.counselor_id && n > 0) {
        out.push({
          organizationId: r.org_id,
          recipientUserId: r.counselor_id,
          module: 'leads',
          type: 'lead.sla_breach',
          severity: n >= 5 ? 'critical' : 'warning',
          title: `${n} assigned lead${n === 1 ? '' : 's'} waiting for first contact`,
          body: `These leads were assigned more than ${DEFAULT_SLA_HOURS} hours ago and have no follow-up yet.`,
          link: '/organization/leads',
          relatedEntityId: r.counselor_id,
          metadata: { breaches: n, slaHours: DEFAULT_SLA_HOURS },
          dedupeHours: 24,
        });
      }
    }
    for (const [orgId, v] of byOrg) {
      if (v.total < 10) continue;
      out.push({
        organizationId: orgId,
        recipientRole: 'org_admin,lead_manager',
        module: 'leads',
        type: 'lead.sla_backlog',
        severity: 'warning',
        title: `${v.total} leads breached the ${DEFAULT_SLA_HOURS}h response SLA`,
        body: 'Counselors have assigned leads with no first contact. Review the counselor performance report.',
        link: '/organization/reports?tab=counselors',
        relatedEntityId: orgId,
        metadata: { breaches: v.total },
        dedupeHours: 24,
      });
      if (v.total >= 25) {
        out.push({
          organizationId: null,
          module: 'leads',
          type: 'lead.sla_backlog',
          severity: 'warning',
          title: `SLA breaches piling up: ${v.name}`,
          body: `${v.total} assigned leads in ${v.name} have had no first contact for over ${DEFAULT_SLA_HOURS} hours.`,
          link: '/superadmin/dashboard',
          relatedEntityId: orgId,
          metadata: { organizationId: orgId, organizationName: v.name, breaches: v.total },
          dedupeHours: 24,
        });
      }
    }
    return out;
  }

  private async inactiveOrgAlerts(): Promise<AlertCandidate[]> {
    const rows = await this.analytics.q(
      `SELECT o.id::text AS id, o.name,
         GREATEST(
           (SELECT MAX(l.created_at) FROM leads l WHERE l.organization_id::text = o.id::text),
           (SELECT MAX(a.updated_at) FROM applications a WHERE a.organization_id::text = o.id::text),
           (SELECT MAX(c.sent_at) FROM communication_logs c WHERE c.organization_id::text = o.id::text),
           o.created_at
         ) AS last_activity
       FROM organizations o
       WHERE o.status::text = 'active'`,
      [],
      'inactive org alerts',
    );
    const cutoff = Date.now() - 30 * 24 * 3600 * 1000;
    return rows
      .filter((r: any) => r.last_activity && new Date(r.last_activity).getTime() < cutoff)
      .map((r: any) => {
        const days = Math.floor((Date.now() - new Date(r.last_activity).getTime()) / (24 * 3600 * 1000));
        return {
          organizationId: null,
          module: 'organizations',
          type: 'organization.inactive',
          severity: 'info' as const,
          title: `Inactive organization: ${r.name}`,
          body: `No new leads, application updates or communications for ${days} days.`,
          link: '/superadmin/organizations',
          relatedEntityId: r.id,
          metadata: { organizationId: r.id, organizationName: r.name, lastActivityAt: r.last_activity },
          dedupeHours: 24 * 7,
        };
      });
  }
}
