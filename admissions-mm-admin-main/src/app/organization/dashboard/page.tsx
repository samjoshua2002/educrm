import { InsightCards } from "@/app/(main)/dashboard/_components/insight-cards";
import { OverviewCards } from "@/app/(main)/dashboard/_components/overview-cards";
import { RecentApplications } from "@/app/(main)/dashboard/_components/recent-applications";

export default function OrganizationDashboardPage() {
  return (
    <>
      <div className="sticky top-12 z-10 bg-background/40 backdrop-blur-md flex items-center px-4 md:px-6 py-3 border-b">
        <h1 className="text-xl font-semibold">Organization Dashboard</h1>
      </div>
      <div className="flex flex-col gap-4 p-4 md:p-6">
        <OverviewCards />
        <InsightCards />
        <RecentApplications />
      </div>
    </>
  );
}
