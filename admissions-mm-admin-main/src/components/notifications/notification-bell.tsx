"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadNotificationCount,
} from "@/hooks/use-notifications";
import type { InAppNotificationItem } from "@/types/notifications";
import { moduleLabel, notificationsPageFor, severityStyle, timeAgo } from "./notification-utils";

/**
 * Bell with unread badge and a dropdown of the latest notifications.
 * Polls the unread count every 45 s; the list loads when the dropdown opens.
 */
export function NotificationBell({ className }: { className?: string }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [open, setOpen] = React.useState(false);
  const [tab, setTab] = React.useState<"all" | "unread">("all");

  const { data: counts } = useUnreadNotificationCount();
  const { data: list, isLoading } = useNotifications(
    { limit: 8, status: tab === "unread" ? "unread" : undefined },
    { poll: open },
  );
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  if (!user) return null;

  const unread = counts?.unread ?? 0;
  const critical = counts?.critical ?? 0;
  const items = list?.data ?? [];
  const pageHref = notificationsPageFor(user.role);

  const openItem = (n: InAppNotificationItem) => {
    if (!n.isRead) markRead.mutate({ id: n.id });
    if (n.link) {
      setOpen(false);
      router.push(n.link);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("relative size-9 rounded-full", className)}
          aria-label={unread ? `${unread} unread notifications` : "Notifications"}
        >
          <Bell className="size-5" />
          {unread > 0 && (
            <span
              className={cn(
                "absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-semibold text-white flex items-center justify-center",
                critical > 0 ? "bg-[#dc2626]" : "bg-[#ea2525]",
              )}
            >
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[380px] max-w-[calc(100vw-2rem)] p-0 rounded-[8px] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex flex-col">
            <span className="text-[15px] font-semibold text-foreground">Notifications</span>
            <span className="text-[11px] text-muted-foreground">
              {unread > 0 ? `${unread} unread${critical ? ` · ${critical} critical` : ""}` : "You're all caught up"}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-[12px] gap-1"
            disabled={unread === 0 || markAll.isPending}
            onClick={() => markAll.mutate(undefined)}
          >
            {markAll.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCheck className="size-3.5" />}
            Mark all read
          </Button>
        </div>

        <div className="flex gap-1 px-4 pt-2">
          {(["all", "unread"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                "px-3 py-1 rounded-[8px] text-[12px] font-medium transition-colors",
                tab === t ? "bg-[#2563EB] text-white" : "text-muted-foreground hover:bg-muted",
              )}
            >
              {t === "all" ? "All" : "Unread"}
            </button>
          ))}
        </div>

        <div className="max-h-[420px] overflow-y-auto py-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
              <Bell className="size-6 opacity-40" />
              <span className="text-[13px]">No notifications</span>
            </div>
          ) : (
            items.map((n) => {
              const sev = severityStyle(n.severity);
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => openItem(n)}
                  className={cn(
                    "w-full text-left px-4 py-2.5 flex gap-3 hover:bg-muted/60 transition-colors",
                    !n.isRead && "bg-[#eff6ff]/50 dark:bg-muted/30",
                  )}
                >
                  <span className={cn("mt-1.5 size-2 rounded-full shrink-0", n.isRead ? "bg-transparent" : sev.dot)} />
                  <span className="flex flex-col gap-0.5 min-w-0 flex-1">
                    <span className={cn("text-[13px] leading-snug", n.isRead ? "text-foreground/80" : "font-semibold text-foreground")}>
                      {n.title}
                    </span>
                    {n.body && <span className="text-[12px] text-muted-foreground line-clamp-2">{n.body}</span>}
                    <span className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                      <span className={cn("px-1.5 py-px rounded border text-[10px] font-medium", sev.badge)}>
                        {moduleLabel(n.module)}
                      </span>
                      {timeAgo(n.createdAt)}
                    </span>
                  </span>
                </button>
              );
            })
          )}
        </div>

        {pageHref && (
          <div className="border-t border-border px-4 py-2.5 text-center">
            <Link
              href={pageHref}
              onClick={() => setOpen(false)}
              className="text-[13px] font-medium text-[#2563EB] hover:underline"
            >
              View all notifications
            </Link>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
