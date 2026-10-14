// Reporting & analytics types (mirror admissions-tenant-api src/modules/analytics)

export interface AnalyticsFilters {
  from?: string;
  to?: string;
  courseId?: string;
  branchId?: string;
  academicSession?: string;
  counselorId?: string;
}

export interface FilterOptions {
  courses: { id: string; name: string; code?: string; totalSeats?: number | null }[];
  branches: { id: string; name: string; city?: string; state?: string }[];
  academicSessions: string[];
  counselors: { id: string; name: string; role: string; branchId?: string | null }[];
  leadSources: string[];
  leadStatuses: { status: string; count: number }[];
  applicationStatuses: { status: string; count: number }[];
  campaigns: { id: string; name: string; sourceType?: string }[];
}

export interface FunnelStage {
  key: string;
  label: string;
  source: string;
  count: number;
  conversionFromPrevious: number;
  conversionFromStart: number;
  dropOff: number;
  dropOffCount: number;
  avgDaysFromPrevious: number | null;
}

export interface ProgramPerformance {
  courseId: string | null;
  program: string;
  seats: number | null;
  started: number;
  submitted: number;
  shortlisted: number;
  interviewed: number;
  offered: number;
  accepted: number;
  enrolled: number;
  revenue: number;
  offerRate: number;
  offerToAcceptance: number;
  seatUtilization: number | null;
}

export interface TrendPoint {
  month: string;
  leads: number;
  applications: number;
  submitted: number;
  offers: number;
  enrolled: number;
  revenue: number;
}

export interface FunnelMetrics {
  leadToApplication: number;
  applicationToInterview: number;
  interviewToOffer: number;
  offerToAcceptance: number;
  offerToAdmission: number;
  overallConversion: number;
  totalRevenue: number;
  avgDaysLeadToEnrolment: number;
}

export interface FunnelReport {
  filters: AnalyticsFilters;
  stages: FunnelStage[];
  metrics: FunnelMetrics;
  byProgram: ProgramPerformance[];
  trend: TrendPoint[];
}

export interface CampaignRow {
  id?: string;
  name?: string;
  channel?: string;
  source?: string;
  medium?: string;
  sourceType?: string;
  subSource?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  currency?: string;
  cost: number;
  leads: number;
  applications: number;
  offers: number;
  accepted: number;
  enrolled: number;
  revenue: number;
  costPerLead: number | null;
  costPerApplication: number | null;
  costPerAdmission: number | null;
  admissionConversionRate: number;
  leadToApplication: number;
  roi: number | null;
}

export interface CampaignReport {
  filters: AnalyticsFilters;
  summary: {
    totalCost: number;
    totalLeads: number;
    attributedLeads: number;
    applications: number;
    accepted: number;
    enrolled: number;
    revenue: number;
    attributedRevenue: number;
    costPerLead: number | null;
    costPerApplication: number | null;
    costPerAdmission: number | null;
    admissionConversionRate: number;
    roi: number | null;
  };
  campaigns: CampaignRow[];
  channels: CampaignRow[];
  sources: CampaignRow[];
}

export interface GeoRow {
  country?: string;
  state?: string;
  city?: string;
  leads: number;
  applications: number;
  offers: number;
  enrolled: number;
  conversionRate: number;
  admissionRate: number;
}

export interface DimensionRow {
  label: string;
  applications: number;
  submitted: number;
  offers: number;
  accepted: number;
  enrolled: number;
  offerRate: number;
  admissionRate: number;
}

export interface GeographyReport {
  filters: AnalyticsFilters;
  leadsByCountry: GeoRow[];
  leadsByState: GeoRow[];
  leadsByCity: GeoRow[];
  applicationsByState: DimensionRow[];
  applicationsByCity: DimensionRow[];
  academicBackground: DimensionRow[];
  workExperience: DimensionRow[];
  testScores: DimensionRow[];
  testsTaken: {
    test: string;
    applications: number;
    avgPercentile: number | null;
    avgScore: number | null;
    offers: number;
    offerRate: number;
  }[];
  programs: DimensionRow[];
  gender: DimensionRow[];
  ageGroups: DimensionRow[];
}

export interface CounselorRow {
  counselorId: string;
  name: string;
  role: string;
  email: string;
  leadsAssigned: number;
  leadsClosed: number;
  applications: number;
  applicationsSubmitted: number;
  interviewsScheduled: number;
  interviewsCompleted: number;
  offersGenerated: number;
  offersAccepted: number;
  enrolled: number;
  revenueGenerated: number;
  avgResponseHours: number | null;
  slaAdherence: number | null;
  slaBreachesOpen: number;
  followUpsScheduled: number;
  followUpsCompleted: number;
  followUpsOverdue: number;
  followUpCompletionRate: number | null;
  conversionRate: number;
  admissionRate: number;
  funnel: { stage: string; count: number }[];
}

export interface CounselorReport {
  filters: AnalyticsFilters;
  slaHours: number;
  summary: {
    leadsAssigned: number;
    applicationsSubmitted: number;
    offersGenerated: number;
    offersAccepted: number;
    revenueGenerated: number;
    slaBreachesOpen: number;
    followUpsOverdue: number;
    counselors: number;
    avgResponseHours: number | null;
    slaAdherence: number | null;
  };
  counselors: CounselorRow[];
  monthly: {
    counselorId: string;
    name: string;
    month: string;
    leadsAssigned: number;
    activities: number;
    submitted: number;
    offers: number;
    enrolled: number;
  }[];
  dropOffReasons: { counselorId: string; name: string; reason: string; count: number }[];
}

export type DashboardView = "admissions" | "counselor" | "marketing" | "evaluator";

export interface ModulesOverview {
  leads: { total: number; newThisWeek: number; unassigned: number; hot: number };
  applications: { total: number; newThisWeek: number; pendingVerification: number };
  interviews: { upcoming: number; completed: number };
  decisions: { pending: number; offersMade: number };
  payments: { collected: number; collectedLast30Days: number; failedLast30Days: number };
  communications: {
    sentLast30Days: number;
    failedLast30Days: number;
    byChannel: { channel: string; count: number }[];
  };
  events: {
    upcoming: number;
    announcementsLast30Days: number;
    items: {
      id: string;
      title: string;
      type: string;
      category?: string;
      eventStartDate?: string;
      eventStartTime?: string;
      venueType?: string;
      venueLocation?: string;
      priority?: string;
    }[];
  };
}

export interface ActivityItem {
  module: string;
  type: string;
  title: string;
  subject?: string | null;
  actor?: string | null;
  link?: string | null;
  at: string;
}

export interface DashboardBase {
  view: DashboardView;
  availableViews: DashboardView[];
  generatedAt: string;
  filters: AnalyticsFilters;
  modules: ModulesOverview;
  recentActivity: ActivityItem[];
}

export interface AdmissionsDashboard extends DashboardBase {
  view: "admissions";
  kpis: {
    totalApplications: number;
    submittedApplications: number;
    offersIssued: number;
    offersAccepted: number;
    offerToAcceptance: number;
    enrollmentCount: number;
    seatUtilization: number | null;
    totalSeats: number;
    revenue: number;
  };
  funnel: FunnelStage[];
  funnelMetrics: FunnelMetrics;
  programPerformance: ProgramPerformance[];
  seats: {
    courseId: string;
    name: string;
    code?: string;
    seats: number;
    enrolled: number;
    accepted: number;
    utilization: number | null;
  }[];
  trend: TrendPoint[];
}

export interface CounselorDashboard extends DashboardBase {
  view: "counselor";
  kpis: {
    leadsAssignedToday: number;
    pendingFollowUps: number;
    conversionRate: number;
    admissionRate: number;
    interviewsScheduled: number;
    leadsAssigned: number;
    slaBreaches: number;
    slaHours: number;
  };
  tasks: {
    id: string;
    name: string;
    phone?: string;
    email?: string;
    status: string;
    dueAt: string;
    scoreBand?: string;
    assignedToName?: string;
    urgency: "overdue" | "upcoming";
    kind: string;
  }[];
  upcomingInterviews: InterviewItem[];
  leadStatus: { status: string; count: number }[];
  funnel: FunnelStage[];
  counselorId: string | null;
  scope: "mine" | "counselor" | "organization";
}

export interface InterviewItem {
  id: string;
  interviewType?: string;
  round?: number | string;
  status?: string;
  startTime?: string | null;
  slotDate?: string | null;
  applicantName?: string;
  applicationNo?: string;
  program?: string;
  onMyPanel?: boolean;
  completedAt?: string;
  drafts?: number;
}

export interface MarketingDashboard extends DashboardBase {
  view: "marketing";
  kpis: {
    campaignRoi: number | null;
    costPerAdmission: number | null;
    costPerLead: number | null;
    totalCost: number;
    totalLeads: number;
    attributedRevenue: number;
    admissionConversionRate: number;
    activeChannels: number;
  };
  campaigns: CampaignRow[];
  channels: CampaignRow[];
  geo: { byState: GeoRow[]; byCountry: GeoRow[]; byCity: GeoRow[] };
  trend: TrendPoint[];
}

export interface EvaluatorDashboard extends DashboardBase {
  view: "evaluator";
  kpis: {
    interviewsPending: number;
    myInterviewsPending: number;
    interviewsCompleted: number;
    evaluationsSubmitted: number;
    myEvaluationsSubmitted: number;
    evaluationsPending: number;
    decisionTurnaroundDays: number | null;
    decisionsPending: number;
    decisionsReleased: number;
  };
  upcomingInterviews: InterviewItem[];
  pendingEvaluations: InterviewItem[];
  decisionStages: { stage: string; count: number }[];
  recommendations: { recommendation: string; count: number }[];
}

export type OrgDashboard =
  | AdmissionsDashboard
  | CounselorDashboard
  | MarketingDashboard
  | EvaluatorDashboard;

// ── Superadmin ──────────────────────────────────────────────────────────────
export interface PlatformOrgRow {
  id: string;
  name: string;
  slug?: string;
  email?: string;
  status: string;
  subscriptionStart?: string | null;
  subscriptionEnd?: string | null;
  createdAt: string;
  daysLeft: number | null;
  staff: number;
  students: number;
  branches: number;
  leads: number;
  leads30: number;
  applications: number;
  submitted: number;
  offers: number;
  enrolled: number;
  revenue: number;
  paymentFailures7d: number;
  communications30: number;
  smtpConfigured: boolean;
  paymentGatewayConfigured: boolean;
  lastActivityAt: string | null;
  conversionRate: number;
  subscriptionState: "active" | "expiring" | "expired";
}

export interface PlatformOverview {
  generatedAt: string;
  kpis: {
    organizationsTotal: number;
    organizationsActive: number;
    organizationsSuspended: number;
    subscriptionsExpired: number;
    subscriptionsExpiring30: number;
    subscriptionsExpiring7: number;
    newOrganizations30: number;
    staffUsers: number;
    studentUsers: number;
    leads: number;
    leads30: number;
    applications: number;
    applications30: number;
    submitted: number;
    offers: number;
    enrolled: number;
    revenue: number;
    revenue30: number;
    paymentsPaid: number;
    paymentsFailed: number;
    paymentsFailed7: number;
    paymentSuccessRate: number;
    communications: number;
    communications30: number;
    communicationsFailed30: number;
    interviews: number;
    leadToApplication: number;
  };
  usersByRole: { role: string; count: number; active: number }[];
  organizations: PlatformOrgRow[];
  expiringSubscriptions: {
    id: string;
    name: string;
    status: string;
    subscriptionEnd: string;
    daysLeft: number | null;
  }[];
  trend: {
    month: string;
    leads: number;
    applications: number;
    enrolled: number;
    revenue: number;
    organizations: number;
  }[];
  communicationsByChannel: { channel: string; count: number; failed: number }[];
  recentActivity: {
    kind: string;
    title: string;
    subject?: string;
    organization?: string;
    link?: string;
    at: string;
  }[];
}
