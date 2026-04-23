import {
  Users,
  LayoutDashboard,
  type LucideIcon,
  MessageSquareText,
  Wallet,
  NotepadText,
  UserPen,
  FileText,
  Settings,
} from "lucide-react";

export interface NavSubItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  comingSoon?: boolean;
  newTab?: boolean;
  isNew?: boolean;
}

export interface NavMainItem {
  title: string;
  url: string;
  icon?: LucideIcon;
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
        icon: Users,
      },
      {
        title: "Applications",
        url: "/applications",
        icon: NotepadText,
      },
      {
        title: "GD & Interview",
        url: "/gd-interview",
        icon: UserPen,
      },
      {
        title: "Communications",
        url: "/communications",
        icon: MessageSquareText,
      },
      {
        title: "Payments",
        url: "/payments",
        icon: Wallet,
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
        icon: UserPen,
      },
      {
        title: "Forms",
        url: "/organization/forms",
        icon: FileText,
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
