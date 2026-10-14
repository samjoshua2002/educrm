"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, ExternalLink, Loader2, Mail, MailOpen, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationSummary,
  useNotifications,
} from "@/hooks/use-notifications";
import type { InAppNotificationItem } from "@/types/notifications";
import {
  NOTIFICATION_MODULES,
  NOTIFICATION_SEVERITIES,
  moduleLabel,
  severityStyle,
  timeAgo,
} from "./notification-utils";

const PAGE_SIZE = 20;

/** Full notifications & alerts list with module / severity / read filters. */
export function NotificationsPageView() {
  const router = useRouter();
  const [module, setModule] = React.useState("all");
  const [severity, setSeverity] = React.useState("all");
  const [status, setStatus] = React.useState<"all" | "read" | "unread">("all");
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);

  React.useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, isLoading, isFetching } = useNotifications(
    { module, severity, status, search, page, limit: PAGE_SIZE },
    { poll: true },
  );
  const { data: summary = [] } = useNotificationSummary();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  const items = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const totalUnread = summary.reduce((s, m) => s + m.unread, 0);

  // Modules = known list plus any module that actually has notifications.
  const moduleOptions = React.useMemo(() => {
    const opts = [...NOTIFICATION_MODULES];
    summary.forEach((s) => {
      if (!opts.find((o) => o.value === s.module)) opts.push({ value: s.module, label: moduleLabel(s.module) });
    });
    return opts;
  }, [summary]);

  const open = (n: InAppNotificationItem) => {
    if (!n.isRead) markRead.mutate({ id: n.id });
    if (n.link) router.push(n.link);
  };

  return (
    <div className="flex flex-col gap-4 p-4 md:px-6 py-2 md:py-4">
      {/* Module chips with unread counts */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => { setModule("all"); setPage(1); }}
          className={cn(
            "px-3 py-1.5 rounded-[8px] text-[12px] font-medium border transition-colors",
            module === "all" ? "bg-[#2563EB] text-white border-[#2563EB]" : "bg-card text-muted-foreground border-input hover:bg-muted",
          )}
        >
          All {totalUnread > 0 && <span className="ml-1 opacity-80">({totalUnread})</span>}
        </button>
        {summary.map((m) => (
          <button
            key={m.module}
            type="button"
            onClick={() => { setModule(m.module); setPage(1); }}
            className={cn(
              "px-3 py-1.5 rounded-[8px] text-[12px] font-medium border transition-colors",
              module === m.module ? "bg-[#2563EB] text-white border-[#2563EB]" : "bg-card text-muted-foreground border-input hover:bg-muted",
            )}
          >
            {moduleLabel(m.module)}
            <span className="ml-1 opacity-80">({m.unread}/{m.total})</span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative w-full flex-1">
          <Input
            placeholder="Search notifications..."
            className="w-full pr-10 h-10"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <Search className="size-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2" />
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Select value={module} onValueChange={(v) => { setModule(v); setPage(1); }}>
            <SelectTrigger className="w-[160px] h-10" size="lg">
              <SelectValue placeholder="Module" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Modules</SelectItem>
              {moduleOptions.map((m) => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={severity} onValueChange={(v) => { setSeverity(v); setPage(1); }}>
            <SelectTrigger className="w-[140px] h-10" size="lg">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severities</SelectItem>
              {NOTIFICATION_SEVERITIES.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(v) => { setStatus(v as any); setPage(1); }}>
            <SelectTrigger className="w-[130px] h-10" size="lg">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="unread">Unread</SelectItem>
              <SelectItem value="read">Read</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            className="h-10 gap-1.5"
            disabled={markAll.isPending || totalUnread === 0}
            onClick={() => markAll.mutate(module)}
          >
            {markAll.isPending ? <Loader2 className="size-4 animate-spin" /> : <CheckCheck className="size-4" />}
            Mark {module === "all" ? "all" : moduleLabel(module)} read
          </Button>
        </div>
      </div>

      {/* List */}
      <div className="rounded-[12px] border border-border bg-card shadow-[0_1px_3px_0_rgba(0,0,0,0.05)] overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
            <Bell className="size-8 opacity-40" />
            <span className="text-sm">No notifications match these filters</span>
          </div>
        ) : (
          <ul className={cn("divide-y divide-border", isFetching && "opacity-70")}>
            {items.map((n) => {
              const sev = severityStyle(n.severity);
              return (
                <li
                  key={n.id}
                  className={cn("flex gap-3 px-4 py-3.5", !n.isRead && "bg-[#eff6ff]/40 dark:bg-muted/20")}
                >
                  <span className={cn("mt-2 size-2 rounded-full shrink-0", n.isRead ? "bg-slate-300" : sev.dot)} />
                  <div className="flex flex-col gap-1 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn("text-[14px]", n.isRead ? "text-foreground/80" : "font-semibold text-foreground")}>
                        {n.title}
                      </span>
                      <span className={cn("px-2 py-px rounded-full border text-[11px] font-medium capitalize", sev.badge)}>
                        {n.severity}
                      </span>
                      <span className="px-2 py-px rounded-full border border-input text-[11px] text-muted-foreground">
                        {moduleLabel(n.module)}
                      </span>
                    </div>
                    {n.body && <p className="text-[13px] text-muted-foreground whitespace-pre-line">{n.body}</p>}
                    <span className="text-[11px] text-muted-foreground">
                      {timeAgo(n.createdAt)} · {new Date(n.createdAt).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex items-start gap-1 shrink-0">
                    {n.link && (
                      <Button variant="ghost" size="icon" className="size-8" title="Open" onClick={() => open(n)}>
                        <ExternalLink className="size-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      title={n.isRead ? "Mark as unread" : "Mark as read"}
                      onClick={() => markRead.mutate({ id: n.id, read: !n.isRead })}
                    >
                      {n.isRead ? <Mail className="size-4" /> : <MailOpen className="size-4" />}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-[13px] text-muted-foreground">
        <span>
          {total === 0 ? "No results" : `Showing ${(page - 1) * PAGE_SIZE + 1}-${Math.min(page * PAGE_SIZE, total)} of ${total}`}
        </span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
