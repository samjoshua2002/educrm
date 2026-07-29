import { ChartConfig } from "@/components/ui/chart";

// ── Overview: daily applications this month ──────────────────────────────────
export const applicationsChartData = [
  { date: "1-5", verified: 85, pending: 32 },
  { date: "6-10", verified: 110, pending: 45 },
  { date: "11-15", verified: 72, pending: 28 },
  { date: "16-20", verified: 130, pending: 60 },
  { date: "21-25", verified: 95, pending: 38 },
  { date: "26-30", verified: 140, pending: 55 },
];

export const applicationsChartConfig = {
  verified: {
    label: "Verified",
    color: "var(--chart-1)",
  },
  pending: {
    label: "Pending",
    color: "var(--chart-3)",
  },
  background: {
    color: "var(--primary)",
  },
} as ChartConfig;

// ── Overview: pending review trend ───────────────────────────────────────────
export const pendingTrendData = [
  { date: "1-5", pending: 40 },
  { date: "6-10", pending: 55 },
  { date: "11-15", pending: 35 },
  { date: "16-20", pending: 70 },
  { date: "21-25", pending: 50 },
  { date: "26-30", pending: 85 },
];

export const pendingTrendConfig = {
  pending: {
    label: "Pending",
    color: "var(--chart-4)",
  },
} as ChartConfig;

// ── Overview: verified trend ──────────────────────────────────────────────────
export const verifiedTrendData = [
  { date: "1-5", verified: 85 },
  { date: "6-10", verified: 110 },
  { date: "11-15", verified: 72 },
  { date: "16-20", verified: 130 },
  { date: "21-25", verified: 95 },
  { date: "26-30", verified: 140 },
];

export const verifiedTrendConfig = {
  verified: {
    label: "Verified",
    color: "var(--chart-1)",
  },
} as ChartConfig;

// ── Overview: rejected trend ──────────────────────────────────────────────────
export const rejectedTrendData = [
  { date: "1-5", rejected: 6 },
  { date: "6-10", rejected: 9 },
  { date: "11-15", rejected: 4 },
  { date: "16-20", rejected: 12 },
  { date: "21-25", rejected: 8 },
  { date: "26-30", rejected: 8 },
];

export const rejectedTrendConfig = {
  rejected: {
    label: "Rejected",
    color: "var(--chart-5)",
  },
} as ChartConfig;

// ── Overview: fee collection (6-month) ───────────────────────────────────────
export const feeCollectionData = [
  { month: "Oct", fee: 420000 },
  { month: "Nov", fee: 680000 },
  { month: "Dec", fee: 390000 },
  { month: "Jan", fee: 820000 },
  { month: "Feb", fee: 1100000 },
  { month: "Mar", fee: 950000 },
];

export const feeCollectionConfig = {
  fee: {
    label: "Fee (₹)",
    color: "var(--chart-2)",
  },
} as ChartConfig;

// ── Insights: applications by course ─────────────────────────────────────────
export const byCourseData = [
  { course: "btech", applications: 480, fill: "var(--color-btech)" },
  { course: "mba", applications: 210, fill: "var(--color-mba)" },
  { course: "barch", applications: 145, fill: "var(--color-barch)" },
  { course: "bsc", applications: 230, fill: "var(--color-bsc)" },
  { course: "other", applications: 175, fill: "var(--color-other)" },
];

export const byCourseConfig = {
  applications: { label: "Applications" },
  btech: { label: "B.Tech", color: "var(--chart-1)" },
  mba: { label: "MBA", color: "var(--chart-2)" },
  barch: { label: "B.Arch", color: "var(--chart-3)" },
  bsc: { label: "B.Sc", color: "var(--chart-4)" },
  other: { label: "Others", color: "var(--chart-5)" },
} as ChartConfig;

// ── Insights: status per stream (stacked bar) ────────────────────────────────
export const statusByStreamData = [
  { stream: "B.Tech", verified: 310, pending: 90, rejected: 80 },
  { stream: "MBA", pending: 65, verified: 120, rejected: 25 },
  { stream: "B.Arch", pending: 40, verified: 85, rejected: 20 },
  { stream: "B.Sc", pending: 55, verified: 155, rejected: 20 },
];

export const statusByStreamConfig = {
  verified: { label: "Verified", color: "var(--chart-1)" },
  pending: { label: "Pending", color: "var(--chart-3)" },
  rejected: { label: "Rejected", color: "var(--chart-5)" },
} as ChartConfig;

// ── Recent applications ───────────────────────────────────────────────────────
export const recentApplicationsData = [
  {
    id: "APP-2401",
    name: "Arjun Sharma",
    email: "arjun.s@example.com",
    course: "B.Tech Computer Science",
    submittedAt: "Today, 10:30 AM",
    status: "Verified",
  },
  {
    id: "APP-2402",
    name: "Priya Patel",
    email: "priya.p@example.com",
    course: "B.Arch",
    submittedAt: "Today, 11:45 AM",
    status: "Pending",
  },
  {
    id: "APP-2403",
    name: "Sneha Reddy",
    email: "sneha.r@example.com",
    course: "MBA Marketing",
    submittedAt: "Yesterday, 9:20 PM",
    status: "Rejected",
  },
  {
    id: "APP-2404",
    name: "Kabir Singh",
    email: "kabir.s@example.com",
    course: "B.Tech Mechanical",
    submittedAt: "Yesterday, 4:10 PM",
    status: "Verified",
  },
  {
    id: "APP-2405",
    name: "Meera Nair",
    email: "meera.n@example.com",
    course: "B.Sc Physics",
    submittedAt: "2d ago",
    status: "Pending",
  },
];

// ── Admission funnel ──────────────────────────────────────────────────────────
export const funnelData = [
  { stage: "Applied", value: 1240 },
  { stage: "Shortlisted", value: 860 },
  { stage: "Docs Verified", value: 620 },
  { stage: "Interview", value: 410 },
  { stage: "Admitted", value: 290 },
];

export const courseConversionData = [
  { name: "B.Tech", applied: 480, admitted: 290, percentage: 60 },
  { name: "MBA", applied: 210, admitted: 120, percentage: 57 },
  { name: "B.Arch", applied: 145, admitted: 85, percentage: 59 },
  { name: "B.Sc", applied: 230, admitted: 140, percentage: 61 },
];
