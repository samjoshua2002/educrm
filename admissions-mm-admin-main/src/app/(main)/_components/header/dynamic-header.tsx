"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Bell, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { users } from "@/data/users";

import { AccountSwitcher } from "../sidebar/account-switcher";
import { useAuthStore } from "@/stores/auth-store";
import { getStoredApplications } from "@/hooks/use-applications";

export function DynamicHeader() {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const userName = user?.name?.split(" ")[0] || "User";

  const getApplicantName = () => {
    const segments = pathname.split("/").filter(Boolean);
    const appNo = segments[segments.length - 1];
    if (appNo) {
      const appsList = getStoredApplications();
      const app = appsList.find((a) => a.applicationNo === appNo);
      if (app) return app.name.toUpperCase();
    }
    return "MS. ANBUKARASI A";
  };

  const applicantName = getApplicantName();

  const getTitle = () => {
    if (pathname.startsWith("/dashboard")) return "Dashboard Overview";
    if (pathname.startsWith("/lead-manager")) return "Lead Management";
    if (pathname.startsWith("/gd-interview")) return "GD & Interview";
    if (pathname.startsWith("/payments")) return "Payments testing";
    if (pathname.includes("/applications/")) return "Application Details";

    const segments = pathname.split("/").filter(Boolean);
    const lastSegment = segments[segments.length - 1] || "EDUCRM";
    return (
      lastSegment.charAt(0).toUpperCase() +
      lastSegment.slice(1).replace(/-/g, " ")
    );
  };

  const title = getTitle();

  const getSubtitle = () => {
    if (pathname.startsWith("/dashboard")) return `Welcome back, ${userName}. Here's what's happening today.`;
    
    const segments = pathname.split("/").filter(Boolean);
    const isDetailPage = segments.length > 1;

    if (pathname.startsWith("/applications") && isDetailPage) {
      return `View and manage application information for ${applicantName}`;
    }
    
    if (pathname.startsWith("/gd-interview") && isDetailPage) {
      return `View and evaluate candidate interview for ${applicantName}`;
    }
    
    return null;
  };

  const subtitle = getSubtitle();

  let actionText = "New applications";
  let actionHref = "/my-application";

  if (pathname.startsWith("/lead-manager")) {
    actionText = "Add Lead";
    actionHref = "/lead-manager/create";
  } else if (pathname.startsWith("/superadmin/organizations")) {
    actionText = "Create Organization";
    actionHref = "/superadmin/organizations/create";
  }

  const showActionButton = !pathname.startsWith("/gd-interview") && !pathname.startsWith("/my-application");

  // Common template for actions (Right side)
  const commonActions = (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="icon" className="size-9 rounded-full">
        <Bell className="size-5" />
      </Button>
      {showActionButton && (
        <Link href={actionHref}>
          <Button className="hidden md:flex rounded-[8px] bg-[#ea2525] hover:bg-[#bb1e1e]">
            <Plus className="size-4 mr-2" />
            {actionText}
          </Button>
        </Link>
      )}
    </div>
  );

  return (
    <header className="sticky top-0 z-10 bg-background/40 backdrop-blur-md flex h-14 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear">
      <div className="flex w-full items-center justify-between px-4 lg:px-6">
        {/* Left Side: Sidebar Trigger + Dynamic Title */}
        <div className="flex items-center gap-4">
          <SidebarTrigger className="lg:hidden !text-[#120352] hover:!text-[#120352]/80 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50" />
          <div className="flex flex-col">
            <h1 className="text-lg font-semibold tracking-tight leading-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="text-[10px] text-slate-500 font-normal leading-none mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Right Side: Common Actions + Account Switcher */}
        <div className="flex items-center gap-4">{commonActions}</div>
      </div>
    </header>
  );
}
