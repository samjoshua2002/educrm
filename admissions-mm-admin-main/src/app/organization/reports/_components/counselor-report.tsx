"use client";

import * as React from "react";
import { AlarmClock, BadgeIndianRupee, CheckCircle2, Clock, ShieldCheck, Users } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCounselorReport } from "@/hooks/use-analytics";
import type { AnalyticsFilters, CounselorRow } from "@/types/analytics";
import {
  Column,
  DataTable,
  DonutChart,
  FunnelBars,
  LoadingBlock,
  Panel,
  StatCard,
  TrendChart,
  fmtCurrency,
  fmtHours,
  fmtMonth,
  fmtNum,
  fmtPct,
  humanize,
} from "./analytics-ui";

const columns: Column<CounselorRow>[] = [
  { key: "name", label: "Counselor", render: (r) => <span className="font-medium">{r.name}</span> },
  { key: "role", label: "Role", render: (r) => humanize(r.role) },
  { key: "leadsAssigned", label: "Leads assigned", align: "right", render: (r) => fmtNum(r.leadsAssigned) },
  { key: "applicationsSubmitted", label: "Apps submitted", align: "right", render: (r) => fmtNum(r.applicationsSubmitted) },
  { key: "interviewsScheduled", label: "Interviews scheduled", align: "right", render: (r) => fmtNum(r.interviewsScheduled) },
  { key: "offersGenerated", label: "Offers generated", align: "right", render: (r) => fmtNum(r.offersGenerated) },
  { key: "offersAccepted", label: "Offers accepted", align: "right", render: (r) => fmtNum(r.offersAccepted) },
  { key: "revenueGenerated", label: "Revenue", align: "right", render: (r) => fmtCurrency(r.revenueGenerated), csv: (r) => r.revenueGenerated },
  { key: "avgResponseHours", label: "Avg response", align: "right", render: (r) => fmtHours(r.avgResponseHours), csv: (r) => r.avgResponseHours ?? "" },
  { key: "followUpCompletionRate", label: "Follow-up completion", align: "right", render: (r) => fmtPct(r.followUpCompletionRate), csv: (r) => r.followUpCompletionRate ?? "" },
  { key: "followUpsOverdue", label: "Overdue follow-ups", align: "right", render: (r) => <span className={r.followUpsOverdue ? "text-[#dc2626]" : ""}>{fmtNum(r.followUpsOverdue)}</span> },
  { key: "slaAdherence", label: "SLA adherence", align: "right", render: (r) => fmtPct(r.slaAdherence), csv: (r) => r.slaAdherence ?? "" },
  { key: "slaBreachesOpen", label: "Open SLA breaches", align: "right", render: (r) => <span className={r.slaBreachesOpen ? "text-[#dc2626]" : ""}>{fmtNum(r.slaBreachesOpen)}</span> },
  { key: "conversionRate", label: "Lead → App", align: "right", render: (r) => fmtPct(r.conversionRate) },
  { key: "admissionRate", label: "Admission rate", align: "right", render: (r) => fmtPct(r.admissionRate) },
];

export function CounselorReport({ filters }: { filters: AnalyticsFilters }) {
  const [slaHours, setSlaHours] = React.useState(24);
  const [selected, setSelected] = React.useState<string>("");
  const [metric, setMetric] = React.useState<"leadsAssigned" | "activities" | "submitted" | "offers" | "enrolled">("submitted");
  const { data, isLoading } = useCounselorReport({ ...filters, slaHours });
  const s = data?.summary;
  const counselors = data?.counselors || [];
  const current = counselors.find((c) => c.counselorId === selected) || counselors[0];

  // Month-on-month productivity: one line per counselor (top 6 by leads).
  const monthly = React.useMemo(() => {
    const top = counselors.slice(0, 6);
    const months = Array.from(new Set((data?.monthly || []).map((m) => m.month))).sort();
    return {
      lines: top.map((c) => ({ key: c.counselorId, label: c.name })),
      rows: months.map((month) => {
        const row: Record<string, any> = { month };
        top.forEach((c) => {
          const m = data?.monthly.find((x) => x.month === month && x.counselorId === c.counselorId);
          row[c.counselorId] = m ? m[metric] : 0;
        });
        return row;
      }),
    };
  }, [counselors, data?.monthly, metric]);

  const reasons = React.useMemo(() => {
    const map: Record<string, number> = {};
    (data?.dropOffReasons || [])
      .filter((d) => !selected || d.counselorId === selected)
      .forEach((d) => (map[d.reason] = (map[d.reason] || 0) + d.count));
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [data?.dropOffReasons, selected]);

  if (isLoading) return <LoadingBlock height={400} />;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard icon={Users} label="Leads assigned" value={fmtNum(s?.leadsAssigned)} hint={`${fmtNum(s?.counselors)} counselors`} />
        <StatCard icon={CheckCircle2} tone="purple" label="Offers generated" value={fmtNum(s?.offersGenerated)} hint={`${fmtNum(s?.offersAccepted)} accepted`} />
        <StatCard icon={BadgeIndianRupee} tone="green" label="Revenue generated" value={fmtCurrency(s?.revenueGenerated)} />
        <StatCard icon={Clock} tone="slate" label="Avg response time" value={fmtHours(s?.avgResponseHours)} />
        <StatCard icon={ShieldCheck} tone="green" label="SLA adherence" value={fmtPct(s?.slaAdherence)} hint={`First response within ${data?.slaHours ?? slaHours} h`} />
        <StatCard icon={AlarmClock} tone="red" label="Open SLA breaches" value={fmtNum(s?.slaBreachesOpen)} hint={`${fmtNum(s?.followUpsOverdue)} overdue follow-ups`} />
      </div>

      <Panel
        title="Counselor Performance"
        description="Leads, applications, interviews, offers, revenue, response time, follow-ups and SLA per counselor."
        action={
          <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
            SLA (hours)
            <Input
              type="number"
              min={1}
              className="h-8 w-[70px]"
              value={slaHours}
              onChange={(e) => setSlaHours(Math.max(1, Number(e.target.value) || 24))}
            />
          </div>
        }
      >
        <DataTable rows={counselors} columns={columns} csvName="counselor-performance" emptyText="No counselors found" />
      </Panel>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Panel
          title="Counselor-wise Funnel"
          action={
            <Select value={current?.counselorId || ""} onValueChange={setSelected}>
              <SelectTrigger className="h-9 w-[200px]">
                <SelectValue placeholder="Select counselor" />
              </SelectTrigger>
              <SelectContent>
                {counselors.map((c) => (
                  <SelectItem key={c.counselorId} value={c.counselorId}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        >
          {current ? (
            <FunnelBars
              compact
              stages={current.funnel.map((f, i, arr) => ({
                key: f.stage,
                label: f.stage,
                source: "",
                count: f.count,
                conversionFromPrevious: i === 0 ? 100 : arr[i - 1].count ? Math.round((f.count / arr[i - 1].count) * 1000) / 10 : 0,
                conversionFromStart: arr[0].count ? Math.round((f.count / arr[0].count) * 1000) / 10 : 0,
                dropOff: 0,
                dropOffCount: 0,
                avgDaysFromPrevious: null,
              }))}
            />
          ) : (
            <LoadingBlock height={120} />
          )}
        </Panel>
        <Panel title="Drop-off Reasons" description={selected ? "Closed / disqualified leads of the selected counselor." : "Closed / disqualified leads, all counselors."}>
          <DonutChart data={reasons} height={220} />
        </Panel>
      </div>

      <Panel
        title="Month-on-Month Productivity"
        action={
          <Select value={metric} onValueChange={(v) => setMetric(v as any)}>
            <SelectTrigger className="h-9 w-[190px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="leadsAssigned">Leads assigned</SelectItem>
              <SelectItem value="activities">Activities logged</SelectItem>
              <SelectItem value="submitted">Applications submitted</SelectItem>
              <SelectItem value="offers">Offers</SelectItem>
              <SelectItem value="enrolled">Enrolled</SelectItem>
            </SelectContent>
          </Select>
        }
      >
        <TrendChart data={monthly.rows} lines={monthly.lines} />
        <DataTable
          rows={data?.monthly || []}
          csvName="counselor-monthly"
          maxHeight={300}
          columns={[
            { key: "name", label: "Counselor" },
            { key: "month", label: "Month", render: (r) => fmtMonth(r.month), csv: (r) => r.month },
            { key: "leadsAssigned", label: "Leads assigned", align: "right" },
            { key: "activities", label: "Activities", align: "right" },
            { key: "submitted", label: "Submitted", align: "right" },
            { key: "offers", label: "Offers", align: "right" },
            { key: "enrolled", label: "Enrolled", align: "right" },
          ]}
        />
      </Panel>
    </div>
  );
}
