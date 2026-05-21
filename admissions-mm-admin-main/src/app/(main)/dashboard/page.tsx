import { OperationalCards } from "../crm/_components/operational-cards";
import { TableCards } from "../crm/_components/table-cards";

import { InsightCards } from "./_components/insight-cards";
import { OverviewCards } from "./_components/overview-cards";
import { RecentApplications } from "./_components/recent-applications";

export default function DashboardPage() {
  return (
    <>
      <div className="sticky top-12 z-10 bg-background/40 backdrop-blur-md flex items-center px-4 md:px-6 py-3 border-b">
        <h1 className="text-xl font-semibold">Dashboard</h1>
      </div>
      <div className="flex flex-col gap-4 p-4 md:p-6">
        <OverviewCards />
        <OperationalCards />
        <RecentApplications />
        <InsightCards />
        <TableCards />
      </div>
    </>
  );
}
