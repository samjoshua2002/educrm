"use client";

import * as React from "react";

import { SearchX, ShieldAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { TableCell, TableHead, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

// Staff roles that can open the decision module (the API checks committee
// membership / approver rights for each action).
export const DECISION_ROLES = [
  "superadmin",
  "org_admin",
  "application_manager",
  "exam_manager",
  "counselor",
  "lead_manager",
];
export const DECISION_WRITE_ROLES = [
  "superadmin",
  "org_admin",
  "application_manager",
];

export function formatDate(value?: string | Date | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(value?: string | Date | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function toDateInput(value?: string | Date | null) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

export function formatMoney(value?: number | string | null) {
  const n = Number(value ?? 0);
  if (!isFinite(n)) return "—";
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export function formatScore(value?: number | string | null) {
  if (value === null || value === undefined || value === "") return "—";
  const n = Number(value);
  return isFinite(n) ? n.toFixed(2) : "—";
}

export function Pill({
  tone,
  children,
  className,
}: {
  tone: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Badge
      className={cn(
        tone,
        "font-medium px-2.5 py-0.5 rounded-full text-xs border-0 whitespace-nowrap",
        className,
      )}
    >
      {children}
    </Badge>
  );
}

export function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1 min-w-0", className)}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="text-sm font-medium text-foreground break-words">
        {children}
      </div>
    </div>
  );
}

export function AccessRestricted({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 px-4 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted/40">
        <ShieldAlert className="size-6 text-muted-foreground/80" />
      </div>
      <div className="flex flex-col gap-0.5">
        <p className="text-sm font-semibold text-foreground">
          Access restricted
        </p>
        <p className="text-xs text-muted-foreground max-w-sm">{message}</p>
      </div>
    </div>
  );
}

export const TABLE_WRAPPER =
  "overflow-x-auto rounded-[12px] border border-border bg-card shadow-[0_1px_3px_0_rgba(0,0,0,0.05),0_1px_2px_-1px_rgba(0,0,0,0.05)]";
export const TABLE_HEADER =
  "bg-zinc-100 dark:bg-muted/5 border-b border-border/80";
export const ROW =
  "border-b border-border/80 hover:bg-muted/15 dark:hover:bg-muted/5 transition-colors";
export const CELL = "py-4 px-6 align-middle text-sm";

export function Th({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <TableHead
      className={cn(
        "py-4 px-6 text-xs font-semibold tracking-wider text-muted-foreground uppercase h-auto whitespace-nowrap",
        className,
      )}
    >
      {children}
    </TableHead>
  );
}

export function LoadingRow({
  colSpan,
  label = "Loading...",
}: {
  colSpan: number;
  label?: string;
}) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="h-48 text-center">
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground font-medium">{label}</p>
        </div>
      </TableCell>
    </TableRow>
  );
}

export function EmptyRow({
  colSpan,
  title,
  hint,
}: {
  colSpan: number;
  title: string;
  hint?: string;
}) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="h-48 text-center">
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted/40">
            <SearchX className="size-6 text-muted-foreground/80" />
          </div>
          <div className="flex flex-col gap-0.5 text-center">
            <p className="text-sm font-semibold text-foreground">{title}</p>
            {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
          </div>
        </div>
      </TableCell>
    </TableRow>
  );
}

export function YesNo({ value }: { value: boolean | null | undefined }) {
  return <span>{value ? "Yes" : "No"}</span>;
}
