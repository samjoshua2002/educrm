"use client";

import Link from "next/link";
import {
  CalendarDays,
  ClipboardList,
  CreditCard,
  FileText,
  Gavel,
  Megaphone,
  MessageSquare,
  Users,
} from "lucide-react";

import type { ActivityItem, ModulesOverview } from "@/types/analytics";
import { EmptyBlock, Panel, fmtCurrency, fmtNum, humanize } from "../../reports/_components/analytics-ui";
import { timeAgo } from "@/components/notifications/notification-utils";

interface Tile {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  href: string;
  value: string;
  lines: string[];
  color: string;
}

/** One tile per connected module: leads, applications, interviews, decisions, payments, communications, events. */
export function ModulesOverviewGrid({ modules }: { modules?: ModulesOverview }) {
  if (!modules) return null;
  const tiles: Tile[] = [
    {
      icon: Users,
      title: "Leads",
      href: "/organization/leads",
      value: fmtNum(modules.leads.total),
      lines: [`${fmtNum(modules.leads.newThisWeek)} new this week`, `${fmtNum(modules.leads.unassigned)} unassigned · ${fmtNum(modules.leads.hot)} hot`],
      color: "text-[#2563eb] bg-[#eff6ff]",
    },
    {
      icon: FileText,
      title: "Applications",
      href: "/organization/applications",
      value: fmtNum(modules.applications.total),
      lines: [`${fmtNum(modules.applications.newThisWeek)} new this week`, `${fmtNum(modules.applications.pendingVerification)} pending verification`],
      color: "text-[#9333ea] bg-[#faf5ff]",
    },
    {
      icon: ClipboardList,
      title: "Interviews",
      href: "/organization/gd-interview",
      value: fmtNum(modules.interviews.upcoming),
      lines: ["scheduled / upcoming", `${fmtNum(modules.interviews.completed)} completed`],
      color: "text-[#0891b2] bg-[#ecfeff]",
    },
    {
      icon: Gavel,
      title: "Decisions",
      href: "/organization/decisions",
      value: fmtNum(modules.decisions.pending),
      lines: ["awaiting final decision", `${fmtNum(modules.decisions.offersMade)} offers made`],
      color: "text-[#d97706] bg-[#fffbeb]",
    },
    {
      icon: CreditCard,
      title: "Payments",
      href: "/organization/payments",
      value: fmtCurrency(modules.payments.collected),
      lines: [`${fmtCurrency(modules.payments.collectedLast30Days)} in last 30 days`, `${fmtNum(modules.payments.failedLast30Days)} failed (30 d)`],
      color: "text-[#16a34a] bg-[#f0fdf4]",
    },
    {
      icon: MessageSquare,
      title: "Communications",
      href: "/organization/communications",
      value: fmtNum(modules.communications.sentLast30Days),
      lines: [
        "sent in last 30 days",
        modules.communications.byChannel.map((c) => `${humanize(c.channel)} ${fmtNum(c.count)}`).join(" · ") ||
          `${fmtNum(modules.communications.failedLast30Days)} failed`,
      ],
      color: "text-[#db2777] bg-[#fdf2f8]",
    },
    {
      icon: Megaphone,
      title: "Events & Announcements",
      href: "/organization/events",
      value: fmtNum(modules.events.upcoming),
      lines: ["upcoming events", `${fmtNum(modules.events.announcementsLast30Days)} announcements (30 d)`],
      color: "text-[#ea2525] bg-[#fef2f2]",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
      {tiles.map((t) => (
        <Link
          key={t.title}
          href={t.href}
          className="bg-card border border-[#e5e5e5] dark:border-border rounded-[8px] p-4 flex flex-col gap-2 shadow-xs hover:shadow-md transition-all min-w-0"
        >
          <div className="flex items-center gap-2">
            <span className={`rounded-[8px] p-1.5 ${t.color}`}>
              <t.icon className="size-4" />
            </span>
            <span className="text-[13px] font-medium text-[#64748b] truncate">{t.title}</span>
          </div>
          <span className="text-[20px] font-bold text-[#0f172a] dark:text-foreground leading-none">{t.value}</span>
          {t.lines.map((l, i) => (
            <span key={i} className="text-[11px] text-muted-foreground leading-tight truncate" title={l}>
              {l}
            </span>
          ))}
        </Link>
      ))}
    </div>
  );
}

export function UpcomingEventsPanel({ modules }: { modules?: ModulesOverview }) {
  const items = modules?.events.items || [];
  return (
    <Panel
      title="Events & Announcements"
      action={
        <Link href="/organization/events" className="text-[13px] font-medium text-[#2563EB] hover:underline">
          View all
        </Link>
      }
    >
      {items.length === 0 ? (
        <EmptyBlock height={120} text="No published events or announcements" />
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {items.map((e) => (
            <li key={e.id} className="py-2.5 flex items-start gap-3">
              <span className="rounded-[8px] p-1.5 bg-[#eff6ff] text-[#2563eb] shrink-0">
                {e.type === "event" ? <CalendarDays className="size-4" /> : <Megaphone className="size-4" />}
              </span>
              <div className="flex flex-col min-w-0">
                <span className="text-[13px] font-medium truncate">{e.title}</span>
                <span className="text-[11px] text-muted-foreground">
                  {e.type === "event"
                    ? `${e.eventStartDate || "Date TBA"}${e.eventStartTime ? ` · ${e.eventStartTime}` : ""}${e.venueLocation ? ` · ${e.venueLocation}` : ""}`
                    : `${e.category || "Announcement"}${e.priority ? ` · ${e.priority}` : ""}`}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

const MODULE_COLORS: Record<string, string> = {
  leads: "bg-[#2563eb]",
  applications: "bg-[#9333ea]",
  communications: "bg-[#db2777]",
  payments: "bg-[#16a34a]",
  announcements: "bg-[#ea2525]",
};

export function RecentActivityPanel({ items }: { items?: ActivityItem[] }) {
  const list = items || [];
  return (
    <Panel title="Recent Activity" description="Latest actions across leads, applications, communications, payments and announcements.">
      {list.length === 0 ? (
        <EmptyBlock height={120} text="No recent activity" />
      ) : (
        <ul className="flex flex-col gap-3 max-h-[420px] overflow-y-auto pr-1">
          {list.map((a, i) => (
            <li key={i} className="flex gap-3">
              <span className={`mt-1.5 size-2 rounded-full shrink-0 ${MODULE_COLORS[a.module] || "bg-slate-400"}`} />
              <div className="flex flex-col min-w-0">
                {a.link ? (
                  <Link href={a.link} className="text-[13px] font-medium hover:underline truncate">
                    {humanize(a.title)}
                  </Link>
                ) : (
                  <span className="text-[13px] font-medium truncate">{humanize(a.title)}</span>
                )}
                <span className="text-[11px] text-muted-foreground truncate">
                  {humanize(a.module)}
                  {a.subject ? ` · ${a.subject}` : ""}
                  {a.actor ? ` · by ${a.actor}` : ""} · {timeAgo(a.at)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
