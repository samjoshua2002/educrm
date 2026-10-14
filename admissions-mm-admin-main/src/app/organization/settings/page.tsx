import Link from "next/link";
import { BookOpen, MapPin, ClipboardList, IndianRupee, Gauge, Plug, Target, Route, Webhook, Scale, CalendarDays, FileText, CreditCard, BellRing } from "lucide-react";

const settingsLinks = [
  {
    title: "Organization Settings",
    description: "Configure this organization's SMTP sender and Razorpay payment gateway credentials.",
    href: "/organization/settings/organization",
    icon: Plug,
  },
  {
    title: "Courses & Sessions",
    description: "Manage course catalogs, academic sessions, and availability.",
    href: "/organization/settings/courses",
    icon: BookOpen,
  },
  {
    title: "Locations",
    description: "Manage campus and interview locations.",
    href: "/organization/settings/locations",
    icon: MapPin,
  },
  {
    title: "Fees",
    description: "Configure the application fee charged to students.",
    href: "/organization/settings/fees",
    icon: IndianRupee,
  },
  {
    title: "Shortlisting & Rubrics",
    description: "Configure GD/PI shortlisting rules and scoring rubrics.",
    href: "/organization/settings/shortlisting",
    icon: ClipboardList,
  },
  {
    title: "Scoring Bands",
    description: "Configure score conversion bands for academics, test percentile, and experience.",
    href: "/organization/settings/scoring-bands",
    icon: Gauge,
  },
  {
    title: "GD & PI Scoring",
    description: "Create custom GD/PI scoring schemes or use the Standard template.",
    href: "/organization/settings/gd-scoring",
    icon: Scale,
  },
  {
    title: "Calendar Integration",
    description: "Connect Google or Outlook calendars for interview scheduling.",
    href: "/organization/settings/calendar",
    icon: CalendarDays,
  },
  {
    title: "Lead Scoring",
    description: "Configure lead scoring rules and Hot/Warm/Cold thresholds.",
    href: "/organization/settings/lead-scoring",
    icon: Target,
  },
  {
    title: "Lead Routing",
    description: "Configure rules that assign new leads to counselors.",
    href: "/organization/settings/lead-routing",
    icon: Route,
  },
  {
    title: "Lead Capture Integrations",
    description: "Web forms, API, social ads, education portals, events and chatbot.",
    href: "/organization/settings/lead-integrations",
    icon: Webhook,
  },
  {
    title: "Letter Templates",
    description: "Offer, waitlist and rejection letter templates with merge fields.",
    href: "/organization/settings/letter-templates",
    icon: FileText,
  },
  {
    title: "Payment Gateways",
    description: "Enable Razorpay, Stripe, PayU or Paytm, set currency and payment methods.",
    href: "/organization/settings/payment-gateways",
    icon: CreditCard,
  },
  {
    title: "Reminders & Nudges",
    description: "Automatic reminders, status SLA alerts and document rules.",
    href: "/organization/settings/reminders",
    icon: BellRing,
  },
];

export default function OrganizationSettingsPage() {
  return (
    <>
      <div className="sticky top-12 z-10 bg-background/40 backdrop-blur-md flex items-center px-4 md:px-6 py-3 border-b">
        <h1 className="text-xl font-semibold">Settings</h1>
      </div>
      <div className="flex flex-col gap-4 p-4 md:p-6">
        <p>
          Manage your organization&apos;s profile, gateway configuration, and
          regional setup.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {settingsLinks.map(({ title, description, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex flex-col gap-3 rounded-xl border border-border/80 bg-card p-5 hover:shadow-sm hover:border-primary/40 transition-all"
            >
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-5" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm">{title}</p>
                <p className="text-xs text-muted-foreground mt-1">{description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
