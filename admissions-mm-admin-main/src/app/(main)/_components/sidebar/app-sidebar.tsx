"use client";

import { Settings, CircleHelp, Search, Database, ClipboardList, File, Command } from "lucide-react";
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
} from "@/components/ui/sidebar";
import { APP_CONFIG } from "@/config/app-config";
import { rootUser } from "@/data/users";
import { sidebarItems } from "@/navigation/sidebar/sidebar-items";

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

export function AppSidebar({ users, ...props }: React.ComponentProps<typeof Sidebar> & { users: any[] }) {
  return (
    <Sidebar {...props}>
      <SidebarHeader>
  <SidebarMenu>
    <SidebarMenuItem>
      <div className="flex items-center justify-between pr-2"> {/* Add this wrapper */}
        <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:!p-1.5 flex-1">
          <a href="#">
            <Command />
            <span className="text-base font-semibold">{APP_CONFIG.name}</span>
          </a>
        </SidebarMenuButton>
        <SidebarTrigger /> {/* Add the trigger here */}
      </div>
    </SidebarMenuItem>
  </SidebarMenu>
</SidebarHeader>
      <SidebarContent>
        <NavMain items={sidebarItems} />
      </SidebarContent>
      {/* Add this section */}
      <SidebarFooter>
        <div className="p-4 flex items-center justify-start gap-3">
           <AccountSwitcher users={users} />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
