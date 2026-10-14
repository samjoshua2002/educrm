// Types for the Admissions Decision & Offer Management module.
// Mirror admissions-tenant-api-main/src/modules/admissions-decisions.

// ---------------------------------------------------------------------------
// Picklists (scope pages 29-33)
// ---------------------------------------------------------------------------

export type DecisionStage =
  | "under_review"
  | "committee_review"
  | "final_approval"
  | "decision_released";
export type FinalDecision = "offer_made" | "waitlisted" | "rejected";
export type ApprovalStatus = "pending" | "approved" | "rejected";
export type OfferType = "regular" | "conditional" | "scholarship";
export type OfferStatus =
  | "draft"
  | "generated"
  | "sent"
  | "expired"
  | "withdrawn";
export type AcceptanceStatus = "pending" | "accepted" | "declined" | "expired";
export type FeePaymentStatus = "pending" | "paid" | "failed" | "waived";
export type EnrollmentStatus =
  | "not_enrolled"
  | "pending"
  | "confirmed"
  | "cancelled";
export type WaitlistStatus =
  | "active"
  | "offer_released"
  | "converted"
  | "closed";
export type MovementTrigger =
  | "offer_declined"
  | "offer_expired"
  | "offer_withdrawn"
  | "acceptance_expired"
  | "seat_added"
  | "manual_review";
export type RejectionReason =
  | "below_cutoff"
  | "incomplete_documents"
  | "failed_interview"
  | "seat_unavailable"
  | "other";
export type LetterTemplateType = "offer" | "rejection" | "waitlist";
export type LetterTemplateStatus = "active" | "inactive";

export const DECISION_STAGE_ORDER: DecisionStage[] = [
  "under_review",
  "committee_review",
  "final_approval",
  "decision_released",
];

export const DECISION_STAGE_LABELS: Record<DecisionStage, string> = {
  under_review: "Under Review",
  committee_review: "Committee Review",
  final_approval: "Final Approval",
  decision_released: "Decision Released",
};

export const FINAL_DECISION_LABELS: Record<FinalDecision, string> = {
  offer_made: "Offer Made",
  waitlisted: "Waitlisted",
  rejected: "Rejected",
};

export const APPROVAL_STATUS_LABELS: Record<ApprovalStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

export const OFFER_TYPE_LABELS: Record<OfferType, string> = {
  regular: "Regular",
  conditional: "Conditional",
  scholarship: "Scholarship",
};

export const OFFER_STATUS_LABELS: Record<OfferStatus, string> = {
  draft: "Draft",
  generated: "Generated",
  sent: "Sent",
  expired: "Expired",
  withdrawn: "Withdrawn",
};

export const ACCEPTANCE_STATUS_LABELS: Record<AcceptanceStatus, string> = {
  pending: "Pending",
  accepted: "Accepted",
  declined: "Declined",
  expired: "Expired",
};

export const FEE_PAYMENT_STATUS_LABELS: Record<FeePaymentStatus, string> = {
  pending: "Pending",
  paid: "Paid",
  failed: "Failed",
  waived: "Waived",
};

export const ENROLLMENT_STATUS_LABELS: Record<EnrollmentStatus, string> = {
  not_enrolled: "Not Enrolled",
  pending: "Pending",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
};

export const WAITLIST_STATUS_LABELS: Record<WaitlistStatus, string> = {
  active: "Active",
  offer_released: "Offer Released",
  converted: "Converted",
  closed: "Closed",
};

export const MOVEMENT_TRIGGER_LABELS: Record<MovementTrigger, string> = {
  offer_declined: "Offer Declined",
  offer_expired: "Offer Expired",
  offer_withdrawn: "Offer Withdrawn",
  acceptance_expired: "Acceptance Expired",
  seat_added: "Seat Added",
  manual_review: "Manual Review",
};

export const REJECTION_REASON_LABELS: Record<RejectionReason, string> = {
  below_cutoff: "Below Cutoff",
  incomplete_documents: "Incomplete Documents",
  failed_interview: "Failed Interview",
  seat_unavailable: "Seat Unavailable",
  other: "Other",
};

export const LETTER_TEMPLATE_TYPE_LABELS: Record<LetterTemplateType, string> = {
  offer: "Offer",
  rejection: "Rejection",
  waitlist: "Waitlist",
};

// Shared badge colours (same palette as the other organization pages).
export const TONE = {
  zinc: "bg-zinc-500/10 text-zinc-700 dark:bg-zinc-500/20 dark:text-zinc-300",
  blue: "bg-blue-500/10 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
  amber:
    "bg-amber-500/10 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  purple:
    "bg-purple-500/10 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300",
  green:
    "bg-green-500/10 text-green-700 dark:bg-green-500/20 dark:text-green-300",
  yellow:
    "bg-yellow-500/10 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300",
  red: "bg-red-500/10 text-red-700 dark:bg-red-500/20 dark:text-red-300",
} as const;

export const STAGE_TONE: Record<DecisionStage, string> = {
  under_review: TONE.zinc,
  committee_review: TONE.blue,
  final_approval: TONE.amber,
  decision_released: TONE.purple,
};

export const FINAL_DECISION_TONE: Record<FinalDecision, string> = {
  offer_made: TONE.green,
  waitlisted: TONE.yellow,
  rejected: TONE.red,
};

export const OFFER_STATUS_TONE: Record<OfferStatus, string> = {
  draft: TONE.zinc,
  generated: TONE.blue,
  sent: TONE.green,
  expired: TONE.amber,
  withdrawn: TONE.red,
};

export const ACCEPTANCE_STATUS_TONE: Record<AcceptanceStatus, string> = {
  pending: TONE.amber,
  accepted: TONE.green,
  declined: TONE.red,
  expired: TONE.zinc,
};

export const WAITLIST_STATUS_TONE: Record<WaitlistStatus, string> = {
  active: TONE.yellow,
  offer_released: TONE.blue,
  converted: TONE.green,
  closed: TONE.zinc,
};

export const PAYMENT_TONE: Record<FeePaymentStatus, string> = {
  pending: TONE.amber,
  paid: TONE.green,
  failed: TONE.red,
  waived: TONE.blue,
};

export const ENROLLMENT_TONE: Record<EnrollmentStatus, string> = {
  not_enrolled: TONE.zinc,
  pending: TONE.amber,
  confirmed: TONE.green,
  cancelled: TONE.red,
};

// ---------------------------------------------------------------------------
// Admission_Decisions
// ---------------------------------------------------------------------------

export interface CommitteeReview {
  userId: string;
  userName?: string;
  recommendation: FinalDecision;
  score?: number | null;
  comments?: string | null;
  reviewedAt: string;
}

export interface AdmissionDecision {
  id: string;
  decisionNo: number;
  organizationId: string;
  applicationId: string;
  decisionStage: DecisionStage;
  finalDecision: FinalDecision | null;
  decisionCommittee: string[];
  decisionCommitteeTeamIds: string[];
  committeeReviews: CommitteeReview[];
  decisionScore: number | string | null;
  decisionDate: string | null;
  approvedBy: string | null;
  approvalStatus: ApprovalStatus;
  internalRemarks: string | null;
  applicantVisible: boolean;
  decisionLocked: boolean;
  releasedBy: string | null;
  releasedAt: string | null;
  applicantNotifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CompositeScoreSummary {
  compositeScore?: number | null;
  gdScore?: number | null;
  piScore?: number | null;
  experienceComponent?: number | null;
  otherComponentsTotal?: number | null;
  discrepancyFlag?: boolean;
  [key: string]: unknown;
}

export interface DecisionDetail {
  decision: AdmissionDecision | null;
  scoreBreakdown: CompositeScoreSummary | null;
  committeeMemberIds: string[];
  userNames: Record<string, string>;
  permissions: {
    canReview: boolean;
    canApprove: boolean;
    canUnlock: boolean;
  };
}

export interface DecisionListRow {
  applicationId: string;
  applicationNo: string;
  name: string;
  email: string;
  program: string | null;
  compositeScore: number | string | null;
  decision: AdmissionDecision | null;
}

export interface DecisionListFilters {
  search?: string;
  stage?: DecisionStage | "not_started" | "";
  finalDecision?: FinalDecision | "";
  program?: string;
}

export interface UpdateDecisionInput {
  decisionCommittee?: string[];
  decisionCommitteeTeamIds?: string[];
  decisionScore?: number;
  internalRemarks?: string;
  applicantVisible?: boolean;
}

export interface CommitteeReviewInput {
  recommendation: FinalDecision;
  score?: number;
  comments?: string;
}

export interface FinalizeDecisionInput {
  approvalStatus: "approved" | "rejected";
  finalDecision?: FinalDecision;
  internalRemarks?: string;
}

export interface ReleaseDecisionInput {
  applicantVisible?: boolean;
  lock?: boolean;
}

export type BulkDecisionAction =
  | "create"
  | "assign_committee"
  | "advance"
  | "finalize"
  | "release"
  | "publish";

export interface BulkDecisionInput {
  applicationNos: string[];
  action: BulkDecisionAction;
  decisionStage?: "committee_review" | "final_approval";
  finalDecision?: FinalDecision;
  approvalStatus?: "approved" | "rejected";
  decisionCommittee?: string[];
  decisionCommitteeTeamIds?: string[];
  applicantVisible?: boolean;
  internalRemarks?: string;
}

export interface BulkDecisionResult {
  total: number;
  succeeded: number;
  failed: number;
  results: { applicationNo: string; ok: boolean; error?: string }[];
}

export interface DecisionPicklists {
  programs: { id: string; name: string; code?: string }[];
  intakes: { id: string; name: string; isCurrent?: boolean }[];
  users: { id: string; name: string; email: string; role: string }[];
  teams: { id: string; name: string; memberIds: string[]; isActive: boolean }[];
  approverUserIds: string[];
}

export interface DecisionSettings {
  id: string;
  organizationId: string;
  waitlistMovementMode: "auto" | "manual";
  offerValidityDays: number;
  acceptanceWindowDays: number;
  seatBookingFee: number | string | null;
  approverUserIds: string[];
  autoSendOfferOnRelease: boolean;
  defaultOnboardingInfo: string | null;
}

export type UpdateDecisionSettingsInput = Partial<
  Omit<DecisionSettings, "id" | "organizationId" | "seatBookingFee">
> & { seatBookingFee?: number };

export interface CommitteeTeam {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  memberIds: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CommitteeTeamInput {
  name: string;
  description?: string;
  memberIds?: string[];
  isActive?: boolean;
}

// ---------------------------------------------------------------------------
// Letter templates
// ---------------------------------------------------------------------------

export interface LetterTemplate {
  id: string;
  organizationId: string;
  name: string;
  type: LetterTemplateType;
  subject: string | null;
  bodyHtml: string;
  status: LetterTemplateStatus;
  version: number;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LetterTemplateInput {
  name: string;
  type: LetterTemplateType;
  subject?: string;
  bodyHtml: string;
  status?: LetterTemplateStatus;
  isDefault?: boolean;
}

export interface MergeField {
  key: string;
  description: string;
}

// ---------------------------------------------------------------------------
// Offer_Letters
// ---------------------------------------------------------------------------

export interface OfferLetter {
  id: string;
  offerNo: number;
  organizationId: string;
  applicationId: string;
  admissionDecisionId: string | null;
  offerType: OfferType;
  programOffered: string | null;
  offerStatus: OfferStatus;
  letterTemplateId: string | null;
  letterTemplateVersion: number | null;
  offerLetterHtml?: string | null;
  offerLetterPdf: string | null;
  offerLetterPdfName: string | null;
  offerGeneratedOn: string | null;
  offerValidTill: string | null;
  scholarshipAmount: number | string;
  conditions: string | null;
  generatedBy: string | null;
  sentToCandidate: boolean;
  sentAt: string | null;
  withdrawnReason: string | null;
  fromWaitlist: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OfferListRow extends OfferLetter {
  applicationNo?: string;
  applicantName?: string;
  applicantEmail?: string;
  templateName: string | null;
  acceptanceStatus: AcceptanceStatus | null;
  enrollmentStatus: EnrollmentStatus | null;
  feePaymentStatus: FeePaymentStatus | null;
}

export interface GenerateOfferLetterInput {
  offerType: OfferType;
  programOffered?: string;
  letterTemplateId?: string;
  offerValidTill?: string;
  scholarshipAmount?: number;
  conditions?: string;
  send?: boolean;
}

// ---------------------------------------------------------------------------
// Offer_Acceptances
// ---------------------------------------------------------------------------

export interface OfferAcceptance {
  id: string;
  acceptanceNo: number;
  offerLetterId: string;
  acceptanceStatus: AcceptanceStatus;
  candidateConfirmationDate: string | null;
  acceptanceDeadline: string | null;
  seatBookingFee: number | string;
  feePaymentLink: string | null;
  feePaymentStatus: FeePaymentStatus;
  paymentReferenceId: string | null;
  onboardingPackageSent: boolean;
  onboardingSentAt: string | null;
  onboardingInfo: string | null;
  enrollmentStatus: EnrollmentStatus;
  declineReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AcceptanceListRow extends OfferAcceptance {
  offerNo?: number;
  offerStatus?: OfferStatus;
  programOffered?: string | null;
  applicationNo?: string;
  applicantName?: string;
  applicantEmail?: string;
}

export interface UpdateAcceptanceInput {
  acceptanceDeadline?: string;
  seatBookingFee?: number;
  feePaymentLink?: string;
  feePaymentStatus?: FeePaymentStatus;
  paymentReferenceId?: string;
  onboardingInfo?: string;
  enrollmentStatus?: EnrollmentStatus;
}

export interface RecordAcceptanceInput {
  accept: boolean;
  declineReason?: string;
}

// ---------------------------------------------------------------------------
// Waitlist_Management
// ---------------------------------------------------------------------------

export interface WaitlistEntry {
  id: string;
  waitlistNo: number;
  organizationId: string;
  applicationId: string;
  program: string | null;
  waitlistRank: number | null;
  waitlistStatus: WaitlistStatus;
  movementTrigger: MovementTrigger | null;
  alternateProgramOffered: string | null;
  offerReleased: boolean;
  releasedOfferId: string | null;
  communicationSent: boolean;
  lastReviewDate: string | null;
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WaitlistListRow extends WaitlistEntry {
  applicationNo?: string;
  applicantName?: string;
  applicantEmail?: string;
  compositeScore?: number | string | null;
}

export interface UpdateWaitlistInput {
  waitlistRank?: number;
  alternateProgramOffered?: string;
  movementTrigger?: MovementTrigger;
  lastReviewDate?: string;
  remarks?: string;
}

export interface ReleaseWaitlistOfferInput {
  alternateProgramOffered?: string;
  movementTrigger?: MovementTrigger;
}

export interface SeatsAvailableInput {
  program: string;
  seats?: number;
}

// ---------------------------------------------------------------------------
// Rejections
// ---------------------------------------------------------------------------

export interface Rejection {
  id: string;
  rejectionNo: number;
  organizationId: string;
  applicationId: string;
  rejectionReason: RejectionReason;
  detailedReason: string | null;
  rejectionDate: string;
  rejectionLetterTemplateId: string | null;
  rejectionLetterPdf: string | null;
  communicationSent: boolean;
  communicationSentAt: string | null;
  alternateOptionsSuggested: string | null;
  eligibleForReapply: boolean;
  nextIntake: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RejectionListRow extends Rejection {
  templateName: string | null;
  applicationNo?: string;
  applicantName?: string;
  program?: string | null;
}

export interface UpdateRejectionInput {
  rejectionReason?: RejectionReason;
  detailedReason?: string;
  rejectionLetterTemplateId?: string;
  alternateOptionsSuggested?: string;
  eligibleForReapply?: boolean;
  nextIntake?: string;
}

// ---------------------------------------------------------------------------
// Student portal
// ---------------------------------------------------------------------------

export interface StudentAdmissionResult {
  applicationId: string;
  applicationNo: string;
  name: string;
  program: string | null;
  decisionReleased: boolean;
  decision: {
    finalDecision: FinalDecision | null;
    decisionDate: string | null;
    releasedAt: string | null;
  } | null;
  offer: {
    id: string;
    offerNo: number;
    offerType: OfferType;
    programOffered: string | null;
    offerStatus: OfferStatus;
    offerGeneratedOn: string | null;
    offerValidTill: string | null;
    scholarshipAmount: number | string;
    conditions: string | null;
    hasPdf: boolean;
    offerLetterHtml: string | null;
  } | null;
  acceptance: {
    id: string;
    acceptanceStatus: AcceptanceStatus;
    candidateConfirmationDate: string | null;
    acceptanceDeadline: string | null;
    seatBookingFee: number | string;
    feePaymentLink: string | null;
    feePaymentStatus: FeePaymentStatus;
    paymentReferenceId: string | null;
    onboardingPackageSent: boolean;
    onboardingInfo: string | null;
    enrollmentStatus: EnrollmentStatus;
  } | null;
  waitlist: {
    waitlistRank: number | null;
    waitlistStatus: WaitlistStatus;
    alternateProgramOffered: string | null;
    offerReleased: boolean;
  } | null;
  rejection: {
    rejectionReason: RejectionReason;
    rejectionDate: string;
    alternateOptionsSuggested: string | null;
    eligibleForReapply: boolean;
    nextIntake: string | null;
    hasLetter: boolean;
  } | null;
}
