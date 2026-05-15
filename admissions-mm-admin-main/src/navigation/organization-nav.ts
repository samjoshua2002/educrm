import {
  LayoutDashboard,
  Users,
  UserPen,
  Network,
  Calendar,
  Wallet,
  Link,
  NotepadText,
  MessageSquareText,
  FileText,
  Settings,
} from "lucide-react";
import { NavGroup } from "./sidebar/sidebar-items";

export const organizationNavItems: NavGroup[] = [
  {
    id: 1,
    label: "Organization Operations",
    items: [
      {
        title: "Dashboard",
        url: "/organization/dashboard",
        icon: LayoutDashboard,
      },
      {
        title: "Lead Manager",
        url: "/organization/lead-manager",
        icon: Users,
      },
      {
        title: "Leads",
        url: "/organization/leads",
        icon: Link,
      },
      {
        title: "Applications",
        url: "/organization/applications",
        icon: NotepadText,
      },
      {
        title: "GD & Interview",
        url: "/organization/gd-interview",
        icon: UserPen,
      },
      {
        title: "Communications",
        url: "/organization/communications",
        icon: MessageSquareText,
      },
      {
        title: "Payments",
        url: "/organization/payments",
        icon: Wallet,
      },
      {
        title: "Events",
        url: "/organization/events",
        icon: Calendar,
      },
    ],
  },
  {
    id: 2,
    label: "Management",
    items: [
      {
        title: "Branches",
        url: "/organization/branches",
        icon: Network,
      },
      {
        title: "Team",
        url: "/organization/team",
        icon: Users,
      },
      {
        title: "Students",
        url: "/organization/students",
        icon: Users,
      },
      {
        title: "Forms",
        url: "/organization/forms",
        icon: FileText,
      },
      {
        title: "Settings",
        url: "/organization/settings",
        icon: Settings,
        subItems: [
          { title: "Organization", url: "/organization/settings/organization" },
          { title: "Locations", url: "/organization/settings/locations" },
          { title: "Videos", url: "/organization/settings/videos" },
          { title: "Category", url: "/organization/settings/category" },
        ],
      },
    ],
  },
];
