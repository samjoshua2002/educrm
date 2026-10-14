"use client";

import { Filter, IndianRupee, Percent, Timer, TrendingUp, UserCheck } from "lucide-react";

import { useFunnelReport } from "@/hooks/use-analytics";
import type { AnalyticsFilters, FunnelStage, ProgramPerformance } from "@/types/analytics";
import {
  Column,
  DataTable,
  FunnelBars,
  LoadingBlock,
  Panel,
  SimpleBarChart,
  StatCard,
  TrendChart,
  fmtCurrency,
  fmtDays,
  fmtNum,
  fmtPct,
} from "./analytics-ui";

const stageColumns: Column<FunnelStage>[] = [
  { key: "label", label: "Stage", render: (r) => <span className="font-medium">{r.label}</span> },
  { key: "source", label: "Source of truth", render: (r) => <span className="text-muted-foreground">{r.source}</span> },
  { key: "count", label: "Count", align: "right", render: (r) => fmtNum(r.count) },
  { key: "conversionFromPrevious", label: "Conversion from previous", align: "right", render: (r) => fmtPct(r.conversionFromPrevious) },
  { key: "conversionFromStart", label: "Conversion from start", align: "right", render: (r) => fmtPct(r.conversionFromStart) },
  { key: "dropOff", label: "Drop-off to next", align: "right", render: (r) => <span className={r.dropOff > 0 ? "text-[#dc2626]" : ""}>{fmtPct(r.dropOff)}</span> },
  { key: "dropOffCount", label: "Dropped", align: "right", render: (r) => fmtNum(r.dropOffCount) },
  { key: "avgDaysFromPrevious", label: "Avg time in previous stage", align: "right", render: (r) => fmtDays(r.avgDaysFromPrevious) },
];

const programColumns: Column<ProgramPerformance>[] = [
  { key: "program", label: "Program", render: (r) => <span className="font-medium">{r.program || "—"}</span> },
  { key: "started", label: "Started", align: "right", render: (r) => fmtNum(r.started) },
  { key: "submitted", label: "Submitted", align: "right", render: (r) => fmtNum(r.submitted) },
  { key: "shortlisted", label: "Shortlisted", align: "right", render: (r) => fmtNum(r.shortlisted) },
  { key: "interviewed", label: "Interviewed", align: "right", render: (r) => fmtNum(r.interviewed) },
  { key: "offered", label: "Offers", align: "right", render: (r) => fmtNum(r.offered) },
  { key: "accepted", label: "Accepted", align: "right", render: (r) => fmtNum(r.accepted) },
  { key: "enrolled", label: "Enrolled", align: "right", render: (r) => fmtNum(r.enrolled) },
  { key: "offerRate", label: "Offer rate", align: "right", render: (r) => fmtPct(r.offerRate) },
  { key: "offerToAcceptance", label: "Offer → Acceptance", align: "right", render: (r) => fmtPct(r.offerToAcceptance) },
  { key: "seatUtilization", label: "Seat utilization", align: "right", render: (r) => fmtPct(r.seatUtilization) },
  { key: "revenue", label: "Revenue", align: "right", render: (r) => fmtCurrency(r.revenue), csv: (r) => r.revenue },
];

export function FunnelReport({ filters }: { filters: AnalyticsFilters }) {
  const { data, isLoading } = useFunnelReport(filters);
  const m = data?.metrics;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard loading={isLoading} icon={Filter} label="Lead → Application" value={fmtPct(m?.leadToApplication)} />
        <StatCard loading={isLoading} icon={UserCheck} tone="purple" label="Application → Interview" value={fmtPct(m?.applicationToInterview)} />
        <StatCard loading={isLoading} icon={Percent} tone="amber" label="Interview → Offer" value={fmtPct(m?.interviewToOffer)} />
        <StatCard loading={isLoading} icon={TrendingUp} tone="green" label="Offer → Admission" value={fmtPct(m?.offerToAdmission)} hint={`Acceptance ${fmtPct(m?.offerToAcceptance)}`} />
        <StatCard loading={isLoading} icon={Timer} tone="slate" label="Avg lead → enrolment" value={fmtDays(m?.avgDaysLeadToEnrolment)} />
        <StatCard loading={isLoading} icon={IndianRupee} tone="green" label="Fees collected" value={fmtCurrency(m?.totalRevenue)} hint={`Overall conversion ${fmtPct(m?.overallConversion)}`} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Panel title="Admissions Funnel" description="Lead Created → Enrolled with conversion, drop-off and average days per stage.">
          {isLoading ? <LoadingBlock /> : <FunnelBars stages={data?.stages || []} />}
        </Panel>
        <Panel title="Monthly Trend" description="Leads, applications, offers and enrolments per month.">
          {isLoading ? (
            <LoadingBlock />
          ) : (
            <TrendChart
              data={data?.trend || []}
              lines={[
                { key: "leads", label: "Leads" },
                { key: "applications", label: "Applications" },
                { key: "offers", label: "Offers" },
                { key: "enrolled", label: "Enrolled" },
              ]}
            />
          )}
        </Panel>
      </div>

      <Panel title="Stage-wise Conversion & Drop-off">
        <DataTable rows={data?.stages || []} columns={stageColumns} csvName="funnel-stages" />
      </Panel>

      <Panel title="Program-wise Funnel">
        {!isLoading && (
          <SimpleBarChart
            data={(data?.byProgram || []).slice(0, 10)}
            xKey="program"
            bars={[
              { key: "started", label: "Applications" },
              { key: "offered", label: "Offers" },
              { key: "enrolled", label: "Enrolled" },
            ]}
          />
        )}
        <DataTable rows={data?.byProgram || []} columns={programColumns} csvName="funnel-by-program" />
      </Panel>
    </div>
  );
}
