import { LayoutDashboard, Building2, CreditCard } from "lucide-react";
import { NavGroup } from "./sidebar/sidebar-items";

export const superadminNavItems: NavGroup[] = [
  {
    id: 1,
    label: "Superadmin Portal",
    items: [
      {
        title: "Dashboard",
        url: "/superadmin/dashboard",
        icon: LayoutDashboard,
      },
      {
        title: "Organizations",
        url: "/superadmin/organizations",
        icon: Building2,
      },
      {
        title: "Subscriptions",
        url: "/superadmin/subscriptions",
        icon: CreditCard,
      },
    ],
  },
];
