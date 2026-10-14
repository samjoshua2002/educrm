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
  Gavel,
  Mail,
  Megaphone,
  BarChart3,
  Bell,
  Target,
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
        roles: ["org_admin", "lead_manager", "counselor"],
      },
      {
        title: "Campaigns",
        url: "/organization/campaigns",
        icon: Target,
        roles: ["org_admin", "lead_manager"],
      },
      {
        title: "Applications",
        url: "/organization/applications",
        icon: ApplicationsIcon,
        subItems: [
          { title: "All Applications", url: "/organization/applications" },
          { title: "Status Tracker", url: "/organization/applications/status-tracker" },
        ],
      },
      {
        title: "GD & Interview",
        url: "/organization/gd-interview",
        icon: GdInterviewIcon,
        subItems: [
          { title: "Run Shortlisting", url: "/organization/shortlisting-run" },
          { title: "Candidates", url: "/organization/gd-interview" },
          { title: "Interview Slots", url: "/organization/interview-slots" },
          { title: "My Evaluations", url: "/organization/gd-interview/my-evaluations" },
          { title: "Seat Allocation & Merit", url: "/organization/gd-interview/resultsevalutaion" },
          { title: "Results Announcement", url: "/organization/gd-interview/evaluate" },
        ],
      },
    
      {
        title: "Admission Decisions",
        url: "/organization/decisions",
        icon: Gavel,
        subItems: [
          { title: "Decisions", url: "/organization/decisions" },
          { title: "Offer Letters", url: "/organization/decisions?tab=offers" },
          { title: "Acceptances", url: "/organization/decisions?tab=acceptances" },
          { title: "Waitlist", url: "/organization/decisions?tab=waitlist" },
          { title: "Rejections", url: "/organization/decisions?tab=rejections" },
          { title: "Decision Settings", url: "/organization/decisions/settings" },
        ],
      },
      {
        title: "Communications",
        url: "/organization/communications",
        icon: CommunicationIcon,
        subItems: [
          { title: "Communications Log", url: "/organization/communications" },
          { title: "Email Templates", url: "/organization/email-templates" },
          { title: "Template Categories", url: "/organization/email-templates/categories" },
        ],
      },
      {
        title: "Payments",
        url: "/organization/payments",
        icon: PaymentsIcon,
        subItems: [
          { title: "All Payments", url: "/organization/payments" },
          { title: "Reconciliation", url: "/organization/payments/reconciliation" },
        ],
      },
      {
        title: "Announcements & Events",
        url: "/organization/events",
        icon: Megaphone,
      },
      {
        title: "Reports & Analytics",
        url: "/organization/reports",
        icon: BarChart3,
      },
      {
        title: "Notifications",
        url: "/organization/notifications",
        icon: Bell,
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
      // {
      //   title: "Email Templates",
      //   url: "/organization/email-templates",
      //   icon: Mail,
      // },
      {
        title: "Settings",
        url: "/organization/settings",
        icon: Settings,
        subItems: [
          { title: "Organization", url: "/organization/settings/organization" },
          { title: "Courses", url: "/organization/settings/courses" },
          { title: "Locations", url: "/organization/settings/locations" },
          { title: "Fees", url: "/organization/settings/fees" },
          { title: "Shortlisting & Rubrics", url: "/organization/settings/shortlisting" },
          { title: "Scoring Bands", url: "/organization/settings/scoring-bands" },
          { title: "GD & PI Scoring", url: "/organization/settings/gd-scoring" },
          { title: "Calendar Integration", url: "/organization/settings/calendar" },
          { title: "Lead Scoring", url: "/organization/settings/lead-scoring" },
          { title: "Lead Routing", url: "/organization/settings/lead-routing" },
          { title: "Lead Capture Integrations", url: "/organization/settings/lead-integrations" },
          { title: "Letter Templates", url: "/organization/settings/letter-templates" },
          { title: "Payment Gateways", url: "/organization/settings/payment-gateways" },
          { title: "Reminders & Nudges", url: "/organization/settings/reminders" },
          { title: "Videos", url: "/organization/settings/videos" },
          { title: "Category", url: "/organization/settings/category" },
        ],
      },
    ],
  },
];
