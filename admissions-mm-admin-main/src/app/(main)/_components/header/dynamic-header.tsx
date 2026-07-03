"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Bell, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { users } from "@/data/users";

import { AccountSwitcher } from "../sidebar/account-switcher";
import { useAuthStore } from "@/stores/auth-store";
import { useApplications } from "@/hooks/use-applications";

export function DynamicHeader() {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const userName = user?.name?.split(" ")[0] || "User";
  const { data: appsResponse } = useApplications();
  const appsList: any[] = (appsResponse as any)?.data || appsResponse || [];

  const getApplicantName = () => {
    const segments = pathname.split("/").filter(Boolean);
    const appNo = segments[segments.length - 1];
    if (appNo && Array.isArray(appsList)) {
      const app = appsList.find((a: any) => a.applicationNo === appNo);
      if (app) return app.name.toUpperCase();
    }
    return "MS. ANBUKARASI A";
  };

  const applicantName = getApplicantName();

  // Dynamic title based on pathname
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

  // Common template for actions (Right side)
  const commonActions = (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="icon" className="size-9 rounded-full">
        <Bell className="size-5" />
      </Button>
      <Button className="hidden md:flex rounded-[8px] bg-[#2563EA] hover:bg-[#1D4ED8]">
        <Plus className="size-4 mr-2" />
        New applications
      </Button>
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
            {pathname.includes("/applications/") && (
              <p className="text-[10px] text-slate-500 font-normal leading-none mt-0.5">
                View and manage application information for {applicantName}
              </p>
            )}
            {pathname.includes("/dashboard") && (
              <p className="text-[10px] text-slate-500 font-normal leading-none mt-0.5">
                Welcome back, {userName}. Here's what's happening today.
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
