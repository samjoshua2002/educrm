import { ReactNode } from "react";
import { cookies } from "next/headers";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { getPreference } from "@/server/server-actions";
import { users } from "@/data/users";
import { SuperadminSidebar } from "./_components/sidebar/superadmin-sidebar";
import {
  SIDEBAR_VARIANT_VALUES,
  SIDEBAR_COLLAPSIBLE_VALUES,
  CONTENT_LAYOUT_VALUES,
  type SidebarVariant,
  type SidebarCollapsible,
  type ContentLayout,
} from "@/types/preferences/layout";

import { DynamicHeader } from "@/app/(main)/_components/header/dynamic-header";
import { MobileFab } from "@/app/(main)/_components/mobile-fab";

export default async function SuperadminLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const cookieStore = await cookies();
  const sidebarState = cookieStore.get("sidebar_state");
  const defaultOpen = sidebarState ? sidebarState.value === "true" : true;

  const [sidebarVariant, sidebarCollapsible, contentLayout] = await Promise.all(
    [
      getPreference<SidebarVariant>(
        "sidebar_variant",
        SIDEBAR_VARIANT_VALUES,
        "sidebar",
      ),
      getPreference<SidebarCollapsible>(
        "sidebar_collapsible",
        SIDEBAR_COLLAPSIBLE_VALUES,
        "icon",
      ),
      getPreference<ContentLayout>(
        "content_layout",
        CONTENT_LAYOUT_VALUES,
        "centered",
      ),
    ],
  );

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <SuperadminSidebar
        variant={sidebarVariant}
        collapsible={sidebarCollapsible}
        users={users}
      />
      <SidebarInset
        data-content-layout={contentLayout}
        className={cn(
          "data-[content-layout=centered]:!mx-auto data-[content-layout=centered]:max-w-screen-2xl",
          "max-[113rem]:peer-data-[variant=inset]:!mr-2 min-[101rem]:peer-data-[variant=inset]:peer-data-[state=collapsed]:!mr-auto",
          "overflow-x-hidden w-full min-w-0 flex flex-col h-svh",
        )}
      >
        <DynamicHeader />
        <div className="flex-1 overflow-y-auto pt-0 w-full min-w-0 flex flex-col">
          {children}
        </div>
        <MobileFab />
      </SidebarInset>
    </SidebarProvider>
  );
}
