"use client";

import Link from "next/link";
import {
  AlarmClock,
  Armchair,
  BadgeIndianRupee,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Coins,
  FileText,
  Gavel,
  Hourglass,
  Percent,
  PhoneCall,
  Radio,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type {
  AdmissionsDashboard,
  CampaignRow,
  CounselorDashboard,
  EvaluatorDashboard,
  InterviewItem,
  MarketingDashboard,
} from "@/types/analytics";
import {
  DataTable,
  DonutChart,
  EmptyBlock,
  FunnelBars,
  GeoHeatList,
  Panel,
  RoiBadge,
  SimpleBarChart,
  StatCard,
  TrendChart,
  fmtCurrency,
  fmtDays,
  fmtNum,
  fmtPct,
  humanize,
} from "../../reports/_components/analytics-ui";

const grid = "grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4";

// ── Admissions Head ─────────────────────────────────────────────────────────
export function AdmissionsView({ data }: { data: AdmissionsDashboard }) {
  const k = data.kpis;
  return (
    <>
      <div className={grid}>
        <StatCard icon={FileText} label="Total applications" value={fmtNum(k.totalApplications)} hint={`${fmtNum(k.submittedApplications)} submitted`} />
        <StatCard icon={Gavel} tone="purple" label="Offers issued" value={fmtNum(k.offersIssued)} hint={`${fmtNum(k.offersAccepted)} accepted`} />
        <StatCard icon={Percent} tone="amber" label="Offer → acceptance" value={fmtPct(k.offerToAcceptance)} progress={k.offerToAcceptance} />
        <StatCard icon={CheckCircle2} tone="green" label="Enrollment count" value={fmtNum(k.enrollmentCount)} />
        <StatCard icon={Armchair} tone="slate" label="Seat utilization" value={fmtPct(k.seatUtilization)} hint={k.totalSeats ? `${fmtNum(k.totalSeats)} seats` : "No seats configured"} progress={k.seatUtilization} />
        <StatCard icon={BadgeIndianRupee} tone="green" label="Fees collected" value={fmtCurrency(k.revenue)} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Panel title="Admissions Funnel" className="xl:col-span-1">
          <FunnelBars stages={data.funnel} compact />
        </Panel>
        <Panel title="Admission Trend" className="xl:col-span-2">
          <TrendChart
            data={data.trend}
            lines={[
              { key: "applications", label: "Applications" },
              { key: "submitted", label: "Submitted" },
              { key: "offers", label: "Offers" },
              { key: "enrolled", label: "Enrolled" },
            ]}
          />
        </Panel>
      </div>

      <Panel
        title="Program-wise Performance"
        action={<Link href="/organization/reports?tab=funnel" className="text-[13px] font-medium text-[#2563EB] hover:underline">Full report</Link>}
      >
        <SimpleBarChart
          data={data.programPerformance.slice(0, 10)}
          xKey="program"
          bars={[
            { key: "started", label: "Applications" },
            { key: "offered", label: "Offers" },
            { key: "enrolled", label: "Enrolled" },
          ]}
        />
        <DataTable
          rows={data.programPerformance}
          csvName="program-performance"
          columns={[
            { key: "program", label: "Program", render: (r) => <span className="font-medium">{r.program}</span> },
            { key: "started", label: "Applications", align: "right" },
            { key: "submitted", label: "Submitted", align: "right" },
            { key: "offered", label: "Offers", align: "right" },
            { key: "accepted", label: "Accepted", align: "right" },
            { key: "enrolled", label: "Enrolled", align: "right" },
            { key: "seats", label: "Seats", align: "right", render: (r) => fmtNum(r.seats) },
            { key: "seatUtilization", label: "Seat utilization", align: "right", render: (r) => fmtPct(r.seatUtilization) },
            { key: "offerToAcceptance", label: "Offer → Acceptance", align: "right", render: (r) => fmtPct(r.offerToAcceptance) },
            { key: "revenue", label: "Revenue", align: "right", render: (r) => fmtCurrency(r.revenue), csv: (r) => r.revenue },
          ]}
        />
      </Panel>
    </>
  );
}

// ── Counselor ───────────────────────────────────────────────────────────────
export function CounselorView({ data }: { data: CounselorDashboard }) {
  const k = data.kpis;
  return (
    <>
      <div className={grid}>
        <StatCard icon={UserPlus} label="Leads assigned today" value={fmtNum(k.leadsAssignedToday)} hint={`${fmtNum(k.leadsAssigned)} assigned in total`} />
        <StatCard icon={PhoneCall} tone="amber" label="Pending follow-ups" value={fmtNum(k.pendingFollowUps)} hint="Due today or overdue" />
        <StatCard icon={Percent} tone="purple" label="Conversion %" value={fmtPct(k.conversionRate)} hint="Leads → applications" />
        <StatCard icon={TrendingUp} tone="green" label="Admission %" value={fmtPct(k.admissionRate)} hint="Leads → enrolled" />
        <StatCard icon={CalendarClock} tone="slate" label="Interviews scheduled" value={fmtNum(k.interviewsScheduled)} />
        <StatCard icon={AlarmClock} tone="red" label="SLA breaches" value={fmtNum(k.slaBreaches)} hint={`No response within ${k.slaHours} h`} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Panel title="Task List" description="Follow-ups due today and tomorrow." className="xl:col-span-2">
          {data.tasks.length === 0 ? (
            <EmptyBlock height={160} text="No follow-ups due — you're all caught up" />
          ) : (
            <ul className="flex flex-col divide-y divide-border max-h-[380px] overflow-y-auto">
              {data.tasks.map((t) => (
                <li key={t.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="flex flex-col min-w-0">
                    <Link href={`/organization/leads/edit?id=${t.id}`} className="text-[13px] font-medium hover:underline truncate">
                      {t.name || "Unnamed lead"}
                    </Link>
                    <span className="text-[11px] text-muted-foreground truncate">
                      {humanize(t.status)}
                      {t.phone ? ` · ${t.phone}` : ""}
                      {data.scope !== "mine" && t.assignedToName ? ` · ${t.assignedToName}` : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] text-muted-foreground">{new Date(t.dueAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span>
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded-full text-[11px] font-medium",
                        t.urgency === "overdue" ? "bg-[#fef2f2] text-[#dc2626]" : "bg-[#eff6ff] text-[#2563eb]",
                      )}
                    >
                      {t.urgency === "overdue" ? "Overdue" : "Upcoming"}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Lead Status">
          <DonutChart data={data.leadStatus.map((s) => ({ name: humanize(s.status), value: s.count }))} height={200} />
        </Panel>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Panel title="Conversion Funnel">
          <FunnelBars stages={data.funnel} compact />
        </Panel>
        <InterviewList title="Upcoming Interviews" items={data.upcomingInterviews} />
      </div>
    </>
  );
}

// ── Marketing ───────────────────────────────────────────────────────────────
export function MarketingView({ data }: { data: MarketingDashboard }) {
  const k = data.kpis;
  return (
    <>
      <div className={grid}>
        <StatCard icon={TrendingUp} tone={k.campaignRoi !== null && k.campaignRoi < 0 ? "red" : "green"} label="Campaign ROI" value={fmtPct(k.campaignRoi)} hint="(Revenue − Cost) ÷ Cost" />
        <StatCard icon={Coins} tone="amber" label="Cost per admission" value={fmtCurrency(k.costPerAdmission, false)} hint={`Cost per lead ${fmtCurrency(k.costPerLead, false)}`} />
        <StatCard icon={BadgeIndianRupee} tone="purple" label="Total spend" value={fmtCurrency(k.totalCost)} />
        <StatCard icon={Users} label="Leads" value={fmtNum(k.totalLeads)} />
        <StatCard icon={Percent} tone="slate" label="Admission conversion" value={fmtPct(k.admissionConversionRate)} />
        <StatCard icon={Radio} tone="green" label="Active channels" value={fmtNum(k.activeChannels)} hint={`Revenue ${fmtCurrency(k.attributedRevenue)}`} />
      </div>

      <Panel
        title="Campaign ROI"
        action={<Link href="/organization/reports?tab=campaigns" className="text-[13px] font-medium text-[#2563EB] hover:underline">Full report</Link>}
      >
        <DataTable<CampaignRow>
          rows={data.campaigns}
          csvName="campaign-roi"
          emptyText="No marketing campaigns yet"
          columns={[
            { key: "name", label: "Campaign", render: (r) => <span className="font-medium">{r.name}</span> },
            { key: "sourceType", label: "Channel", render: (r) => humanize(r.sourceType) },
            { key: "cost", label: "Cost", align: "right", render: (r) => fmtCurrency(r.cost), csv: (r) => r.cost },
            { key: "leads", label: "Leads", align: "right" },
            { key: "applications", label: "Applications", align: "right" },
            { key: "enrolled", label: "Enrolled", align: "right" },
            { key: "costPerAdmission", label: "Cost / admission", align: "right", render: (r) => fmtCurrency(r.costPerAdmission, false), csv: (r) => r.costPerAdmission ?? "" },
            { key: "revenue", label: "Revenue", align: "right", render: (r) => fmtCurrency(r.revenue), csv: (r) => r.revenue },
            { key: "roi", label: "ROI", align: "right", render: (r) => <RoiBadge roi={r.roi} />, csv: (r) => r.roi ?? "" },
          ]}
        />
      </Panel>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Panel title="Channel Performance">
          <SimpleBarChart
            data={data.channels.map((c) => ({ ...c, channel: humanize(c.channel) }))}
            xKey="channel"
            bars={[
              { key: "leads", label: "Leads" },
              { key: "applications", label: "Applications" },
              { key: "enrolled", label: "Enrolled" },
            ]}
          />
        </Panel>
        <Panel title="Lead Sources by Geography" description="Heat view of leads by state.">
          <GeoHeatList rows={data.geo.byState} labelKey="state" extra={(r) => `${fmtPct(r.conversionRate)} conv.`} />
        </Panel>
      </div>

      <Panel title="Trend Analysis">
        <TrendChart
          data={data.trend}
          lines={[
            { key: "leads", label: "Leads" },
            { key: "applications", label: "Applications" },
            { key: "enrolled", label: "Enrolled" },
          ]}
        />
      </Panel>
    </>
  );
}

// ── Evaluator / Committee ───────────────────────────────────────────────────
export function EvaluatorView({ data }: { data: EvaluatorDashboard }) {
  const k = data.kpis;
  return (
    <>
      <div className={grid}>
        <StatCard icon={CalendarClock} label="Interviews pending" value={fmtNum(k.interviewsPending)} hint={`${fmtNum(k.myInterviewsPending)} on my panel`} />
        <StatCard icon={ClipboardCheck} tone="green" label="Evaluations submitted" value={fmtNum(k.evaluationsSubmitted)} hint={`${fmtNum(k.myEvaluationsSubmitted)} by me`} />
        <StatCard icon={Hourglass} tone="amber" label="Evaluations pending" value={fmtNum(k.evaluationsPending)} hint="Completed, not yet evaluated" />
        <StatCard icon={AlarmClock} tone="purple" label="Decision turnaround" value={fmtDays(k.decisionTurnaroundDays)} hint="Interview → final decision" />
        <StatCard icon={Gavel} tone="slate" label="Decisions pending" value={fmtNum(k.decisionsPending)} />
        <StatCard icon={CheckCircle2} tone="green" label="Decisions released" value={fmtNum(k.decisionsReleased)} hint={`${fmtNum(k.interviewsCompleted)} interviews completed`} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <InterviewList title="Upcoming Interviews" items={data.upcomingInterviews} />
        <InterviewList title="Evaluations Pending" items={data.pendingEvaluations} pending />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Panel title="Decision Stages">
          <DonutChart data={data.decisionStages.map((d) => ({ name: humanize(d.stage), value: d.count }))} height={200} />
        </Panel>
        <Panel title="Evaluator Recommendations">
          <DonutChart data={data.recommendations.map((d) => ({ name: humanize(d.recommendation), value: d.count }))} height={200} />
        </Panel>
      </div>
    </>
  );
}

function InterviewList({ title, items, pending }: { title: string; items: InterviewItem[]; pending?: boolean }) {
  return (
    <Panel
      title={title}
      action={<Link href="/organization/gd-interview" className="text-[13px] font-medium text-[#2563EB] hover:underline">Open</Link>}
    >
      {items.length === 0 ? (
        <EmptyBlock height={140} text={pending ? "No evaluations pending" : "No upcoming interviews"} />
      ) : (
        <ul className="flex flex-col divide-y divide-border max-h-[360px] overflow-y-auto">
          {items.map((i) => (
            <li key={i.id} className="py-2.5 flex items-center justify-between gap-3">
              <div className="flex flex-col min-w-0">
                <span className="text-[13px] font-medium truncate">
                  {i.applicantName || "Applicant"} {i.applicationNo && <span className="text-muted-foreground font-normal">· {i.applicationNo}</span>}
                </span>
                <span className="text-[11px] text-muted-foreground truncate">
                  {humanize(i.interviewType)}
                  {i.round ? ` · Round ${i.round}` : ""}
                  {i.program ? ` · ${i.program}` : ""}
                  {pending && i.drafts ? ` · ${i.drafts} draft(s)` : ""}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {i.onMyPanel && <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#faf5ff] text-[#9333ea]">My panel</span>}
                <span className="text-[11px] text-muted-foreground">
                  {pending
                    ? i.completedAt
                      ? new Date(i.completedAt).toLocaleDateString("en-IN")
                      : ""
                    : i.startTime
                      ? new Date(i.startTime).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
                      : i.slotDate || "Slot TBA"}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
