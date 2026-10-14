import { formatDistanceToNow } from "date-fns";

export const NOTIFICATION_MODULES: { value: string; label: string }[] = [
  { value: "leads", label: "Leads" },
  { value: "applications", label: "Applications" },
  { value: "interviews", label: "Interviews" },
  { value: "decisions", label: "Decisions" },
  { value: "payments", label: "Payments" },
  { value: "communications", label: "Communications" },
  { value: "announcements", label: "Announcements" },
  { value: "staff", label: "Staff" },
  { value: "system", label: "System" },
  { value: "platform", label: "Platform" },
];

export const NOTIFICATION_SEVERITIES: { value: string; label: string }[] = [
  { value: "info", label: "Info" },
  { value: "success", label: "Success" },
  { value: "warning", label: "Warning" },
  { value: "critical", label: "Critical" },
];

export function moduleLabel(module: string) {
  const found = NOTIFICATION_MODULES.find((m) => m.value === module);
  if (found) return found.label;
  return module ? module.charAt(0).toUpperCase() + module.slice(1).replace(/[_-]/g, " ") : "General";
}

export const severityStyles: Record<string, { dot: string; badge: string }> = {
  info: { dot: "bg-[#2563eb]", badge: "bg-[#eff6ff] text-[#2563eb] border-[#bfdbfe]" },
  success: { dot: "bg-[#16a34a]", badge: "bg-[#f0fdf4] text-[#16a34a] border-[#bbf7d0]" },
  warning: { dot: "bg-[#d97706]", badge: "bg-[#fffbeb] text-[#b45309] border-[#fde68a]" },
  critical: { dot: "bg-[#dc2626]", badge: "bg-[#fef2f2] text-[#dc2626] border-[#fecaca]" },
};

export function severityStyle(sev?: string) {
  return severityStyles[sev || "info"] || severityStyles.info;
}

export function timeAgo(date?: string | null) {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  return formatDistanceToNow(d, { addSuffix: true });
}

/** Notifications page for the signed-in role (students have none, they use the bell). */
export function notificationsPageFor(role?: string | null) {
  if (role === "superadmin") return "/superadmin/notifications";
  if (role && role !== "student") return "/organization/notifications";
  return null;
}
