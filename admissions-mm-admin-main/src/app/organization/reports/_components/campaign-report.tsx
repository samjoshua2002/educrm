"use client";

import { BadgeIndianRupee, Coins, Megaphone, Percent, TrendingUp, Users } from "lucide-react";

import { useCampaignReport } from "@/hooks/use-analytics";
import type { AnalyticsFilters, CampaignRow } from "@/types/analytics";
import {
  Column,
  DataTable,
  LoadingBlock,
  Panel,
  RoiBadge,
  SimpleBarChart,
  StatCard,
  fmtCurrency,
  fmtNum,
  fmtPct,
  humanize,
} from "./analytics-ui";

const metricColumns: Column<CampaignRow>[] = [
  { key: "cost", label: "Cost", align: "right", render: (r) => fmtCurrency(r.cost), csv: (r) => r.cost },
  { key: "leads", label: "Leads", align: "right", render: (r) => fmtNum(r.leads) },
  { key: "applications", label: "Applications", align: "right", render: (r) => fmtNum(r.applications) },
  { key: "accepted", label: "Offers accepted", align: "right", render: (r) => fmtNum(r.accepted) },
  { key: "enrolled", label: "Enrolled", align: "right", render: (r) => fmtNum(r.enrolled) },
  { key: "costPerLead", label: "Cost / lead", align: "right", render: (r) => fmtCurrency(r.costPerLead, false), csv: (r) => r.costPerLead ?? "" },
  { key: "costPerApplication", label: "Cost / application", align: "right", render: (r) => fmtCurrency(r.costPerApplication, false), csv: (r) => r.costPerApplication ?? "" },
  { key: "costPerAdmission", label: "Cost / admission", align: "right", render: (r) => fmtCurrency(r.costPerAdmission, false), csv: (r) => r.costPerAdmission ?? "" },
  { key: "admissionConversionRate", label: "Admission conv.", align: "right", render: (r) => fmtPct(r.admissionConversionRate) },
  { key: "revenue", label: "Revenue", align: "right", render: (r) => fmtCurrency(r.revenue), csv: (r) => r.revenue },
  { key: "roi", label: "ROI", align: "right", render: (r) => <RoiBadge roi={r.roi} />, csv: (r) => r.roi ?? "" },
];

const campaignColumns: Column<CampaignRow>[] = [
  { key: "name", label: "Campaign", render: (r) => <span className="font-medium">{r.name}</span> },
  { key: "sourceType", label: "Channel", render: (r) => humanize(r.sourceType) },
  { key: "status", label: "Status", render: (r) => humanize(r.status) },
  ...metricColumns,
];

const channelColumns: Column<CampaignRow>[] = [
  { key: "channel", label: "Channel", render: (r) => <span className="font-medium">{humanize(r.channel)}</span> },
  ...metricColumns,
];

const sourceColumns: Column<CampaignRow>[] = [
  { key: "source", label: "Source", render: (r) => <span className="font-medium">{r.source}</span> },
  { key: "medium", label: "Medium" },
  { key: "leads", label: "Leads", align: "right", render: (r) => fmtNum(r.leads) },
  { key: "applications", label: "Applications", align: "right", render: (r) => fmtNum(r.applications) },
  { key: "leadToApplication", label: "Lead → App", align: "right", render: (r) => fmtPct(r.leadToApplication) },
  { key: "accepted", label: "Accepted", align: "right", render: (r) => fmtNum(r.accepted) },
  { key: "enrolled", label: "Enrolled", align: "right", render: (r) => fmtNum(r.enrolled) },
  { key: "revenue", label: "Revenue", align: "right", render: (r) => fmtCurrency(r.revenue), csv: (r) => r.revenue },
];

export function CampaignReport({ filters }: { filters: AnalyticsFilters }) {
  const { data, isLoading } = useCampaignReport(filters);
  const s = data?.summary;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard loading={isLoading} icon={Coins} tone="amber" label="Campaign spend" value={fmtCurrency(s?.totalCost)} />
        <StatCard loading={isLoading} icon={Users} label="Leads (attributed)" value={fmtNum(s?.attributedLeads)} hint={`${fmtNum(s?.totalLeads)} total leads`} />
        <StatCard loading={isLoading} icon={Megaphone} tone="purple" label="Cost per lead" value={fmtCurrency(s?.costPerLead, false)} hint={`Per application ${fmtCurrency(s?.costPerApplication, false)}`} />
        <StatCard loading={isLoading} icon={Percent} tone="slate" label="Admission conversion" value={fmtPct(s?.admissionConversionRate)} hint={`Cost / admission ${fmtCurrency(s?.costPerAdmission, false)}`} />
        <StatCard loading={isLoading} icon={BadgeIndianRupee} tone="green" label="Revenue (attributed)" value={fmtCurrency(s?.attributedRevenue)} hint={`${fmtCurrency(s?.revenue)} from all leads`} />
        <StatCard loading={isLoading} icon={TrendingUp} tone={s?.roi !== null && (s?.roi ?? 0) < 0 ? "red" : "green"} label="ROI" value={fmtPct(s?.roi)} hint="(Revenue − Cost) ÷ Cost" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Panel title="Cost vs Revenue by Campaign">
          {isLoading ? (
            <LoadingBlock />
          ) : (
            <SimpleBarChart
              data={(data?.campaigns || []).slice(0, 10)}
              xKey="name"
              bars={[
                { key: "cost", label: "Cost", color: "#f59e0b" },
                { key: "revenue", label: "Revenue", color: "#16a34a" },
              ]}
              valueFormatter={(v) => fmtCurrency(v)}
            />
          )}
        </Panel>
        <Panel title="Leads & Admissions by Channel">
          {isLoading ? (
            <LoadingBlock />
          ) : (
            <SimpleBarChart
              data={(data?.channels || []).map((c) => ({ ...c, channel: humanize(c.channel) }))}
              xKey="channel"
              bars={[
                { key: "leads", label: "Leads" },
                { key: "applications", label: "Applications" },
                { key: "enrolled", label: "Enrolled" },
              ]}
            />
          )}
        </Panel>
      </div>

      <Panel title="Campaign Performance & ROI" description="Revenue = fees collected from applications of the campaign's leads.">
        <DataTable rows={data?.campaigns || []} columns={campaignColumns} csvName="campaign-performance" emptyText="No marketing campaigns in this period" />
      </Panel>
      <Panel title="Channel Performance">
        <DataTable rows={data?.channels || []} columns={channelColumns} csvName="channel-performance" />
      </Panel>
      <Panel title="Lead Sources (UTM source / medium)">
        <DataTable rows={data?.sources || []} columns={sourceColumns} csvName="lead-sources" />
      </Panel>
    </div>
  );
}
