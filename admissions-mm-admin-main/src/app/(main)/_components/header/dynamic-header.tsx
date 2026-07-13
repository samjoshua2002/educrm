"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Bell, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";

import { useAuthStore } from "@/stores/auth-store";
import { useApplications } from "@/hooks/use-applications";
import { usePageHeaderStore } from "@/stores/page-header-store";

export function DynamicHeader() {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const userName = user?.name?.split(" ")[0] || "User";
  const { data: appsResponse } = useApplications();
  const appsList: any[] = (appsResponse as any)?.data || appsResponse || [];

  // Organization pages provide their own header info via the store
  const storeTitle = usePageHeaderStore((s) => s.title);
  const storeDescription = usePageHeaderStore((s) => s.description);
  const storeAction = usePageHeaderStore((s) => s.action);
  const customLeftNode = usePageHeaderStore((s) => s.customLeftNode);
  const customRightNode = usePageHeaderStore((s) => s.customRightNode);

  const isOrganizationRoute = pathname.startsWith("/organization");

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

  const getTitle = () => {
    if (storeTitle) return storeTitle;
    if (isOrganizationRoute) return "Organization";
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
    if (storeDescription) return storeDescription;
    if (isOrganizationRoute) return null;
    if (pathname.startsWith("/dashboard"))
      return `Welcome back, ${userName}. Here's what's happening today.`;

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

  // Determine action button for non-organization routes
  let actionText = "New applications";
  let actionHref = "/my-application";

  if (pathname.startsWith("/lead-manager")) {
    actionText = "Add Lead";
    actionHref = "/lead-manager/create";
  } else if (pathname.startsWith("/superadmin/organizations")) {
    actionText = "Create Organization";
    actionHref = "/superadmin/organizations/create";
  }

  const showActionButton =
    !pathname.startsWith("/gd-interview") &&
    !pathname.startsWith("/my-application");

  const buttonWidths: Record<string, string> = {
    "New applications": "w-[166px]",
    "Add Lead": "w-[114px]",
    "Create Organization": "w-[180px]",
  };

  // Action button for organization routes (from store)
  const orgActionButton = storeAction ? (
    storeAction.href ? (
      <Link href={storeAction.href}>
        <Button className="hidden md:flex rounded-[8px] bg-[#ea2525] hover:bg-[#bb1e1e] justify-center">
          <Plus className="size-4 mr-1" />
          {storeAction.label}
        </Button>
      </Link>
    ) : (
      <Button
        className="hidden md:flex rounded-[8px] bg-[#ea2525] hover:bg-[#bb1e1e] justify-center"
        onClick={storeAction.onClick}
      >
        <Plus className="size-4 mr-1" />
        {storeAction.label}
      </Button>
    )
  ) : null;

  // Common template for actions (Right side)
  const commonActions = (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="icon" className="size-9 rounded-full">
        <Bell className="size-5" />
      </Button>
      {(storeAction || isOrganizationRoute)
        ? orgActionButton
        : showActionButton && (
            <Link href={actionHref}>
              <Button
                className={`hidden md:flex rounded-[8px] bg-[#ea2525] hover:bg-[#bb1e1e] justify-center ${buttonWidths[actionText] || ""}`}
              >
                <Plus className="size-4" />
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
        <div className="flex items-center gap-4 flex-1">
          <SidebarTrigger className="lg:hidden !text-[#120352] hover:!text-[#120352]/80 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50" />
          {customLeftNode ? (
            customLeftNode
          ) : (
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
          )}
        </div>

        {/* Right Side: Common Actions */}
        <div className="flex items-center gap-4 shrink-0">
          {customRightNode ? customRightNode : commonActions}
        </div>
      </div>
    </header>
  );
}
