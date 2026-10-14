"use client";

import * as React from "react";
import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useOrgDashboard } from "@/hooks/use-analytics";
import { usePageHeader } from "@/hooks/use-page-header";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";
import type { AnalyticsFilters, DashboardView } from "@/types/analytics";

import { AnalyticsFilterBar, LoadingBlock } from "../reports/_components/analytics-ui";
import { AdmissionsView, CounselorView, EvaluatorView, MarketingView } from "./_components/dashboard-views";
import { ModulesOverviewGrid, RecentActivityPanel, UpcomingEventsPanel } from "./_components/modules-overview";
import { timeAgo } from "@/components/notifications/notification-utils";

const VIEW_LABELS: Record<DashboardView, string> = {
  admissions: "Admissions Head",
  counselor: "Counselor",
  marketing: "Marketing",
  evaluator: "Evaluator / Committee",
};

const VIEW_DESCRIPTIONS: Record<DashboardView, string> = {
  admissions: "Applications, offers, enrolments, seat utilization and program-wise performance.",
  counselor: "Today's leads, pending follow-ups, conversion and interviews.",
  marketing: "Campaign ROI, cost per admission, channel performance and lead geography.",
  evaluator: "Interviews pending, evaluations submitted and decision turnaround.",
};

export default function DashboardPage() {
  const role = useAuthStore((s) => s.user?.role);
  const [view, setView] = React.useState<DashboardView | undefined>(undefined);
  const [filters, setFilters] = React.useState<AnalyticsFilters>({});
  const { data, isLoading, isFetching, refetch } = useOrgDashboard(view, filters);
  const current = data?.view || view;

  usePageHeader({
    title: current ? `${VIEW_LABELS[current]} Dashboard` : "Dashboard",
    description: current ? VIEW_DESCRIPTIONS[current] : "Live admissions metrics across all modules.",
  });

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 w-full max-w-full min-w-0">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
        <AnalyticsFilterBar
          value={filters}
          onChange={setFilters}
          showCounselor={current === "counselor" && role !== "counselor"}
        />
        <div className="flex items-center gap-2 flex-wrap">
          {(data?.availableViews?.length ?? 0) > 1 && (
            <div className="flex gap-1 bg-[#F5F5F5] dark:bg-muted p-1 rounded-[10px]">
              {data!.availableViews.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setView(v)}
                  className={cn(
                    "px-3 py-1 rounded-[8px] text-[13px] font-medium transition-all duration-200",
                    current === v ? "bg-[#2563EB] text-white shadow-xs" : "text-[#737373] hover:text-[#0a0a0a]",
                  )}
                >
                  {VIEW_LABELS[v]}
                </button>
              ))}
            </div>
          )}
          <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={cn("size-3.5", isFetching && "animate-spin")} />
            {data?.generatedAt ? `Updated ${timeAgo(data.generatedAt)}` : "Refresh"}
          </Button>
        </div>
      </div>

      {isLoading || !data ? (
        <LoadingBlock height={400} />
      ) : (
        <>
          <ModulesOverviewGrid modules={data.modules} />
          {data.view === "admissions" && <AdmissionsView data={data} />}
          {data.view === "counselor" && <CounselorView data={data} />}
          {data.view === "marketing" && <MarketingView data={data} />}
          {data.view === "evaluator" && <EvaluatorView data={data} />}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2">
              <RecentActivityPanel items={data.recentActivity} />
            </div>
            <UpcomingEventsPanel modules={data.modules} />
          </div>
        </>
      )}
    </div>
  );
}
