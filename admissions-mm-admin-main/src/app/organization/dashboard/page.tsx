// import { InsightCards } from "@/app/(main)/dashboard/_components/insight-cards";
// import { OverviewCards } from "@/app/(main)/dashboard/_components/overview-cards";
// import { RecentApplications } from "@/app/(main)/dashboard/_components/recent-applications";

// export default function OrganizationDashboardPage() {
//   return (
//     <>
//       <div className="sticky top-12 z-10 bg-background/40 backdrop-blur-md flex items-center px-4 md:px-6 py-3 border-b">
//         <h1 className="text-xl font-semibold">Organization Dashboard</h1>
//       </div>
//       <div className="flex flex-col gap-4 p-4 md:p-6">
//         <OverviewCards />
//         <InsightCards />
//         <RecentApplications />
//       </div>
//     </>
//   );
// }
"use client";

import * as React from "react";

import { useApplications } from "@/hooks/use-applications";
import { usePageHeader } from "@/hooks/use-page-header";

import { DashboardCharts } from "./_components/dashboard-charts";
import { DashboardStats } from "./_components/dashboard-stats";
import { RecentApplicationsTable } from "./_components/recent-applications-table";

export default function DashboardPage() {
  usePageHeader({
    title: "Organization Dashboard",
    description: "Monitor admissions metrics, application status distribution, and recent applications.",
  });

  const [mounted, setMounted] = React.useState(false);
  const { data: applicationsResponse, isLoading } = useApplications();

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const applications = React.useMemo(() => {
    const raw = (applicationsResponse as any)?.data || applicationsResponse || [];
    return Array.isArray(raw) ? raw : [];
  }, [applicationsResponse]);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 w-full max-w-full min-w-0">
      <DashboardStats
        applications={applications}
        isLoading={isLoading}
        mounted={mounted}
      />
      <DashboardCharts
        applications={applications}
        isLoading={isLoading}
        mounted={mounted}
      />
      <RecentApplicationsTable
        applications={applications}
        isLoading={isLoading}
        mounted={mounted}
      />
    </div>
  );
}
