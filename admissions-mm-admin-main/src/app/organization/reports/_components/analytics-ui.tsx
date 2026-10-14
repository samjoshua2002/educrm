"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download, Loader2, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useAnalyticsFilterOptions } from "@/hooks/use-analytics";
import type { AnalyticsFilters, FunnelStage } from "@/types/analytics";

// ── Formatting ──────────────────────────────────────────────────────────────
export const CHART_COLORS = ["#2563eb", "#16a34a", "#f59e0b", "#9333ea", "#ea2525", "#0891b2", "#db2777", "#65a30d", "#64748b", "#c2410c"];

export const fmtNum = (v?: number | null) => (v === null || v === undefined ? "—" : Number(v).toLocaleString("en-IN"));

export function fmtCurrency(v?: number | null, compact = true) {
  if (v === null || v === undefined || isNaN(Number(v))) return "—";
  const n = Number(v);
  if (compact) {
    if (Math.abs(n) >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(2)}Cr`;
    if (Math.abs(n) >= 1_00_000) return `₹${(n / 1_00_000).toFixed(1)}L`;
    if (Math.abs(n) >= 1_000) return `₹${(n / 1_000).toFixed(1)}k`;
  }
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export const fmtPct = (v?: number | null) => (v === null || v === undefined ? "—" : `${Number(v).toFixed(1).replace(/\.0$/, "")}%`);

export const fmtDays = (v?: number | null) => (v === null || v === undefined ? "—" : `${Number(v).toFixed(1)} d`);

export const fmtHours = (v?: number | null) => (v === null || v === undefined ? "—" : `${Number(v).toFixed(1)} h`);

export function fmtMonth(m: string) {
  const [y, mo] = (m || "").split("-");
  if (!y || !mo) return m;
  return new Date(Number(y), Number(mo) - 1, 1).toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
}

export const humanize = (s?: string | null) =>
  s ? String(s).replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "—";

// ── CSV export ──────────────────────────────────────────────────────────────
export interface Column<T> {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
  /** Display value */
  render?: (row: T) => React.ReactNode;
  /** CSV value (defaults to row[key]) */
  csv?: (row: T) => string | number | null | undefined;
  className?: string;
}

export function downloadCsv<T>(filename: string, rows: T[], columns: Column<T>[]) {
  const esc = (v: any) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [
    columns.map((c) => esc(c.label)).join(","),
    ...rows.map((r) => columns.map((c) => esc(c.csv ? c.csv(r) : (r as any)[c.key])).join(",")),
  ];
  const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ── Layout pieces ───────────────────────────────────────────────────────────
export function Panel({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("bg-card border border-[#e5e5e5] dark:border-border rounded-[8px] p-5 md:p-6 flex flex-col gap-4 shadow-xs min-w-0", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5 min-w-0">
          <h2 className="text-[#0A0A0A] dark:text-foreground text-[16px] md:text-[18px] font-semibold">{title}</h2>
          {description && <p className="text-[13px] text-muted-foreground">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

const TONES: Record<string, { bg: string; fg: string }> = {
  blue: { bg: "bg-[#eff6ff]", fg: "text-[#2563eb]" },
  green: { bg: "bg-[#f0fdf4]", fg: "text-[#16a34a]" },
  amber: { bg: "bg-[#fffbeb]", fg: "text-[#d97706]" },
  red: { bg: "bg-[#fef2f2]", fg: "text-[#dc2626]" },
  purple: { bg: "bg-[#faf5ff]", fg: "text-[#9333ea]" },
  slate: { bg: "bg-[#f1f5f9]", fg: "text-[#475569]" },
};

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "blue",
  progress,
  loading,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: keyof typeof TONES;
  progress?: number | null;
  loading?: boolean;
}) {
  const t = TONES[tone] || TONES.blue;
  if (loading) {
    return (
      <div className="bg-card border border-[#e5e5e5] dark:border-border rounded-[8px] p-5 flex flex-col gap-4 shadow-xs animate-pulse">
        <div className="w-10 h-10 rounded-[8px] bg-slate-200" />
        <div className="h-4 w-24 bg-slate-200 rounded" />
        <div className="h-7 w-16 bg-slate-200 rounded" />
      </div>
    );
  }
  return (
    <div className="bg-card border border-[#e5e5e5] dark:border-border rounded-[8px] p-5 flex flex-col items-start shadow-xs transition-all duration-200 hover:shadow-md min-w-0">
      <div className={cn("rounded-[8px] p-[8px] flex items-center justify-center shrink-0", t.bg)}>
        <Icon className={cn("size-5", t.fg)} />
      </div>
      <span className="text-[#64748b] text-[13px] font-medium mt-3">{label}</span>
      <span className="text-[#0f172a] dark:text-foreground text-[22px] font-bold mt-1 leading-none">{value}</span>
      {hint && <span className="text-[12px] text-muted-foreground mt-2">{hint}</span>}
      {progress !== undefined && progress !== null && (
        <div className="bg-[#f1f5f9] h-[6px] rounded-full w-full overflow-hidden mt-3">
          <div className={cn("h-full rounded-full", t.fg.replace("text-", "bg-"))} style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
        </div>
      )}
    </div>
  );
}

export function LoadingBlock({ height = 250 }: { height?: number }) {
  return (
    <div className="w-full flex items-center justify-center" style={{ height }}>
      <Loader2 className="size-7 animate-spin text-[#2563EB]" />
    </div>
  );
}

export function EmptyBlock({ height = 200, text = "No data for the selected filters" }: { height?: number; text?: string }) {
  return (
    <div className="w-full flex items-center justify-center text-[13px] text-slate-400" style={{ height }}>
      {text}
    </div>
  );
}

// ── Charts ──────────────────────────────────────────────────────────────────
export function FunnelBars({ stages, compact }: { stages: FunnelStage[]; compact?: boolean }) {
  const max = Math.max(1, ...stages.map((s) => s.count));
  if (!stages.length || stages.every((s) => s.count === 0)) return <EmptyBlock />;
  return (
    <div className="flex flex-col gap-2.5">
      {stages.map((s, i) => (
        <div key={s.key} className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-[12px] gap-2">
            <span className="font-medium text-foreground truncate">{s.label}</span>
            <span className="text-muted-foreground shrink-0">
              <span className="font-semibold text-foreground">{fmtNum(s.count)}</span>
              {i > 0 && <> · {fmtPct(s.conversionFromPrevious)} conv.</>}
              {!compact && s.avgDaysFromPrevious !== null && <> · {fmtDays(s.avgDaysFromPrevious)}</>}
            </span>
          </div>
          <div className="h-6 bg-[#f1f5f9] dark:bg-muted rounded-[6px] overflow-hidden">
            <div
              className="h-full rounded-[6px] flex items-center justify-end pr-2 text-[10px] text-white font-medium"
              style={{ width: `${Math.max(2, (s.count / max) * 100)}%`, background: CHART_COLORS[i % CHART_COLORS.length] }}
            >
              {s.count / max > 0.15 ? fmtPct(s.conversionFromStart) : ""}
            </div>
          </div>
          {!compact && i < stages.length - 1 && s.dropOffCount > 0 && (
            <span className="text-[11px] text-[#dc2626]">
              Drop-off {fmtPct(s.dropOff)} ({fmtNum(s.dropOffCount)})
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

export function SimpleBarChart({
  data,
  xKey,
  bars,
  height = 260,
  layout = "horizontal",
  valueFormatter,
}: {
  data: any[];
  xKey: string;
  bars: { key: string; label: string; color?: string }[];
  height?: number;
  layout?: "horizontal" | "vertical";
  valueFormatter?: (v: number) => string;
}) {
  if (!data.length) return <EmptyBlock height={height} />;
  const vertical = layout === "vertical";
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout={layout} margin={{ top: 5, right: 10, left: vertical ? 10 : -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={vertical} horizontal={!vertical} stroke="#e5e5e5" />
          {vertical ? (
            <>
              <XAxis type="number" tick={{ fontSize: 11, fill: "#737373" }} axisLine={false} tickLine={false} tickFormatter={valueFormatter} />
              <YAxis type="category" dataKey={xKey} width={130} tick={{ fontSize: 11, fill: "#737373" }} axisLine={false} tickLine={false} />
            </>
          ) : (
            <>
              <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: "#737373" }} axisLine={false} tickLine={false} interval={0} angle={data.length > 6 ? -25 : 0} textAnchor={data.length > 6 ? "end" : "middle"} height={data.length > 6 ? 60 : 30} />
              <YAxis tick={{ fontSize: 11, fill: "#737373" }} axisLine={false} tickLine={false} tickFormatter={valueFormatter} />
            </>
          )}
          <Tooltip
            contentStyle={{ borderRadius: 8, border: "1px solid #e5e5e5", fontSize: 12 }}
            formatter={(v: any) => (valueFormatter ? valueFormatter(Number(v)) : fmtNum(Number(v)))}
          />
          {bars.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
          {bars.map((b, i) => (
            <Bar key={b.key} dataKey={b.key} name={b.label} fill={b.color || CHART_COLORS[i % CHART_COLORS.length]} radius={vertical ? [0, 4, 4, 0] : [4, 4, 0, 0]} maxBarSize={36} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TrendChart({
  data,
  lines,
  height = 260,
  xKey = "month",
}: {
  data: any[];
  lines: { key: string; label: string; color?: string }[];
  height?: number;
  xKey?: string;
}) {
  if (!data.length) return <EmptyBlock height={height} />;
  const rows = data.map((d) => ({ ...d, __x: xKey === "month" ? fmtMonth(d[xKey]) : d[xKey] }));
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
          <XAxis dataKey="__x" tick={{ fontSize: 11, fill: "#737373" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "#737373" }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e5e5e5", fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {lines.map((l, i) => (
            <Line key={l.key} type="monotone" dataKey={l.key} name={l.label} stroke={l.color || CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2} dot={{ r: 3 }} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DonutChart({ data, height = 240 }: { data: { name: string; value: number }[]; height?: number }) {
  const rows = data.filter((d) => d.value > 0);
  if (!rows.length) return <EmptyBlock height={height} />;
  const total = rows.reduce((s, r) => s + r.value, 0);
  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      <div style={{ height, width: height }} className="shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={rows} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="85%" paddingAngle={2}>
              {rows.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e5e5e5", fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="flex flex-col gap-1.5 w-full min-w-0">
        {rows.map((r, i) => (
          <li key={r.name} className="flex items-center justify-between gap-2 text-[12px]">
            <span className="flex items-center gap-2 min-w-0">
              <span className="size-2.5 rounded-full shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
              <span className="truncate">{r.name}</span>
            </span>
            <span className="text-muted-foreground shrink-0">
              {fmtNum(r.value)} · {fmtPct((r.value / total) * 100)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Choropleth-style heat list (no map library is installed): darker = more. */
export function GeoHeatList({
  rows,
  labelKey,
  valueKey = "leads",
  extra,
  limit = 12,
}: {
  rows: any[];
  labelKey: string | ((r: any) => string);
  valueKey?: string;
  extra?: (r: any) => React.ReactNode;
  limit?: number;
}) {
  const list = rows.slice(0, limit);
  if (!list.length) return <EmptyBlock />;
  const max = Math.max(1, ...list.map((r) => Number(r[valueKey]) || 0));
  return (
    <div className="grid grid-cols-1 gap-1.5">
      {list.map((r, i) => {
        const v = Number(r[valueKey]) || 0;
        const ratio = v / max;
        const label = typeof labelKey === "function" ? labelKey(r) : r[labelKey];
        return (
          <div key={`${label}-${i}`} className="flex items-center gap-3 text-[12px]">
            <span className="w-[140px] truncate" title={label}>{label}</span>
            <div className="flex-1 h-5 bg-[#f1f5f9] dark:bg-muted rounded overflow-hidden">
              <div className="h-full rounded" style={{ width: `${Math.max(3, ratio * 100)}%`, background: `rgba(37, 99, 235, ${0.25 + ratio * 0.75})` }} />
            </div>
            <span className="w-[56px] text-right font-medium">{fmtNum(v)}</span>
            {extra && <span className="w-[90px] text-right text-muted-foreground">{extra(r)}</span>}
          </div>
        );
      })}
    </div>
  );
}

// ── Table with CSV export ───────────────────────────────────────────────────
export function DataTable<T>({
  rows,
  columns,
  csvName,
  emptyText,
  maxHeight,
}: {
  rows: T[];
  columns: Column<T>[];
  csvName?: string;
  emptyText?: string;
  maxHeight?: number;
}) {
  return (
    <div className="flex flex-col gap-2 min-w-0">
      {csvName && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-[12px]" disabled={!rows.length} onClick={() => downloadCsv(csvName, rows, columns)}>
            <Download className="size-3.5" />
            Export CSV
          </Button>
        </div>
      )}
      <div className="overflow-auto rounded-[8px] border border-border" style={maxHeight ? { maxHeight } : undefined}>
        <Table className="w-full">
          <TableHeader className="bg-zinc-100 dark:bg-muted/5 sticky top-0 z-[1]">
            <TableRow className="hover:bg-transparent">
              {columns.map((c) => (
                <TableHead
                  key={c.key}
                  className={cn(
                    "py-2.5 px-3 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase h-auto whitespace-nowrap",
                    c.align === "right" && "text-right",
                    c.align === "center" && "text-center",
                  )}
                >
                  {c.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-8 text-[13px] text-muted-foreground">
                  {emptyText || "No data for the selected filters"}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r, i) => (
                <TableRow key={i}>
                  {columns.map((c) => (
                    <TableCell
                      key={c.key}
                      className={cn(
                        "py-2.5 px-3 text-[13px] whitespace-nowrap",
                        c.align === "right" && "text-right",
                        c.align === "center" && "text-center",
                        c.className,
                      )}
                    >
                      {c.render ? c.render(r) : String((r as any)[c.key] ?? "—")}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ── Filter bar ──────────────────────────────────────────────────────────────
export function AnalyticsFilterBar({
  value,
  onChange,
  showCounselor = false,
  showBranch = true,
}: {
  value: AnalyticsFilters;
  onChange: (v: AnalyticsFilters) => void;
  showCounselor?: boolean;
  showBranch?: boolean;
}) {
  const { data: opts } = useAnalyticsFilterOptions();
  const set = (k: keyof AnalyticsFilters, v: string) => onChange({ ...value, [k]: v === "all" ? undefined : v || undefined });
  const active = Object.values(value).some(Boolean);

  return (
    <div className="flex flex-wrap items-end gap-2.5">
      <div className="flex flex-col gap-1">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">From</span>
        <Input type="date" className="h-10 w-[150px]" value={value.from || ""} onChange={(e) => set("from", e.target.value)} />
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">To</span>
        <Input type="date" className="h-10 w-[150px]" value={value.to || ""} onChange={(e) => set("to", e.target.value)} />
      </div>
      <FilterSelect
        label="Program"
        value={value.courseId}
        onChange={(v) => set("courseId", v)}
        options={(opts?.courses || []).map((c) => ({ value: c.id, label: c.name }))}
        allLabel="All Programs"
      />
      {showBranch && (
        <FilterSelect
          label="Branch"
          value={value.branchId}
          onChange={(v) => set("branchId", v)}
          options={(opts?.branches || []).map((b) => ({ value: b.id, label: b.name }))}
          allLabel="All Branches"
        />
      )}
      <FilterSelect
        label="Academic Session"
        value={value.academicSession}
        onChange={(v) => set("academicSession", v)}
        options={(opts?.academicSessions || []).map((s) => ({ value: s, label: s }))}
        allLabel="All Sessions"
      />
      {showCounselor && (
        <FilterSelect
          label="Counselor"
          value={value.counselorId}
          onChange={(v) => set("counselorId", v)}
          options={(opts?.counselors || []).map((c) => ({ value: c.id, label: c.name }))}
          allLabel="All Counselors"
        />
      )}
      {active && (
        <Button variant="ghost" className="h-10 gap-1.5 text-[13px]" onClick={() => onChange({})}>
          <RotateCcw className="size-3.5" />
          Reset
        </Button>
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  allLabel,
}: {
  label: string;
  value?: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  allLabel: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <Select value={value || "all"} onValueChange={onChange}>
        <SelectTrigger className="h-10 w-[170px]" size="lg">
          <SelectValue placeholder={allLabel} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{allLabel}</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function RoiBadge({ roi }: { roi: number | null | undefined }) {
  if (roi === null || roi === undefined) return <span className="text-muted-foreground">—</span>;
  return (
    <span
      className={cn(
        "px-2 py-0.5 rounded-full text-[12px] font-medium",
        roi >= 0 ? "bg-[#f0fdf4] text-[#16a34a]" : "bg-[#fef2f2] text-[#dc2626]",
      )}
    >
      {fmtPct(roi)}
    </span>
  );
}
