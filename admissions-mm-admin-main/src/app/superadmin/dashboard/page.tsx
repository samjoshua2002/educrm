"use client";

import * as React from "react";
import Link from "next/link";
import {
  BadgeIndianRupee,
  Bell,
  Building2,
  CalendarX2,
  CheckCircle2,
  CreditCard,
  FileText,
  Loader2,
  MessageSquare,
  RefreshCw,
  ShieldAlert,
  Users,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { usePageHeader } from "@/hooks/use-page-header";
import { usePlatformOverview, useRunPlatformAlerts } from "@/hooks/use-analytics";
import { useMarkNotificationRead, useNotifications, useUnreadNotificationCount } from "@/hooks/use-notifications";
import { cn } from "@/lib/utils";
import type { PlatformOrgRow } from "@/types/analytics";
import {
  DataTable,
  DonutChart,
  EmptyBlock,
  LoadingBlock,
  Panel,
  SimpleBarChart,
  StatCard,
  TrendChart,
  fmtCurrency,
  fmtNum,
  fmtPct,
  humanize,
} from "@/app/organization/reports/_components/analytics-ui";
import { moduleLabel, severityStyle, timeAgo } from "@/components/notifications/notification-utils";

const SUB_STYLES: Record<string, string> = {
  active: "bg-[#f0fdf4] text-[#16a34a]",
  expiring: "bg-[#fffbeb] text-[#b45309]",
  expired: "bg-[#fef2f2] text-[#dc2626]",
};

export default function SuperadminDashboardPage() {
  usePageHeader({
    title: "Platform Dashboard",
    description: "KPIs across all organizations, subscriptions, revenue, communication volume and platform alerts.",
  });

  const { data, isLoading, isFetching, refetch } = usePlatformOverview();
  const k = data?.kpis;

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 w-full max-w-full min-w-0">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={cn("size-3.5", isFetching && "animate-spin")} />
          {data?.generatedAt ? `Updated ${timeAgo(data.generatedAt)}` : "Refresh"}
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard loading={isLoading} icon={Building2} label="Organizations" value={`${fmtNum(k?.organizationsActive)} / ${fmtNum(k?.organizationsTotal)}`} hint={`active · ${fmtNum(k?.newOrganizations30)} new in 30 d`} />
        <StatCard loading={isLoading} icon={CalendarX2} tone="amber" label="Subscriptions expiring" value={fmtNum(k?.subscriptionsExpiring30)} hint={`${fmtNum(k?.subscriptionsExpiring7)} within 7 d · ${fmtNum(k?.subscriptionsExpired)} expired`} />
        <StatCard loading={isLoading} icon={Users} tone="purple" label="Users" value={fmtNum(k?.staffUsers)} hint={`staff · ${fmtNum(k?.studentUsers)} students`} />
        <StatCard loading={isLoading} icon={FileText} tone="slate" label="Leads / Applications" value={`${fmtNum(k?.leads)} / ${fmtNum(k?.applications)}`} hint={`${fmtPct(k?.leadToApplication)} lead → app · ${fmtNum(k?.enrolled)} enrolled`} />
        <StatCard loading={isLoading} icon={BadgeIndianRupee} tone="green" label="Revenue collected" value={fmtCurrency(k?.revenue)} hint={`${fmtCurrency(k?.revenue30)} in 30 d · ${fmtPct(k?.paymentSuccessRate)} success`} />
        <StatCard loading={isLoading} icon={MessageSquare} tone="blue" label="Communications (30 d)" value={fmtNum(k?.communications30)} hint={`${fmtNum(k?.communicationsFailed30)} failed · ${fmtNum(k?.communications)} all-time`} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 flex flex-col gap-6">
          <Panel title="Platform Trend" description="Leads, applications and enrolments per month across all organizations.">
            {isLoading ? (
              <LoadingBlock />
            ) : (
              <TrendChart
                data={data?.trend || []}
                lines={[
                  { key: "leads", label: "Leads" },
                  { key: "applications", label: "Applications" },
                  { key: "enrolled", label: "Enrolled" },
                  { key: "organizations", label: "New organizations" },
                ]}
              />
            )}
          </Panel>
          <Panel title="Monthly Revenue">
            {isLoading ? (
              <LoadingBlock />
            ) : (
              <SimpleBarChart data={data?.trend || []} xKey="month" bars={[{ key: "revenue", label: "Revenue", color: "#16a34a" }]} valueFormatter={(v) => fmtCurrency(v)} height={220} />
            )}
          </Panel>
        </div>
        <AlertsPanel />
      </div>

      <Panel title="Organization Comparison" description="Leads, applications, enrolments, revenue and configuration health per organization.">
        {isLoading ? (
          <LoadingBlock />
        ) : (
          <DataTable<PlatformOrgRow>
            rows={data?.organizations || []}
            csvName="organization-comparison"
            maxHeight={520}
            columns={[
              {
                key: "name",
                label: "Organization",
                render: (r) => (
                  <Link href={`/superadmin/organizations/${r.id}/users`} className="font-medium hover:underline">
                    {r.name}
                  </Link>
                ),
              },
              { key: "status", label: "Status", render: (r) => humanize(r.status) },
              {
                key: "subscriptionState",
                label: "Subscription",
                render: (r) => (
                  <span className={cn("px-2 py-0.5 rounded-full text-[11px] font-medium", SUB_STYLES[r.subscriptionState])}>
                    {r.subscriptionState === "active" ? "Active" : r.subscriptionState === "expired" ? "Expired" : `${r.daysLeft} d left`}
                  </span>
                ),
                csv: (r) => `${r.subscriptionState}${r.subscriptionEnd ? ` (${String(r.subscriptionEnd).slice(0, 10)})` : ""}`,
              },
              { key: "staff", label: "Staff", align: "right" },
              { key: "students", label: "Students", align: "right" },
              { key: "leads", label: "Leads", align: "right", render: (r) => fmtNum(r.leads) },
              { key: "applications", label: "Applications", align: "right", render: (r) => fmtNum(r.applications) },
              { key: "conversionRate", label: "Lead → App", align: "right", render: (r) => fmtPct(r.conversionRate) },
              { key: "offers", label: "Offers", align: "right" },
              { key: "enrolled", label: "Enrolled", align: "right" },
              { key: "revenue", label: "Revenue", align: "right", render: (r) => fmtCurrency(r.revenue), csv: (r) => r.revenue },
              { key: "communications30", label: "Comms (30 d)", align: "right" },
              {
                key: "health",
                label: "Setup",
                render: (r) => (
                  <span className="flex gap-1.5 text-[11px]">
                    <HealthChip ok={r.smtpConfigured} label="SMTP" />
                    <HealthChip ok={r.paymentGatewayConfigured} label="Payments" />
                    {r.paymentFailures7d > 0 && (
                      <span className="px-1.5 rounded bg-[#fef2f2] text-[#dc2626]">{r.paymentFailures7d} failed</span>
                    )}
                  </span>
                ),
                csv: (r) => `SMTP:${r.smtpConfigured ? "yes" : "no"} Payments:${r.paymentGatewayConfigured ? "yes" : "no"}`,
              },
              {
                key: "lastActivityAt",
                label: "Last activity",
                render: (r) => (r.lastActivityAt ? timeAgo(r.lastActivityAt) : "Never"),
                csv: (r) => r.lastActivityAt || "",
              },
            ]}
          />
        )}
      </Panel>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Panel
          title="Subscriptions Expiring / Expired"
          action={<Link href="/superadmin/subscriptions" className="text-[13px] font-medium text-[#2563EB] hover:underline">Manage</Link>}
        >
          {(data?.expiringSubscriptions || []).length === 0 ? (
            <EmptyBlock height={120} text="No subscriptions expiring in the next 30 days" />
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {data!.expiringSubscriptions.map((s) => (
                <li key={s.id} className="py-2 flex items-center justify-between gap-2">
                  <span className="text-[13px] font-medium truncate">{s.name}</span>
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded-full text-[11px] font-medium shrink-0",
                      (s.daysLeft ?? 0) < 0 ? SUB_STYLES.expired : SUB_STYLES.expiring,
                    )}
                  >
                    {(s.daysLeft ?? 0) < 0 ? `Expired ${Math.abs(s.daysLeft ?? 0)} d ago` : `${s.daysLeft} d left`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Users by Role">
          <DonutChart data={(data?.usersByRole || []).map((u) => ({ name: humanize(u.role), value: u.count }))} height={180} />
        </Panel>
        <Panel title="Communication Volume (30 d)">
          <SimpleBarChart
            data={(data?.communicationsByChannel || []).map((c) => ({ ...c, channel: humanize(c.channel) }))}
            xKey="channel"
            bars={[
              { key: "count", label: "Sent" },
              { key: "failed", label: "Failed", color: "#ea2525" },
            ]}
            height={200}
          />
        </Panel>
      </div>

      <Panel title="Recent Platform Activity">
        {(data?.recentActivity || []).length === 0 ? (
          <EmptyBlock height={120} text="No recent activity" />
        ) : (
          <ul className="flex flex-col gap-3">
            {data!.recentActivity.map((a, i) => (
              <li key={i} className="flex gap-3">
                <span className="mt-1.5 size-2 rounded-full shrink-0 bg-[#2563eb]" />
                <div className="flex flex-col min-w-0">
                  <span className="text-[13px] font-medium truncate">{a.title}</span>
                  <span className="text-[11px] text-muted-foreground truncate">
                    {a.organization}
                    {a.subject && a.subject !== a.organization ? ` · ${a.subject}` : ""} · {timeAgo(a.at)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard loading={isLoading} icon={CreditCard} tone="green" label="Payments paid" value={fmtNum(k?.paymentsPaid)} />
        <StatCard loading={isLoading} icon={XCircle} tone="red" label="Payments failed" value={fmtNum(k?.paymentsFailed)} hint={`${fmtNum(k?.paymentsFailed7)} in last 7 d`} />
        <StatCard loading={isLoading} icon={CheckCircle2} tone="purple" label="Offers made" value={fmtNum(k?.offers)} />
        <StatCard loading={isLoading} icon={ShieldAlert} tone="amber" label="Suspended orgs" value={fmtNum(k?.organizationsSuspended)} />
      </div>
    </div>
  );
}

function HealthChip({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={cn("px-1.5 rounded", ok ? "bg-[#f0fdf4] text-[#16a34a]" : "bg-[#fffbeb] text-[#b45309]")}>
      {label} {ok ? "✓" : "✗"}
    </span>
  );
}

/** Notifications & alerts raised for the superadmin (platform alerts have organizationId = null). */
function AlertsPanel() {
  const { data, isLoading } = useNotifications({ limit: 12 }, { poll: true });
  const { data: counts } = useUnreadNotificationCount();
  const markRead = useMarkNotificationRead();
  const runAlerts = useRunPlatformAlerts();
  const items = data?.data || [];

  return (
    <Panel
      title="Notifications & Alerts"
      description={counts ? `${counts.unread} unread · ${counts.critical} critical` : undefined}
      action={
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-[12px]" disabled={runAlerts.isPending} onClick={() => runAlerts.mutate()}>
          {runAlerts.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <ShieldAlert className="size-3.5" />}
          Run check
        </Button>
      }
    >
      {isLoading ? (
        <LoadingBlock height={200} />
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
          <Bell className="size-6 opacity-40" />
          <span className="text-[13px]">No alerts — the platform looks healthy</span>
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-border max-h-[560px] overflow-y-auto -mx-1">
          {items.map((n) => {
            const sev = severityStyle(n.severity);
            return (
              <li key={n.id} className={cn("px-1 py-2.5 flex gap-2.5", !n.isRead && "bg-[#eff6ff]/40")}>
                <span className={cn("mt-1.5 size-2 rounded-full shrink-0", n.isRead ? "bg-slate-300" : sev.dot)} />
                <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                  {n.link ? (
                    <Link
                      href={n.link}
                      onClick={() => !n.isRead && markRead.mutate({ id: n.id })}
                      className={cn("text-[13px] hover:underline", !n.isRead && "font-semibold")}
                    >
                      {n.title}
                    </Link>
                  ) : (
                    <span className={cn("text-[13px]", !n.isRead && "font-semibold")}>{n.title}</span>
                  )}
                  {n.body && <span className="text-[12px] text-muted-foreground line-clamp-2">{n.body}</span>}
                  <span className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span className={cn("px-1.5 py-px rounded border text-[10px] font-medium capitalize", sev.badge)}>{n.severity}</span>
                    {moduleLabel(n.module)} · {timeAgo(n.createdAt)}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <Link href="/superadmin/notifications" className="text-[13px] font-medium text-[#2563EB] hover:underline self-center">
        View all notifications
      </Link>
    </Panel>
  );
}
