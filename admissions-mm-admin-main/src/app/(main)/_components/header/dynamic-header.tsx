"use client";

import { usePathname } from "next/navigation";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { AccountSwitcher } from "../sidebar/account-switcher";
import { users } from "@/data/users";
import { Button } from "@/components/ui/button";
import { Bell, Plus } from "lucide-react";
import Link from "next/link";

export function DynamicHeader() {
  const pathname = usePathname();

  // Dynamic title based on pathname
  const getTitle = () => {
    if (pathname.startsWith("/dashboard")) return "Dashboard Overview";
    if (pathname.startsWith("/lead-manager")) return "Lead Management";
    if (pathname.startsWith("/gd-interview")) return "GD Interview";
    if (pathname.startsWith("/payments")) return "Payments testing";

    const segments = pathname.split("/").filter(Boolean);
    const lastSegment = segments[segments.length - 1] || "EDUCRM";
    return lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1).replace(/-/g, " ");
  };

  const title = getTitle();

  // Common template for actions (Right side)
  const commonActions = (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="icon" className="size-9 rounded-full">
        <Bell className="size-5" />
      </Button>
      <Button className="rounded-[8px] bg-[#2563EA] hover:bg-[#1D4ED8]">
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
         
          <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
        </div>

        {/* Right Side: Common Actions + Account Switcher */}
        <div className="flex items-center gap-4">
          {commonActions}
         
        </div>
      </div>
    </header>
  );
}



