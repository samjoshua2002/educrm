// Application Management module (scope pages 14-21): master, payments,
// documents, status tracker, reminders.

export const APPLICATION_STATUSES = ["Started", "Submitted", "Under Review", "Approved", "Rejected"] as const;
export const APPLICATION_SOURCES = ["Website", "Agent", "Campaign"] as const;
export const TRACKER_STAGES = [
  "Application Started",
  "Fee Paid",
  "Documents Uploaded",
  "Under Review",
  "Verified",
  "Shortlisted",
  "Approved",
  "Rejected",
  "Waitlisted",
] as const;
export const DOCUMENT_TYPES = ["ID Proof", "Marksheets", "Certificates"] as const;
export const DOCUMENT_VERIFICATION_STATUSES = ["Pending", "Approved", "Rejected"] as const;
export const PAYMENT_STATUSES = ["Pending", "Success", "Failed", "Refunded"] as const;
export const RECONCILIATION_STATUSES = ["Matched", "Unmatched"] as const;
export const REFUND_STATUSES = ["Not Initiated", "In Progress", "Completed"] as const;
export const PAYMENT_GATEWAYS = ["razorpay", "stripe", "payu", "paytm"] as const;
export const GATEWAY_LABELS: Record<string, string> = {
  razorpay: "Razorpay",
  stripe: "Stripe",
  payu: "PayU",
  paytm: "Paytm",
  offline: "Offline",
};
export const PAYMENT_METHODS = ["UPI", "Card", "Net Banking", "Wallet"] as const;
export const REMINDER_CHANNELS = ["Email", "SMS", "WhatsApp", "In-app"] as const;

// ---------------------------------------------------------------------------
// Status tracker
// ---------------------------------------------------------------------------

export interface TrackerMeta {
  stages: string[];
  steps: string[];
  applicationStatuses: string[];
  applicationSources: string[];
  documentTypes: string[];
}

export interface TrackerApplication {
  id: string;
  applicationId: string;
  applicationNo: string;
  applicantId: string | null;
  applicantName: string;
  email: string;
  phone: string;
  programApplied: string | null;
  courseId: string | null;
  academicYear: string | null;
  applicationStatus: string;
  formStatus: string;
  currentStage: string;
  stageUpdatedAt: string | null;
  applicationStartDate: string;
  applicationSubmissionDate: string | null;
  assignedCounsellorId: string | null;
  assignedCounsellorName: string | null;
  lastUpdated: string;
  applicationSource: string | null;
  paymentStatus: string | null;
  verificationStatus: string | null;
  slaDays: number | null;
  slaDueAt: string | null;
  slaBreached: boolean;
}

export interface TrackerDashboard {
  data: TrackerApplication[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  stageCounts: Record<string, number>;
  slaBreachedCount: number;
}

export interface TrackerFilters {
  page?: number;
  limit?: number;
  search?: string;
  stage?: string;
  applicationStatus?: string;
  source?: string;
  counsellorId?: string;
  academicYear?: string;
  slaBreached?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface StatusLogEntry {
  id: string;
  statusLogId: number;
  applicationId: string;
  previousStatus: string | null;
  currentStatus: string;
  statusChangedBy: string;
  changedByType: string;
  statusChangeDate: string;
  internalRemarks?: string | null;
  applicantVisible: boolean;
  slaDays: number | null;
  slaDueAt: string | null;
  slaBreached: boolean;
  isCurrent: boolean;
  source?: string;
}

export interface DocumentProgress {
  required: string[];
  uploaded: string[];
  approved: string[];
  missing: string[];
  rejected: string[];
  allUploaded: boolean;
  allApproved: boolean;
  anyReviewed: boolean;
}

export interface ApplicationProgress {
  applicationId: string;
  applicationNo: string;
  applicationStatus: string;
  currentStage: string;
  currentStep: number;
  isFinal: boolean;
  percent: number;
  steps: { key: number; label: string; state: "completed" | "current" | "upcoming"; reachedAt: string | null }[];
  paymentStatus: string | null;
  documents: DocumentProgress;
  nextAction: string | null;
}

export interface WorkflowSettings {
  id: string;
  organizationId: string;
  stageSlaDays: Record<string, number>;
  requiredDocumentTypes: string[];
  maxDocumentSizeMb: number;
  notifyApplicantOnStageChange: boolean;
}

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

export interface ApplicationDocumentRecord {
  id: string;
  documentId: number;
  applicationId: string;
  documentType: string;
  documentName: string;
  documentUrl: string;
  mimeType: string;
  fileSize: number;
  uploadDate: string;
  uploadedBy: string;
  uploadedByType: string;
  verificationStatus: "Pending" | "Approved" | "Rejected";
  verifiedBy: string | null;
  verificationDate: string | null;
  rejectionReason: string | null;
  reuploadRequired: boolean;
  documentVersion: number;
  isLatest: boolean;
  applicationNo?: string;
  applicantName?: string;
}

export interface DocumentRequirements {
  documentTypes: string[];
  requiredDocumentTypes: string[];
  verificationStatuses: string[];
  allowedMimeTypes: string[];
  allowedExtensions: string[];
  maxSizeMb: number;
}

export interface ApplicationDocumentsResponse {
  applicationId: string;
  applicationNo: string;
  documents: ApplicationDocumentRecord[];
  progress: DocumentProgress;
  requirements: DocumentRequirements;
}

export interface DocumentLogEntry {
  id: string;
  documentId: string;
  documentType: string;
  documentVersion: number;
  action: string;
  previousStatus: string | null;
  newStatus: string | null;
  remarks: string | null;
  actorName: string | null;
  actorRole: string | null;
  createdAt: string;
}

export interface DocumentQueueResponse {
  items: ApplicationDocumentRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  statusCounts: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Reminders
// ---------------------------------------------------------------------------

export interface ReminderMeta {
  reminderTypes: string[];
  triggerEvents: string[];
  channels: string[];
  reminderStatuses: string[];
  applicantResponses: string[];
}

export interface ReminderRule {
  id: string;
  organizationId: string;
  scenario: string;
  label: string;
  reminderType: string;
  triggerEvent: string;
  description?: string;
  isEnabled: boolean;
  channels: string[];
  templateId: string | null;
  firstReminderAfterHours: number;
  frequencyHours: number;
  maxAttempts: number;
  autoClose: boolean;
  deadlineDate: string | null;
  deadlineDaysBefore: number;
}

export interface ReminderRecord {
  id: string;
  reminderId: number;
  applicationId: string;
  applicationNo?: string;
  applicantName?: string;
  scenario: string;
  scenarioLabel: string;
  reminderType: string;
  triggerEvent: string;
  reminderChannels: string[];
  reminderTemplateId: string | null;
  reminderTemplate: string | null;
  reminderSentDate: string | null;
  reminderStatus: "Sent" | "Failed" | null;
  attemptCount: number;
  nextScheduledDate: string | null;
  applicantResponse: "Completed" | "No Action" | null;
  autoClose: boolean;
  isClosed: boolean;
  closedAt: string | null;
  lastError: string | null;
  channelResults: Record<string, { success: boolean; error?: string; at: string }> | null;
  createdAt: string;
}

export interface RemindersResponse {
  items: ReminderRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  stats: { total: number; sent: number; failed: number; completed: number; open: number };
}

export interface ApplicationReminders {
  preferences: { remindersOptIn: boolean; optOutChannels: string[] };
  reminders: ReminderRecord[];
}

export interface ReminderTemplateOption {
  id: string;
  name: string;
  channel: string;
  subject: string | null;
  category: string | null;
}

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------

export interface GatewayCredentialField {
  key: string;
  label: string;
  secret: boolean;
  required: boolean;
}

export interface GatewaySetting {
  gateway: string;
  label: string;
  displayName: string | null;
  isEnabled: boolean;
  isDefault: boolean;
  mode: "test" | "live";
  currency: string;
  feeAmount: number | null;
  methods: string[];
  credentials: Record<string, string>;
  fields: GatewayCredentialField[];
  configured: boolean;
  usingServerKeys: boolean;
  active: boolean;
  lastTestedAt: string | null;
  lastTestResult: string | null;
  webhookPath: string;
}

export interface GatewaySettingsResponse {
  gateways: { gateway: string; label: string; fields: GatewayCredentialField[] }[];
  methods: string[];
  currencies: string[];
  webhookBaseUrl: string | null;
  settings: GatewaySetting[];
}

export interface AvailableGateway {
  gateway: string;
  label: string;
  isDefault: boolean;
  currency: string;
  amount: number;
  methods: string[];
  international: boolean;
  mode: string;
}

export interface AvailableGatewaysResponse {
  applicationId: string;
  applicationNo: string;
  paymentStatus: string;
  gateways: AvailableGateway[];
}

export type CheckoutAction =
  | { action: "razorpay_checkout"; gatewayOrderId: string; keyId: string; amountMinor: number; currency: string; methods: Record<string, boolean> }
  | { action: "redirect"; gatewayOrderId: string; url: string }
  | { action: "form_post"; gatewayOrderId: string; url: string; fields: Record<string, string> };

export interface CheckoutResponse {
  paymentId: string;
  paymentNo: number;
  gateway: string;
  gatewayLabel: string;
  amount: number;
  currency: string;
  checkout: CheckoutAction;
  prefill: { name?: string; email?: string; contact?: string };
  description: string;
}

export interface PaymentPublicView {
  paymentId: string;
  paymentNo: number;
  applicationId: string;
  purpose: string;
  gateway: string;
  gatewayLabel: string;
  amount: number;
  currency: string;
  status: "Pending" | "Success" | "Failed" | "Refunded";
  transactionId: string | null;
  method: string | null;
  paidAt: string | null;
  failureReason: string | null;
  refundStatus?: string;
  refundAmount?: number;
}

export interface PaymentAdminRecord {
  id: string;
  paymentNo: number;
  paymentId: string;
  applicationId: string;
  applicationNo: string;
  applicantName: string;
  applicantEmail: string;
  applicantPhone: string;
  program: string;
  campus: string;
  amount: number;
  currency: string;
  status: "pending" | "paid" | "failed" | "refunded";
  paymentStatus: "Pending" | "Success" | "Failed" | "Refunded";
  purpose: "application_fee" | "seat_booking_fee";
  gateway: string;
  gatewayLabel: string;
  gatewayOrderId: string | null;
  transactionId: string | null;
  method: string | null;
  isInternational: boolean;
  reconciliationStatus: "Matched" | "Unmatched";
  reconciliationNotes: string | null;
  reconciledAt: string | null;
  gatewayStatus: string | null;
  gatewayAmount: number | null;
  gatewayCheckedAt: string | null;
  refundStatus: "Not Initiated" | "In Progress" | "Completed";
  refundAmount: number;
  financeRemarks: string | null;
  failureReason: string | null;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  createdAt: string;
  paidAt: string | null;
}

export interface PaymentRefundRecord {
  id: string;
  amount: number;
  refundType: "full" | "partial";
  status: "In Progress" | "Completed" | "Failed";
  gateway: string;
  gatewayRefundId: string | null;
  reference: string;
  reason: string | null;
  error: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReconciliationSummary {
  total: number;
  matched: number;
  unmatched: number;
  successCount: number;
  collectedInr: number;
  collectedOther: number;
  refundedInr: number;
  refundsInProgress: number;
  mismatchedAmount: number;
  byGateway: { gateway: string; label: string; count: number; collected: number; matched: number; unmatched: number }[];
}

export interface ReconciliationResponse {
  data: PaymentAdminRecord[];
  total: number;
  totalPages: number;
  page: number;
  limit: number;
  summary: ReconciliationSummary;
}

export interface ReconciliationFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  gateway?: string;
  reconciliationStatus?: string;
  refundStatus?: string;
  dateFrom?: string;
  dateTo?: string;
}
