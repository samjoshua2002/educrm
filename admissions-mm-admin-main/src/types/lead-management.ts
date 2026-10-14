// Types for the Lead Management module (capture, source tracking, scoring,
// routing, duplicates, campaigns). Mirrors the tenant API.

/** Scope: Channel Source dropdown */
export const CHANNEL_SOURCES = ["Web", "Social", "Portal", "Event", "Chatbot"] as const;
/** Scope: Source Type dropdown */
export const SOURCE_TYPES = ["Paid Ads", "Organic", "Referral", "Event", "Portal"] as const;
/** Scope: Created From */
export const CREATED_FROM_VALUES = ["Web", "API", "Import", "Chatbot", "Social", "Portal", "Event", "Manual"] as const;
/** Scope: Follow-up Status dropdown */
export const FOLLOW_UP_STATUSES = ["Pending", "Contacted", "Scheduled"] as const;
/** Scope: Lead Status (score band) */
export const LEAD_SCORE_BANDS = ["Hot", "Warm", "Cold"] as const;

export const SCORING_CATEGORIES = [
  "Academic",
  "Work Experience",
  "Program Fit",
  "Engagement",
  "Geography",
  "Email Bounce / Invalid",
  "Other",
] as const;

export const ENGAGEMENT_TYPES: { value: string; label: string }[] = [
  { value: "webinar", label: "Attended webinar" },
  { value: "email_reply", label: "Replied to email" },
  { value: "email_open", label: "Opened email" },
  { value: "email_click", label: "Clicked email link" },
  { value: "event_attended", label: "Attended event" },
  { value: "chat", label: "Chatbot conversation" },
  { value: "form_submission", label: "Form submission" },
  { value: "call_answered", label: "Answered call" },
  { value: "email_bounce", label: "Email bounced" },
];

export interface TouchPoint {
  at: string;
  channelSource?: string | null;
  sourceType?: string | null;
  subSource?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmTerm?: string | null;
  utmContent?: string | null;
  campaignId?: string | null;
  campaignName?: string | null;
  formName?: string | null;
  submissionUrl?: string | null;
  referrerUrl?: string | null;
  createdFrom?: string | null;
}

export interface ScoreBreakdownItem {
  ruleId: string;
  category: string;
  label: string;
  points: number;
  scoreType: string;
}

export interface LeadActivity {
  id: string;
  leadId: string;
  actorId?: string | null;
  actorName?: string | null;
  previousAssignedToName?: string | null;
  newAssignedToName?: string | null;
  mergedFromLeadId?: string | null;
  action: string;
  content?: string | null;
  previousStatus?: string | null;
  newStatus?: string | null;
  previousAssignedTo?: string | null;
  newAssignedTo?: string | null;
  metadata?: Record<string, any> | null;
  createdAt: string;
}

// ---- Scoring -------------------------------------------------------------

export type RuleOperator =
  | "gte"
  | "lte"
  | "gt"
  | "lt"
  | "eq"
  | "neq"
  | "in"
  | "not_in"
  | "contains"
  | "exists"
  | "is_true";

export const RULE_OPERATORS: { value: RuleOperator; label: string }[] = [
  { value: "gte", label: "≥ (at least)" },
  { value: "gt", label: "> (more than)" },
  { value: "lte", label: "≤ (at most)" },
  { value: "lt", label: "< (less than)" },
  { value: "eq", label: "= (equals)" },
  { value: "neq", label: "≠ (not equal)" },
  { value: "in", label: "is one of" },
  { value: "not_in", label: "is not one of" },
  { value: "contains", label: "contains" },
  { value: "exists", label: "is provided" },
  { value: "is_true", label: "is true" },
];

export interface ScoringRule {
  id: string;
  category: string;
  label: string;
  attribute: string;
  operator: RuleOperator;
  value: string | null;
  points: number;
  scoreType: "academic" | "engagement" | "profile";
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

export type ScoringRuleInput = Omit<ScoringRule, "id" | "createdAt" | "sortOrder"> & { sortOrder?: number };

export interface ScoringAttribute {
  key: string;
  label: string;
  kind: "number" | "text" | "list" | "boolean";
}

export interface ScoringMeta {
  attributes: ScoringAttribute[];
  categories: string[];
}

export interface ScoringSummary {
  hot: number;
  warm: number;
  cold: number;
  unscored: number;
  averageScore: number;
}

export interface LeadManagementSettings {
  id: string;
  hotThreshold: number;
  warmThreshold: number;
  defaultDistribution: "round_robin" | "load_based";
  defaultAssigneeRole: string;
  reentryBlockThreshold: number;
  duplicateFlagThreshold: number;
}

// ---- Routing -------------------------------------------------------------

export const ROUTING_RULE_TYPES: { value: RoutingRuleType; label: string; hint: string }[] = [
  { value: "geography", label: "Geography", hint: "e.g. Country = India → specific counselor" },
  { value: "program", label: "Program Interest", hint: "e.g. MBA → program specialist" },
  { value: "lead_score", label: "Lead Score", hint: "e.g. Score ≥ 25 → senior counselor" },
  { value: "load_balancing", label: "Load Balancing", hint: "Round-robin or load-based distribution" },
];

export type RoutingRuleType = "geography" | "program" | "lead_score" | "load_balancing";

export interface RoutingRule {
  id: string;
  name: string;
  ruleType: RoutingRuleType;
  field: string | null;
  operator: string;
  value: string | null;
  assigneeIds: string[];
  assigneeRole: string | null;
  distribution: "round_robin" | "load_based";
  priority: number;
  isActive: boolean;
  description?: string;
  createdAt: string;
}

export type RoutingRuleInput = Partial<Omit<RoutingRule, "id" | "createdAt" | "description">> & {
  name: string;
  ruleType: RoutingRuleType;
};

// ---- Duplicates ----------------------------------------------------------

export interface SlimLead {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  channelSource?: string | null;
  createdFrom?: string | null;
  createdAt: string;
  status: string;
  score?: number | null;
  scoreBand?: string | null;
  assignedTo?: string | null;
  assignedToUser?: { id: string; name: string } | null;
}

export interface DuplicatePair {
  duplicate: SlimLead;
  master: SlimLead | null;
  confidence: number | null;
  reason: string | null;
}

export interface MergePreviewField {
  key: string;
  label: string;
  masterValue: any;
  duplicateValue: any;
  masterDisplay: any;
  duplicateDisplay: any;
  differs: boolean;
  suggested: "master" | "duplicate";
}

export interface MergePreview {
  master: any;
  duplicate: any;
  fields: MergePreviewField[];
  activitiesToMove: number;
  confidence: number | null;
  reasons: string[];
}

// ---- Campaigns -----------------------------------------------------------

export const CAMPAIGN_STATUSES = ["Active", "Paused", "Completed"] as const;

export interface Campaign {
  id: string;
  name: string;
  utmCampaign: string | null;
  sourceType: string;
  subSource: string | null;
  startDate: string | null;
  endDate: string | null;
  cost: number;
  currency: string;
  status: string;
  description: string | null;
  createdAt: string;
  leadCount: number;
  convertedCount: number;
  hotCount: number;
  costPerLead: number | null;
  costPerConversion: number | null;
  conversionRate: number;
  mappedLeads?: number;
}

export interface CampaignInput {
  name: string;
  utmCampaign?: string | null;
  sourceType: string;
  subSource?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  cost?: number;
  currency?: string;
  status?: string;
  description?: string | null;
}

export interface PerformanceRow {
  key: string;
  leads: number;
  converted: number;
  hot: number;
  reentries: number;
  conversionRate: number;
  cost?: number;
  costPerLead?: number | null;
}

export interface ChannelPerformance {
  attribution: "first" | "last";
  totals: {
    leads: number;
    converted: number;
    conversionRate: number;
    campaignSpend: number;
    campaignLeads: number;
    costPerLead: number | null;
  };
  byChannel: PerformanceRow[];
  bySourceType: PerformanceRow[];
  bySubSource: PerformanceRow[];
  byCampaign: Campaign[];
}

// ---- Lead capture integrations ------------------------------------------

export interface PortalIntegration {
  id: string;
  name: string;
  key: string;
  isActive: boolean;
  createdAt: string;
  lastReceivedAt?: string | null;
  leadsReceived?: number;
  endpointPath: string;
}

export interface LeadCaptureSettings {
  id: string;
  apiKey: string;
  enabledChannels: Record<string, boolean>;
  facebookVerifyToken: string | null;
  facebookAppSecret: string | null;
  facebookPageAccessToken: string | null;
  facebookPageId: string | null;
  facebookFormIds: string[];
  facebookGraphVersion: string;
  facebookLastSyncAt: string | null;
  linkedinClientSecret: string | null;
  linkedinAccessToken: string | null;
  linkedinApiVersion: string;
  portals: PortalIntegration[];
  chatbotMinMessages: number;
  chatbotRequireContact: boolean;
  configured: {
    facebook: boolean;
    facebookSignature: boolean;
    linkedin: boolean;
    linkedinSignature: boolean;
  };
  endpoints: {
    web: string;
    api: string;
    facebook: string;
    linkedin: string;
    chatbot: string;
    portal: string;
    eventRegistration: string;
  };
  updatedAt: string;
}

export type LeadCaptureSettingsInput = Partial<{
  enabledChannels: Record<string, boolean>;
  facebookVerifyToken: string | null;
  facebookAppSecret: string | null;
  facebookPageAccessToken: string | null;
  facebookPageId: string | null;
  facebookFormIds: string[];
  facebookGraphVersion: string;
  linkedinClientSecret: string | null;
  linkedinAccessToken: string | null;
  linkedinApiVersion: string;
  chatbotMinMessages: number;
  chatbotRequireContact: boolean;
}>;

export const CAPTURE_EVENT_TYPES = ["Education Fair", "Webinar", "Open House", "Campus Event", "Seminar", "Other"] as const;

export interface CaptureEvent {
  id: string;
  name: string;
  eventType: string;
  eventDate: string | null;
  venue: string | null;
  description: string | null;
  slug: string;
  courseId: string | null;
  campaignId: string | null;
  isActive: boolean;
  registrationCount: number;
  importedCount: number;
  createdAt: string;
}

export interface CaptureEventInput {
  name: string;
  eventType: string;
  eventDate?: string | null;
  venue?: string | null;
  description?: string | null;
  courseId?: string | null;
  campaignId?: string | null;
  isActive?: boolean;
}

export interface ImportBatch {
  id: string;
  channel: string;
  sourceName: string | null;
  eventId: string | null;
  fileName: string | null;
  totalRows: number;
  created: number;
  reentries: number;
  duplicatesFlagged: number;
  failed: number;
  errors: { row: number; message: string }[];
  createdAt: string;
}

export interface ImportCsvInput {
  csv: string;
  channel: "Portal" | "Event" | "Web" | "Social" | "Chatbot";
  sourceName?: string;
  eventId?: string;
  fileName?: string;
  campaignId?: string;
}

export interface ChatbotConversation {
  id: string;
  externalId: string;
  botName: string | null;
  visitorName: string | null;
  email: string | null;
  phone: string | null;
  intent: string | null;
  visitorMessageCount: number;
  status: string;
  qualificationReason: string | null;
  leadId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FacebookSyncResult {
  fetched: number;
  created: number;
  reentries: number;
  duplicatesFlagged: number;
  failed: number;
  errors: string[];
}
