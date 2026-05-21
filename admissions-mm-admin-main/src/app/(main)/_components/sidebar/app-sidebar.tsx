"use client";

import {
  Settings,
  CircleHelp,
  Search,
  Database,
  ClipboardList,
  File,
  Command,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { APP_CONFIG } from "@/config/app-config";
import { rootUser } from "@/data/users";
import { sidebarItems } from "@/navigation/sidebar/sidebar-items";

import { AccountSwitcher } from "./account-switcher";
import { NavMain } from "./nav-main";
import { NavUser } from "./nav-user";

const data = {
  navSecondary: [
    {
      title: "Settings",
      url: "#",
      icon: Settings,
    },
    {
      title: "Get Help",
      url: "#",
      icon: CircleHelp,
    },
    {
      title: "Search",
      url: "#",
      icon: Search,
    },
  ],
  documents: [
    {
      name: "Data Library",
      url: "#",
      icon: Database,
    },
    {
      name: "Reports",
      url: "#",
      icon: ClipboardList,
    },
    {
      name: "Word Assistant",
      url: "#",
      icon: File,
    },
  ],
};

export function AppSidebar({
  users = [],
  ...props
}: React.ComponentProps<typeof Sidebar> & { users?: any[] }) {
  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center justify-between pr-2 relative">
              <SidebarMenuButton
                asChild
                className="data-[slot=sidebar-menu-button]:!p-1.5 flex-1"
              >
                <a href="#">
                  <Command className="transition-opacity duration-300 group-data-[collapsible=icon]:opacity-0 lg:group-data-[collapsible=icon]:opacity-100 lg:group-data-[collapsible=icon]:group-hover:opacity-0" />
                  <span className="text-base font-semibold">
                    {APP_CONFIG.name}
                  </span>
                </a>
              </SidebarMenuButton>
              <SidebarTrigger className="transition-all duration-300 group-data-[collapsible=icon]:absolute group-data-[collapsible=icon]:left-1 lg:group-data-[collapsible=icon]:opacity-0 lg:group-data-[collapsible=icon]:group-hover:opacity-100" />
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={sidebarItems} />
      </SidebarContent>
      {/* Add this section */}
      <SidebarFooter className="pb-[3px]">
        <SidebarMenu>
          <SidebarMenuItem>
            <AccountSwitcher users={users} />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
