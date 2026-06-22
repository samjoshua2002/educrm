"use client";

import * as React from "react";

import { useApplications } from "@/hooks/use-applications";

import { DashboardCharts } from "./_components/dashboard-charts";
import { DashboardStats } from "./_components/dashboard-stats";
import { RecentApplicationsTable } from "./_components/recent-applications-table";

export default function DashboardPage() {
  const [mounted, setMounted] = React.useState(false);
  const { data: applicationsResponse, isLoading } = useApplications();

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const applications = React.useMemo(() => {
    return applicationsResponse?.data ?? [];
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
