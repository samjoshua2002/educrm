"use client";

import { Command } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { APP_CONFIG } from "@/config/app-config";
import { superadminNavItems } from "@/navigation/superadmin-nav";
import { NavMain } from "@/app/(main)/_components/sidebar/nav-main";
import { AccountSwitcher } from "@/app/(main)/_components/sidebar/account-switcher";

export function SuperadminSidebar({
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
                    {APP_CONFIG.name} (Super Admin)
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
        <NavMain items={superadminNavItems} />
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
