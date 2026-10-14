// Types for Communication Management (scope: Email campaigns, SMS & WhatsApp,
// Call management, Templates, Communication history).

export const INTERACTION_CHANNELS = ["Email", "SMS", "WhatsApp", "Call", "System"] as const;
export const INTERACTION_DIRECTIONS = ["Inbound", "Outbound", "System Generated"] as const;
export const DELIVERY_STATUSES = ["Sent", "Read", "Failed"] as const;

export type InteractionChannel = (typeof INTERACTION_CHANNELS)[number];

export interface TimelineEntry {
  interactionId: string;
  applicantId: string | null;
  leadId: string | null;
  applicationNo: string | null;
  applicantName: string | null;
  channel: InteractionChannel | string;
  relatedRecordId: string | null;
  relatedRecordType: string | null;
  dateTime: string;
  direction: string;
  handledBy: string | null;
  subject: string;
  summary: string | null;
  content: string | null;
  attachments: { name: string; url: string; type?: string }[];
  deliveryStatus: string;
  rawStatus: string | null;
  failureReason: string | null;
  actionTaken: string | null;
  nextFollowUpDate: string | null;
  assignedStaffId: string | null;
  assignedStaff: string | null;
  remarks: string | null;
  recipient: string | null;
  category: string | null;
  editable: boolean;
  source: "communication" | "application_activity" | "lead_activity";
}

export interface TimelineApplicant {
  applicationId: string | null;
  leadId: string | null;
  applicationNo: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  program: string | null;
}

export interface TimelineResponse {
  applicant: TimelineApplicant | null;
  entries: TimelineEntry[];
}

export interface CommunicationStats {
  total: number;
  byChannel: Record<string, number>;
  byStatus: Record<string, number>;
  followUpsDue: number;
}

export interface ComposeRecipient {
  applicationId?: string;
  leadId?: string;
  email?: string;
  phone?: string;
  countryCode?: string;
  name?: string;
}

export interface ComposePayload {
  channel: "Email" | "SMS" | "WhatsApp";
  recipients: ComposeRecipient[];
  templateId?: string;
  subject?: string;
  body: string;
  header?: string;
  footer?: string;
  signature?: string;
  category?: string;
  attachments?: { name: string; url: string; type?: string }[];
  messageType?: string;
  mediaUrl?: string;
  ctaLink?: string;
  triggerEvent?: string;
  priority?: string;
  scheduledAt?: string;
  timeZone?: string;
}

export interface ComposeResult {
  channel: string;
  scheduled: boolean;
  total: number;
  succeeded: number;
  failed: number;
  results: { recipient: ComposeRecipient; success: boolean; id?: string; error?: string }[];
}

// ── SMS & WhatsApp ────────────────────────────────────────────────────────
export const MESSAGE_TYPES = ["Reminder", "OTP", "Status", "Alert", "Marketing"] as const;
export const MESSAGE_TRIGGER_EVENTS = ["Deadline", "Missing Documents", "Offer Release"] as const;
export const MESSAGE_PRIORITIES = ["High", "Normal", "Low"] as const;
export const MESSAGE_SENT_STATUSES = ["Scheduled", "Queued", "Sent", "Delivered", "Failed", "Blocked"] as const;

export interface MessageLog {
  id: string;
  organizationId: string;
  channel: "SMS" | "WhatsApp" | string;
  messageType: string;
  templateId: string | null;
  body: string;
  characterCount: number;
  mediaUrl: string | null;
  ctaLink: string | null;
  applicationId: string | null;
  leadId: string | null;
  applicationNo: string | null;
  recipientName: string | null;
  mobileNumber: string;
  countryCode: string;
  preferredLanguage: string | null;
  consentStatus: string;
  triggerEvent: string | null;
  scheduledAt: string | null;
  priority: string;
  timeZone: string | null;
  sentStatus: string;
  readStatus: string | null;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  failureReason: string | null;
  provider: string | null;
  providerMessageId: string | null;
  attempts: number;
  sentByName: string | null;
  direction: string;
  createdAt: string;
  updatedAt: string;
}

export interface MessageStats {
  total: number;
  sent: number;
  delivered: number;
  failed: number;
  scheduled: number;
  blocked: number;
  read: number;
  byChannel: Record<string, number>;
}

export interface MessagingSettings {
  smsProvider: string | null;
  whatsappProvider: string | null;
  defaultCountryCode: string;
  defaultTimeZone: string;
  requireOptInForMarketing: boolean;
  requireOptInForAll: boolean;
  twilioAccountSid: string | null;
  twilioAuthToken: string;
  twilioAuthTokenSet?: boolean;
  twilioAuthTokenHint?: string | null;
  twilioSmsFrom: string | null;
  twilioMessagingServiceSid: string | null;
  twilioWhatsappFrom: string | null;
  gupshupApiKey: string;
  gupshupApiKeySet?: boolean;
  gupshupApiKeyHint?: string | null;
  gupshupSourceNumber: string | null;
  gupshupAppName: string | null;
  msg91AuthKey: string;
  msg91AuthKeySet?: boolean;
  msg91AuthKeyHint?: string | null;
  msg91SenderId: string | null;
  msg91FlowId: string | null;
  msg91DltEntityId: string | null;
  webhookUrls: { twilio: string; gupshup: string; msg91: string };
  smsReady: boolean;
  whatsappReady: boolean;
}

export interface MessagingConsent {
  id: string;
  mobileNumber: string;
  countryCode: string;
  channel: string;
  status: string;
  source: string | null;
  preferredLanguage: string | null;
  applicationId: string | null;
  leadId: string | null;
  updatedAt: string;
}

// ── Email campaigns ───────────────────────────────────────────────────────
export const CAMPAIGN_TYPES = ["Manual", "Automated", "Drip", "Trigger-based"] as const;
export const CAMPAIGN_OBJECTIVES = ["Lead Nurture", "Application Reminder", "Interview", "Offer", "Fee Reminder"] as const;
export const TARGET_AUDIENCES = ["Prospects", "Applicants", "Admitted", "Waitlisted"] as const;
export const SEGMENT_CRITERIA = ["Incomplete Application", "Paid Fees", "Attended Interview"] as const;
export const CAMPAIGN_STATUSES = ["Draft", "Active", "Paused", "Completed"] as const;
export const CAMPAIGN_TRIGGER_EVENTS = ["Signup", "Form Submission", "Deadline Missed"] as const;
export const CAMPAIGN_FREQUENCIES = ["One-time", "Daily", "Weekly", "Event-based"] as const;
export const STOP_CONDITIONS = ["Form Submitted", "Fee Paid"] as const;
export const CAMPAIGN_ATTACHMENT_TYPES = ["Prospectus", "Offer Letter", "Brochure", "Other"] as const;
export const CAMPAIGN_VARIABLES = ["{{First_Name}}", "{{Name}}", "{{Program}}", "{{Application_No}}", "{{Date}}"] as const;

export interface EmailCampaign {
  id: string;
  campaignNo: number;
  campaignCode: string;
  organizationId: string;
  name: string;
  campaignType: string;
  objective: string;
  targetCourseId: string | null;
  targetProgram: string | null;
  academicYear: string | null;
  intakeTerm: string | null;
  targetAudience: string[];
  segmentCriteria: string[];
  createdBy: string | null;
  createdByName: string | null;
  status: string;
  templateId: string | null;
  subject: string;
  preHeader: string | null;
  htmlBody: string;
  textBody: string | null;
  attachments: { name: string; url: string; type?: string }[];
  personalizationVariables: string[];
  language: string;
  footerAddress: string | null;
  footerText: string | null;
  senderName: string | null;
  triggerEvent: string | null;
  deadlineAt: string | null;
  scheduledAt: string | null;
  frequency: string;
  maxSendsPerRecipient: number;
  timeZone: string;
  stopConditions: string[];
  endAt: string | null;
  nextRunAt: string | null;
  lastRunAt: string | null;
  activatedAt: string | null;
  completedAt: string | null;
  isRunning: boolean;
  totalSent: number;
  deliveredCount: number;
  failedCount: number;
  bounceCount: number;
  openCount: number;
  clickCount: number;
  unsubscribeCount: number;
  skippedCount: number;
  lastError: string | null;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  deliveryRate: number;
  unsubscribeRate: number;
  mode: "event" | "schedule";
  createdAt: string;
  updatedAt: string;
}

export type EmailCampaignInput = Partial<
  Pick<
    EmailCampaign,
    | "name"
    | "campaignType"
    | "objective"
    | "targetCourseId"
    | "targetProgram"
    | "academicYear"
    | "intakeTerm"
    | "targetAudience"
    | "segmentCriteria"
    | "templateId"
    | "subject"
    | "preHeader"
    | "htmlBody"
    | "textBody"
    | "attachments"
    | "language"
    | "footerAddress"
    | "footerText"
    | "senderName"
    | "triggerEvent"
    | "frequency"
    | "maxSendsPerRecipient"
    | "timeZone"
    | "stopConditions"
  >
> & { scheduledAt?: string | null; deadlineAt?: string | null; endAt?: string | null };

export interface CampaignRecipient {
  id: string;
  campaignId: string;
  applicationId: string | null;
  leadId: string | null;
  applicationNo: string | null;
  audienceType: string | null;
  email: string;
  name: string | null;
  status: string;
  sendCount: number;
  lastSentAt: string | null;
  deliveredAt: string | null;
  firstOpenedAt: string | null;
  openCount: number;
  firstClickedAt: string | null;
  clickCount: number;
  bouncedAt: string | null;
  unsubscribedAt: string | null;
  stoppedReason: string | null;
  failureReason: string | null;
}

export interface CampaignStats {
  campaign: EmailCampaign;
  breakdown: Record<string, number>;
  daily: { day: string; sent: number; opened: number; clicked: number }[];
  recipients: { data: CampaignRecipient[]; total: number; page: number; limit: number };
}

export interface CampaignOverview {
  campaigns: number;
  active: number;
  totalSent: number;
  delivered: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  unsubscribed: number;
  suppressed: number;
}

export interface AudienceMember {
  applicationId: string | null;
  leadId: string | null;
  applicationNo: string | null;
  name: string | null;
  email: string;
  program: string | null;
  audienceType: string;
}

export interface AudiencePreview {
  total: number;
  suppressed: number;
  byAudience: Record<string, number>;
  sample: AudienceMember[];
}

export interface EmailSuppression {
  id: string;
  email: string;
  reason: string;
  campaignId: string | null;
  note: string | null;
  createdAt: string;
}

// ── Calls ─────────────────────────────────────────────────────────────────
export const CALL_TYPES = ["Inbound", "Outbound", "Missed"] as const;
export const CALL_STATUSES = ["Answered", "Not Answered", "Busy", "Dropped"] as const;
export const CALL_OUTCOMES = ["Interested", "Not Interested", "Follow-up Required"] as const;

export interface CallLog {
  id: string;
  callNo: number;
  callCode: string;
  organizationId: string;
  applicationId: string | null;
  leadId: string | null;
  applicationNo: string | null;
  applicantName: string | null;
  contactNumber: string;
  countryCode: string;
  programInterested: string | null;
  callType: string;
  callStartTime: string | null;
  callEndTime: string | null;
  durationSeconds: number;
  durationLabel: string;
  callStatus: string;
  agentUserId: string | null;
  agentName: string | null;
  department: string | null;
  extensionDeviceId: string | null;
  recordingUrl: string | null;
  transcription: string | null;
  agentNotes: string | null;
  callOutcome: string | null;
  followUpDate: string | null;
  autoSmsAfterMissedCall: boolean;
  autoSmsSentAt: string | null;
  autoSmsError: string | null;
  autoCreateFollowUpTask: boolean;
  followUpTaskCreatedAt: string | null;
  autoTagApplicant: boolean;
  tags: string[];
  provider: string;
  providerCallId: string | null;
  providerStatus: string | null;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CallStats {
  total: number;
  inbound: number;
  outbound: number;
  missed: number;
  answered: number;
  notAnswered: number;
  totalDurationSeconds: number;
  avgDurationSeconds: number;
  followUpsDue: number;
  interested: number;
}

export interface CallInput {
  applicationId?: string | null;
  leadId?: string | null;
  applicantName?: string | null;
  contactNumber?: string;
  countryCode?: string;
  programInterested?: string | null;
  callType?: string;
  callStartTime?: string | null;
  callEndTime?: string | null;
  durationSeconds?: number;
  callStatus?: string;
  timeZone?: string;
  agentUserId?: string | null;
  agentName?: string | null;
  department?: string | null;
  extensionDeviceId?: string | null;
  recordingUrl?: string | null;
  transcription?: string | null;
  agentNotes?: string | null;
  callOutcome?: string | null;
  followUpDate?: string | null;
  autoSmsAfterMissedCall?: boolean;
  autoCreateFollowUpTask?: boolean;
  autoTagApplicant?: boolean;
  tags?: string[];
}

export interface TelephonySettings {
  provider: string | null;
  defaultCountryCode: string;
  recordCalls: boolean;
  inboundForwardNumber: string | null;
  defaultDepartment: string | null;
  exotelAccountSid: string | null;
  exotelApiKey: string | null;
  exotelApiToken: string;
  exotelApiTokenSet?: boolean;
  exotelApiTokenHint?: string | null;
  exotelSubdomain: string;
  exotelCallerId: string | null;
  twilioAccountSid: string | null;
  twilioAuthToken: string;
  twilioAuthTokenSet?: boolean;
  twilioAuthTokenHint?: string | null;
  twilioCallerId: string | null;
  autoSmsAfterMissedCall: boolean;
  missedCallSmsText: string | null;
  defaultMissedCallSmsText?: string;
  autoCreateFollowUpTask: boolean;
  followUpDays: number;
  autoTagApplicant: boolean;
  tagRules: { keyword: string; tag: string }[];
  agentLines: { userId: string; phone?: string | null; extension?: string | null; department?: string | null }[];
  webhookUrls: {
    exotelStatus: string;
    exotelInbound: string;
    twilioStatus: string;
    twilioRecording: string;
    twilioInbound: string;
  };
  ready: boolean;
}

/** Common IANA time zones offered in scheduling forms. */
export const TIME_ZONES = [
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Singapore",
  "Asia/Kathmandu",
  "Asia/Dhaka",
  "Europe/London",
  "Europe/Berlin",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "Australia/Sydney",
  "UTC",
] as const;

// ── Templates & personalization ───────────────────────────────────────────
export const TEMPLATE_TYPES = ["Email", "SMS", "WhatsApp", "Call Script"] as const;
export const TEMPLATE_CATEGORIES = ["Reminder", "Offer", "Rejection", "Interview", "Fee"] as const;
export const TEMPLATE_STATUSES = ["draft", "approved", "archived"] as const;
export const TEMPLATE_MERGE_FIELDS = ["{{Name}}", "{{Program}}", "{{Date}}", "{{Link}}", "{{Application_ID}}"] as const;
export const TEMPLATE_LANGUAGES = ["English", "Hindi", "Tamil", "Telugu", "Kannada", "Malayalam", "Marathi", "Bengali", "Gujarati", "Arabic", "French", "Spanish"] as const;
export const EDITABLE_ROLES = [
  { value: "org_admin", label: "Organization Admin" },
  { value: "application_manager", label: "Application Manager" },
  { value: "lead_manager", label: "Lead Manager" },
  { value: "counselor", label: "Counselor" },
] as const;

export interface CommTemplate {
  id: string;
  organizationId?: string | null;
  name: string;
  category: string;
  categoryId?: string | null;
  templateCategory?: string | null;
  channel: string;
  subject: string;
  body: string;
  description?: string | null;
  header?: string | null;
  footer?: string | null;
  signature?: string | null;
  variables: string[];
  language: string;
  status: string;
  versionNumber: number;
  isDefault?: boolean;
  usageCount?: number;
  editableByRoles: string[];
  createdBy?: string | null;
  createdByName?: string | null;
  updatedByName?: string | null;
  approvedBy?: string | null;
  approvedByName?: string | null;
  approvedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CommTemplateInput {
  name: string;
  category?: string;
  categoryId?: string;
  templateCategory?: string;
  channel?: string;
  subject?: string;
  body: string;
  description?: string;
  header?: string;
  footer?: string;
  signature?: string;
  language?: string;
  status?: string;
  editableByRoles?: string[];
  isDefault?: boolean;
}
