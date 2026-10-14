"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePageHeader } from "@/hooks/use-page-header";
import { useAuthStore } from "@/stores/auth-store";
import type { AnalyticsFilters } from "@/types/analytics";

import { AnalyticsFilterBar } from "./_components/analytics-ui";
import { FunnelReport } from "./_components/funnel-report";
import { CampaignReport } from "./_components/campaign-report";
import { GeographyReport } from "./_components/geography-report";
import { CounselorReport } from "./_components/counselor-report";

const TABS = [
  { value: "funnel", label: "Funnel Analytics", roles: ["org_admin", "lead_manager", "application_manager", "counselor"] },
  { value: "campaigns", label: "Campaign Performance", roles: ["org_admin", "lead_manager", "application_manager"] },
  { value: "geography", label: "Geographic & Demographic", roles: ["org_admin", "lead_manager", "application_manager", "counselor"] },
  { value: "counselors", label: "Counselor Performance", roles: ["org_admin", "lead_manager", "application_manager", "counselor"] },
] as const;

export default function ReportsPage() {
  return (
    <React.Suspense fallback={null}>
      <ReportsContent />
    </React.Suspense>
  );
}

function ReportsContent() {
  usePageHeader({
    title: "Reports & Analytics",
    description: "Funnel, campaign ROI, geographic & demographic insights and counselor performance.",
  });

  const role = useAuthStore((s) => s.user?.role) || "";
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabs = TABS.filter((t) => (t.roles as readonly string[]).includes(role));
  const requested = searchParams.get("tab");
  const tab = tabs.find((t) => t.value === requested)?.value || tabs[0]?.value;
  const [filters, setFilters] = React.useState<AnalyticsFilters>({});

  if (!tabs.length) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Reports are not available for your role. Use the dashboard for your interview and evaluation numbers.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 p-4 md:p-6 w-full max-w-full min-w-0">
      <Tabs value={tab} onValueChange={(v) => router.replace(`/organization/reports?tab=${v}`)} className="gap-5">
        <div className="flex flex-col gap-4">
          <TabsList className="w-full sm:w-fit overflow-x-auto justify-start">
            {tabs.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <AnalyticsFilterBar value={filters} onChange={setFilters} showCounselor={role !== "counselor" && tab !== "counselors"} />
        </div>

        <TabsContent value="funnel">{tab === "funnel" && <FunnelReport filters={filters} />}</TabsContent>
        <TabsContent value="campaigns">{tab === "campaigns" && <CampaignReport filters={filters} />}</TabsContent>
        <TabsContent value="geography">{tab === "geography" && <GeographyReport filters={filters} />}</TabsContent>
        <TabsContent value="counselors">{tab === "counselors" && <CounselorReport filters={filters} />}</TabsContent>
      </Tabs>
    </div>
  );
}
