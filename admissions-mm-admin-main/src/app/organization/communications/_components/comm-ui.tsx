"use client";

// Shared building blocks for the Communication Management pages
// (communications, email campaigns, calls, messaging / telephony settings).
// They reuse the classes of the existing organization screens.

import * as React from "react";
import { Check, Copy, SearchX, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export const pill = {
  green: "bg-[#05966933] text-[#065F46] dark:bg-emerald-500/20 dark:text-emerald-300 font-medium px-2.5 py-0.5 rounded-full text-xs border-0 whitespace-nowrap",
  amber: "bg-[#FEF3C7] text-[#9A3412] dark:bg-amber-500/20 dark:text-amber-300 font-medium px-2.5 py-0.5 rounded-full text-xs border-0 whitespace-nowrap",
  blue: "bg-[#DBEAFE] text-[#1D4ED8] dark:bg-blue-500/20 dark:text-blue-300 font-medium px-2.5 py-0.5 rounded-full text-xs border-0 whitespace-nowrap",
  purple: "bg-[#EDE9FE] text-[#6D28D9] dark:bg-purple-500/20 dark:text-purple-300 font-medium px-2.5 py-0.5 rounded-full text-xs border-0 whitespace-nowrap",
  red: "bg-[#FEE2E2] text-[#B91C1C] dark:bg-red-500/20 dark:text-red-300 font-medium px-2.5 py-0.5 rounded-full text-xs border-0 whitespace-nowrap",
  cyan: "bg-[#CFFAFE] text-[#155E75] dark:bg-cyan-500/20 dark:text-cyan-300 font-medium px-2.5 py-0.5 rounded-full text-xs border-0 whitespace-nowrap",
  gray: "bg-muted text-muted-foreground font-medium px-2.5 py-0.5 rounded-full text-xs border-0 whitespace-nowrap",
};

const STATUS_COLORS: Record<string, keyof typeof pill> = {
  // delivery
  sent: "blue",
  queued: "blue",
  delivered: "green",
  read: "green",
  opened: "green",
  clicked: "purple",
  failed: "red",
  bounced: "red",
  blocked: "red",
  scheduled: "amber",
  cancelled: "gray",
  pending: "gray",
  stopped: "gray",
  unsubscribed: "amber",
  // campaigns / templates
  active: "green",
  approved: "green",
  paused: "amber",
  draft: "gray",
  completed: "blue",
  archived: "gray",
  // calls
  answered: "green",
  "not answered": "amber",
  busy: "amber",
  dropped: "red",
  "in progress": "blue",
  interested: "green",
  "not interested": "red",
  "follow-up required": "amber",
  // consent
  "opted in": "green",
  "opted out": "red",
  unknown: "gray",
};

export function StatusPill({ status, className }: { status?: string | null; className?: string }) {
  if (!status) return <span className={pill.gray}>—</span>;
  const color = STATUS_COLORS[String(status).toLowerCase()] || "gray";
  const label = String(status).charAt(0).toUpperCase() + String(status).slice(1);
  return <span className={cn(pill[color], className)}>{label}</span>;
}

export const CHANNEL_COLORS: Record<string, keyof typeof pill> = {
  Email: "blue",
  SMS: "purple",
  WhatsApp: "green",
  Call: "amber",
  System: "gray",
};

export function ChannelPill({ channel }: { channel?: string | null }) {
  return <span className={pill[CHANNEL_COLORS[channel || ""] || "gray"]}>{channel || "—"}</span>;
}

export const thClass =
  "py-4 px-4 text-xs font-semibold tracking-wider text-muted-foreground uppercase h-auto whitespace-nowrap";

export function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <TableHead className={cn(thClass, className)}>{children}</TableHead>;
}

export const tableShell =
  "overflow-x-auto rounded-[12px] border border-border bg-card shadow-[0_1px_3px_0_rgba(0,0,0,0.05),0_1px_2px_-1px_rgba(0,0,0,0.05)]";
export const tableHeaderClass = "bg-zinc-100 dark:bg-muted/5 border-b border-border/80";

export function PageTitle({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h2 className="text-[18px] sm:text-[20px] font-bold text-foreground">{title}</h2>
        {description && <p className="text-[12px] sm:text-[13px] text-muted-foreground mt-0.5">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({
  icon,
  label,
  value,
  color = "#2563EB",
  bg = "#EFF6FF",
  ratio,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  color?: string;
  bg?: string;
  ratio?: number;
  hint?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-[12px] px-5 py-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-all duration-200">
      <div className="flex flex-col items-start gap-1 shrink-0">
        <div className="w-11 h-11 rounded-[10px] flex items-center justify-center" style={{ backgroundColor: bg, color }}>
          {icon}
        </div>
        <span className="text-[11px] font-medium text-muted-foreground whitespace-nowrap">{label}</span>
      </div>
      <div className="flex flex-col gap-2 flex-1 min-w-0">
        <span className="text-[28px] font-bold leading-none text-foreground">{value}</span>
        <div className="w-full h-[6px] rounded-[9999px] overflow-hidden" style={{ backgroundColor: `${color}26` }}>
          <div
            className="h-full rounded-[9999px] transition-all duration-700"
            style={{ width: `${Math.max(0, Math.min(100, (ratio ?? 1) * 100))}%`, backgroundColor: color }}
          />
        </div>
        {hint && <span className="text-[11px] text-muted-foreground truncate">{hint}</span>}
      </div>
    </div>
  );
}

export function StatRibbon({ items }: { items: { label: string; value: React.ReactNode; accent?: string }[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 p-4 rounded-[8px] border border-border bg-card shadow-xs">
      {items.map((it) => (
        <div key={it.label} className="space-y-0.5">
          <span className="block text-[10px] font-bold leading-[15px] tracking-[1px] uppercase text-muted-foreground">{it.label}</span>
          <p className={cn("text-[15px] sm:text-[16px] font-bold leading-[22px] text-foreground", it.accent)}>{it.value}</p>
        </div>
      ))}
    </div>
  );
}

export function SectionCard({
  title,
  description,
  actions,
  children,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col rounded-[8px] border border-border bg-card shadow-xs overflow-hidden", className)}>
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border/60 bg-muted/30">
        <div className="min-w-0">
          <div className="text-[15px] sm:text-[16px] font-bold leading-[24px] text-foreground">{title}</div>
          {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
      <div className="p-4 sm:p-5 flex flex-col gap-4">{children}</div>
    </div>
  );
}

export function FieldLabel({ children, htmlFor, required }: { children: React.ReactNode; htmlFor?: string; required?: boolean }) {
  return (
    <Label htmlFor={htmlFor} className="text-muted-foreground font-semibold text-[11px] uppercase tracking-wider">
      {children}
      {required && <span className="text-destructive">*</span>}
    </Label>
  );
}

export function Field({ label, children, hint, required, className }: { label: string; children: React.ReactNode; hint?: React.ReactNode; required?: boolean; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-2 min-w-0", className)}>
      <FieldLabel required={required}>{label}</FieldLabel>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function ReadOnlyField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <FieldLabel>{label}</FieldLabel>
      <div className="border border-input min-h-[40px] rounded-[8px] text-[12px] flex items-center px-3 py-2 bg-muted/30 text-foreground break-words">
        {value === null || value === undefined || value === "" ? <span className="text-muted-foreground">—</span> : value}
      </div>
    </div>
  );
}

export function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = React.useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy to clipboard");
    }
  };
  return (
    <div className="flex flex-col gap-2 min-w-0">
      <FieldLabel>{label}</FieldLabel>
      <div className="flex items-center gap-2">
        <code className="flex-1 min-w-0 border border-input h-[40px] rounded-[8px] text-[12px] flex items-center px-3 bg-muted/30 text-foreground overflow-x-auto whitespace-nowrap">
          {value}
        </code>
        <Button type="button" variant="outline" size="icon" className="h-10 w-10 shrink-0" onClick={copy}>
          {copied ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
        </Button>
      </div>
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted/40">
        <SearchX className="size-6 text-muted-foreground/80" />
      </div>
      <div className="flex flex-col gap-0.5">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function TabBar<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: { value: T; label: string; count?: number }[];
  active: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="border-b border-border flex gap-4 sm:gap-8 overflow-x-auto w-full pt-1">
      {tabs.map((t) => (
        <button
          key={t.value}
          type="button"
          onClick={() => onChange(t.value)}
          className={cn(
            "pb-3 text-xs sm:text-sm font-medium transition-colors cursor-pointer border-b-[3px] whitespace-nowrap shrink-0",
            active === t.value ? "border-primary text-primary font-bold" : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          {t.label}
          {t.count !== undefined && <span className="ml-1.5 text-[11px] text-muted-foreground">({t.count})</span>}
        </button>
      ))}
    </div>
  );
}

export function Pager({ page, limit, total, onPage }: { page: number; limit: number; total: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / limit));
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(total, page * limit);
  return (
    <div className="flex items-center justify-between gap-3 px-1 py-2 text-xs text-muted-foreground">
      <span>
        Showing {from}–{to} of {total}
      </span>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          <ChevronLeft className="size-4" />
        </Button>
        <span className="font-medium text-foreground">
          {page} / {pages}
        </span>
        <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

export function formatDateTime(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function formatDate(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDuration(seconds?: number | null) {
  const s = Math.max(0, Number(seconds) || 0);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m ? `${m}m ${r}s` : `${r}s`;
}

export function errorText(e: any, fallback = "Something went wrong") {
  const m = e?.response?.data?.message || e?.message || fallback;
  return Array.isArray(m) ? m.join(", ") : String(m);
}

/** Toggle chip group used for multi-select picklists. */
export function ChipToggleGroup({
  options,
  value,
  onChange,
}: {
  options: readonly string[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = value.includes(o);
        return (
          <button
            key={o}
            type="button"
            onClick={() => onChange(on ? value.filter((x) => x !== o) : [...value, o])}
            className={cn(
              "h-8 px-3 rounded-full border text-xs font-medium transition-colors cursor-pointer",
              on ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground hover:bg-muted/40",
            )}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}
