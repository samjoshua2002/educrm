"use client";

// Small shared building blocks for the Lead Management pages. They reuse the
// classes of the existing organization screens (lead list, scoring bands).

import * as React from "react";
import { Check, Copy, SearchX } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export const bandStyles: Record<string, string> = {
  hot: "bg-[#FEE2E2] text-[#991B1B] dark:bg-rose-500/20 dark:text-rose-300 font-medium px-2.5 py-0.5 rounded-full text-xs border-0",
  warm: "bg-[#FFEDD5] text-[#9A3412] dark:bg-amber-500/20 dark:text-amber-300 font-medium px-2.5 py-0.5 rounded-full text-xs border-0",
  cold: "bg-[#CFFAFE] text-[#155E75] dark:bg-cyan-500/20 dark:text-cyan-300 font-medium px-2.5 py-0.5 rounded-full text-xs border-0",
};

export const pillStyles = {
  green: "bg-[#05966933] text-[#065F46] dark:bg-emerald-500/20 dark:text-emerald-300 font-medium px-2.5 py-0.5 rounded-full text-xs border-0",
  amber: "bg-[#FEF3C7] text-[#9A3412] dark:bg-amber-500/20 dark:text-amber-300 font-medium px-2.5 py-0.5 rounded-full text-xs border-0",
  blue: "bg-[#DBEAFE] text-[#1D4ED8] dark:bg-blue-500/20 dark:text-blue-300 font-medium px-2.5 py-0.5 rounded-full text-xs border-0",
  purple: "bg-[#EDE9FE] text-[#6D28D9] dark:bg-purple-500/20 dark:text-purple-300 font-medium px-2.5 py-0.5 rounded-full text-xs border-0",
  red: "bg-[#FEE2E2] text-[#B91C1C] dark:bg-red-500/20 dark:text-red-300 font-medium px-2.5 py-0.5 rounded-full text-xs border-0",
  gray: "bg-muted text-muted-foreground font-medium px-2.5 py-0.5 rounded-full text-xs border-0",
};

export const followUpStyles: Record<string, string> = {
  Pending: pillStyles.amber,
  Contacted: pillStyles.green,
  Scheduled: pillStyles.blue,
};

export function BandBadge({ band, score }: { band?: string | null; score?: number | null }) {
  if (!band) return <span className={pillStyles.gray}>Unscored</span>;
  const label = band.charAt(0).toUpperCase() + band.slice(1);
  return (
    <span className={bandStyles[band] ?? pillStyles.gray}>
      {label}
      {score !== undefined && score !== null ? ` · ${score}` : ""}
    </span>
  );
}

export const thClass =
  "py-4 px-4 text-xs font-semibold tracking-wider text-muted-foreground uppercase h-auto whitespace-nowrap";

export function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <TableHead className={cn(thClass, className)}>{children}</TableHead>;
}

export const tableShell =
  "overflow-x-auto rounded-[12px] border border-border bg-card shadow-[0_1px_3px_0_rgba(0,0,0,0.05),0_1px_2px_-1px_rgba(0,0,0,0.05)]";
export const tableHeaderClass = "bg-zinc-100 dark:bg-muted/5 border-b border-border/80";

export function PageTitle({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
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

export function StatRibbon({ items }: { items: { label: string; value: React.ReactNode; accent?: string }[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 p-4 rounded-[8px] border border-border bg-card shadow-xs">
      {items.map((it) => (
        <div key={it.label} className="space-y-0.5">
          <span className="block text-[10px] font-bold leading-[15px] tracking-[1px] uppercase text-muted-foreground">
            {it.label}
          </span>
          <p className={cn("text-[15px] sm:text-[16px] font-bold leading-[22px] text-foreground", it.accent)}>
            {it.value}
          </p>
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

export function FieldLabel({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <Label htmlFor={htmlFor} className="text-muted-foreground font-semibold text-[11px] uppercase tracking-wider">
      {children}
    </Label>
  );
}

export function ReadOnlyField({ label, value, title }: { label: string; value: React.ReactNode; title?: string }) {
  return (
    <div className="flex flex-col gap-2 min-w-0">
      <FieldLabel>{label}</FieldLabel>
      <div
        className="border border-input min-h-[40px] rounded-[8px] text-[12px] flex items-center px-3 py-2 bg-muted/30 text-foreground break-all"
        title={title}
      >
        {value === null || value === undefined || value === "" ? <span className="text-muted-foreground">—</span> : value}
      </div>
    </div>
  );
}

export function CopyField({ label, value, secret }: { label: string; value: string; secret?: boolean }) {
  const [copied, setCopied] = React.useState(false);
  const [shown, setShown] = React.useState(!secret);
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
          {shown ? value : "•".repeat(Math.min(32, value.length))}
        </code>
        {secret && (
          <Button type="button" variant="outline" className="h-10 px-3 text-xs" onClick={() => setShown((s) => !s)}>
            {shown ? "Hide" : "Show"}
          </Button>
        )}
        <Button type="button" variant="outline" size="icon" className="h-10 w-10 shrink-0" onClick={copy}>
          {copied ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
        </Button>
      </div>
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted/40">
        <SearchX className="size-6 text-muted-foreground/80" />
      </div>
      <div className="flex flex-col gap-0.5">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
    </div>
  );
}

export function TabBar<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: { value: T; label: string }[];
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
            active === t.value
              ? "border-primary text-primary font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          {t.label}
        </button>
      ))}
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

export function formatMoney(v?: number | null, currency = "INR") {
  if (v === null || v === undefined) return "—";
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 }).format(v);
  } catch {
    return `${currency} ${v}`;
  }
}

export function leadName(l?: { firstName?: string | null; lastName?: string | null; email?: string | null; phone?: string | null } | null) {
  if (!l) return "—";
  return `${l.firstName || ""} ${l.lastName || ""}`.trim() || l.email || l.phone || "Unnamed lead";
}
