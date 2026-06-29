"use client";

import * as React from "react";
import { Command, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AccountSwitcher } from "./account-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { APP_CONFIG } from "@/config/app-config";
import { sidebarItems } from "@/navigation/sidebar/sidebar-items";
import { NavMain } from "./nav-main";

export function AppSidebar({
  users = [],
  ...props
}: React.ComponentProps<typeof Sidebar> & { users?: any[] }) {
  const { isMobile } = useSidebar();

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center justify-between pr-2 group-data-[collapsible=icon]:pr-0 relative min-h-8">
              <SidebarMenuButton
                asChild
                className="data-[slot=sidebar-menu-button]:!p-1.5 flex-1 transition-opacity duration-300 group-data-[collapsible=icon]:opacity-0 lg:group-data-[collapsible=icon]:opacity-100 lg:group-data-[collapsible=icon]:group-hover:opacity-0 lg:group-data-[collapsible=icon]:group-hover:pointer-events-none"
              >
                <a href="#">
                  <Command />
                  <span className="text-base font-semibold">
                    {APP_CONFIG.name}
                  </span>
                </a>
              </SidebarMenuButton>
              {!isMobile && (
                <SidebarTrigger className="size-8 !p-1.5 text-sidebar-foreground transition-all duration-300 group-data-[collapsible=icon]:absolute group-data-[collapsible=icon]:left-0 group-data-[collapsible=icon]:opacity-100 lg:group-data-[collapsible=icon]:opacity-0 lg:group-data-[collapsible=icon]:group-hover:opacity-100" />
              )}
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={sidebarItems} />
        <div className="px-3 mt-4 mb-2 md:hidden">
          <Button className="w-full rounded-[8px] bg-[#2563EA] hover:bg-[#1D4ED8] text-white">
            <Plus className="size-4 mr-2" />
            New applications
          </Button>
        </div>
      </SidebarContent>
      <SidebarFooter className="pb-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <AccountSwitcher users={users} />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
