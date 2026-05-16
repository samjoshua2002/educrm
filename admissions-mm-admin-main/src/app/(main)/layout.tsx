import { ReactNode } from "react";
import { cookies } from "next/headers";
import { AppSidebar } from "@/app/(main)/_components/sidebar/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { users } from "@/data/users";
import { cn } from "@/lib/utils";
import { getPreference } from "@/server/server-actions";
import {
    SIDEBAR_VARIANT_VALUES,
    SIDEBAR_COLLAPSIBLE_VALUES,
    CONTENT_LAYOUT_VALUES,
    type SidebarVariant,
    type SidebarCollapsible,
    type ContentLayout,
} from "@/types/preferences/layout";
import { AccountSwitcher } from "./_components/sidebar/account-switcher";

export default async function Layout({ children }: Readonly<{ children: ReactNode }>) {
    const cookieStore = await cookies();
    const sidebarState = cookieStore.get("sidebar_state");
    const defaultOpen = sidebarState ? sidebarState.value === "true" : true;

    const [sidebarVariant, sidebarCollapsible, contentLayout] = await Promise.all([
        getPreference<SidebarVariant>("sidebar_variant", SIDEBAR_VARIANT_VALUES, "sidebar"),
        getPreference<SidebarCollapsible>("sidebar_collapsible", SIDEBAR_COLLAPSIBLE_VALUES, "icon"),
        getPreference<ContentLayout>("content_layout", CONTENT_LAYOUT_VALUES, "centered"),
    ]);

    return (
        <SidebarProvider defaultOpen={defaultOpen}>
           <AppSidebar 
  variant={sidebarVariant} 
  collapsible={sidebarCollapsible} 
  users={users} // Add this line
/>
            <SidebarInset
                data-content-layout={contentLayout}
                className={cn(
                    "data-[content-layout=centered]:!mx-auto data-[content-layout=centered]:max-w-screen-2xl",
                    "max-[113rem]:peer-data-[variant=inset]:!mr-2 min-[101rem]:peer-data-[variant=inset]:peer-data-[state=collapsed]:!mr-auto",
                )}
            >
               {/* <header className="sticky top-0 z-10 bg-background/40 backdrop-blur-md flex h-12 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
                    <div className="flex w-full items-center justify-between px-4 lg:px-6">
                         <div className="flex items-center gap-1 lg:gap-2">
                            <SidebarTrigger className="-ml-1" />
                        </div> 
                        <div className="flex items-center gap-2">
                         
                        </div> 
                    </div>
                </header>  */}
                <div className="h-full pt-0">{children}</div>
            </SidebarInset>
        </SidebarProvider>
    );
}
