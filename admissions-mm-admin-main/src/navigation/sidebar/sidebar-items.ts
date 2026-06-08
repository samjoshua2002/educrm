import {
  Users,
  LayoutDashboard,
  MessageSquareText,
  Wallet,
  NotepadText,
  UserPen,
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

export interface NavSubItem {
  title: string;
  url: string;
  icon?: any;
  comingSoon?: boolean;
  newTab?: boolean;
  isNew?: boolean;
}

export interface NavMainItem {
  title: string;
  url: string;
  icon?: any;
  subItems?: NavSubItem[];
  comingSoon?: boolean;
  newTab?: boolean;
  isNew?: boolean;
}

export interface NavGroup {
  id: number;
  label?: string;
  items: NavMainItem[];
}

export const sidebarItems: NavGroup[] = [
  {
    id: 1,
    label: "Admin Menu",
    items: [
      {
        title: "Dashboard",
        url: "/dashboard",
        icon: LayoutDashboard,
      },
      {
        title: "Lead Manager",
        url: "/lead-manager",
        icon: LeadManagerIcon,
      },
      {
        title: "Applications",
        url: "/applications",
        icon: ApplicationsIcon,
      },
      {
        title: "GD & Interview",
        url: "/gd-interview",
        icon: GdInterviewIcon,
      },
      {
        title: "Communications",
        url: "/communications",
        icon: CommunicationIcon,
      },
      {
        title: "Payments",
        url: "/payments",
        icon: PaymentsIcon,
      },
    ],
  },
  {
    id: 2,
    label: "Organization Management",
    items: [
      {
        title: "Team",
        url: "/team",
        icon: TeamIcon,
      },
      {
        title: "Forms",
        url: "/organization/forms",
        icon: FormsIcon,
      },
      // {
      //   title: "Notices",
      //   url: "/notices",
      //   icon: NotepadText,
      // },
      // {
      //   title: "Banners",
      //   url: "/banners",
      //   icon: GalleryThumbnails,
      // },
      {
        title: "Settings",
        url: "/settings",
        icon: Settings,
        subItems: [
          { title: "Organization", url: "/settings/organization" },
          { title: "Locations", url: "/settings/locations" },
          { title: "Videos", url: "/gallery/videos" },
          { title: "Category", url: "/gallery/category" },
        ],
      },
      // {
      //   title: "Testimonials",
      //   url: "/testimonials",
      //   icon: MessageSquareText,
      //   subItems: [
      //     { title: "Testimonials", url: "/testimonials" },
      //     { title: "Group", url: "/testimonials/group" },
      //   ],
      // },
      // {
      //   title: "Successful Students",
      //   url: "/successful-students",
      //   icon: GraduationCap,
      // },
      // {
      //   title: "Achievements",
      //   url: "/achievements",
      //   icon: Trophy,
      // },
    ],
  },
  {
    id: 3,
    label: "User Menu",
    items: [
      {
        title: "My Application",
        url: "/my-application",
        icon: NotepadText,
      },
    ],
  },
];
