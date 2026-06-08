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
import { LeadManagerIcon } from "@/components/icons/lead-manager-icon";
import { ApplicationsIcon } from "@/components/icons/applications-icon";
import { GdInterviewIcon } from "@/components/icons/gd-interview-icon";
import { CommunicationIcon } from "@/components/icons/communication-icon";
import { PaymentsIcon } from "@/components/icons/payments-icon";
import { TeamIcon } from "@/components/icons/team-icon";
import { FormsIcon } from "@/components/icons/forms-icon";
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
        icon: LeadManagerIcon,
      },
      {
        title: "Leads",
        url: "/organization/leads",
        icon: Link,
      },
      {
        title: "Applications",
        url: "/organization/applications",
        icon: ApplicationsIcon,
      },
      {
        title: "GD & Interview",
        url: "/organization/gd-interview",
        icon: GdInterviewIcon,
      },
      {
        title: "Communications",
        url: "/organization/communications",
        icon: CommunicationIcon,
      },
      {
        title: "Payments",
        url: "/organization/payments",
        icon: PaymentsIcon,
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
        icon: TeamIcon,
      },
      {
        title: "Students",
        url: "/organization/students",
        icon: Users,
      },
      {
        title: "Forms",
        url: "/organization/forms",
        icon: FormsIcon,
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
