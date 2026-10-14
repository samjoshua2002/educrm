// Shared picklists for the Application Management module (scope pages 14–21).

/** Application Master — Application_Status */
export const APPLICATION_STATUSES = ['Started', 'Submitted', 'Under Review', 'Approved', 'Rejected'] as const;

/** Application Master — Application_Source */
export const APPLICATION_SOURCES = ['Website', 'Agent', 'Campaign'] as const;

/** Application Status Tracker — stages */
export const TRACKER_STAGES = [
  'Application Started',
  'Fee Paid',
  'Documents Uploaded',
  'Under Review',
  'Verified',
  'Shortlisted',
  'Approved',
  'Rejected',
  'Waitlisted',
] as const;
export type TrackerStage = (typeof TRACKER_STAGES)[number];

export const FINAL_STAGES: string[] = ['Approved', 'Rejected', 'Waitlisted'];

/** Step index used by the applicant's step-wise progress tracker. */
export const STAGE_STEP: Record<string, number> = {
  'Application Started': 0,
  'Fee Paid': 1,
  'Documents Uploaded': 2,
  'Under Review': 3,
  Verified: 4,
  Shortlisted: 4,
  Approved: 5,
  Rejected: 5,
  Waitlisted: 5,
};

/** The six steps shown to applicants. */
export const TRACKER_STEPS = [
  'Application Started',
  'Fee Paid',
  'Documents Uploaded',
  'Under Review',
  'Verified / Shortlisted',
  'Approved / Rejected / Waitlisted',
];

/** Expected turnaround (SLA_Days) per stage when an org has not configured its own. */
export const DEFAULT_STAGE_SLA_DAYS: Record<string, number> = {
  'Application Started': 7,
  'Fee Paid': 3,
  'Documents Uploaded': 2,
  'Under Review': 5,
  Verified: 7,
  Shortlisted: 7,
};

/** Document Upload & Verification — Document_Type */
export const DOCUMENT_TYPES = ['ID Proof', 'Marksheets', 'Certificates'] as const;
export const DOCUMENT_VERIFICATION_STATUSES = ['Pending', 'Approved', 'Rejected'] as const;
export const ALLOWED_DOCUMENT_MIME_TYPES: Record<string, string[]> = {
  'application/pdf': ['pdf'],
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
};
export const DEFAULT_MAX_DOCUMENT_SIZE_MB = 5;

/** Map the internal form_status column to the scope's Application_Status picklist. */
export function toApplicationStatus(formStatus?: string | null): string {
  switch ((formStatus || '').toLowerCase()) {
    case 'submitted':
      return 'Submitted';
    case 'under_review':
    case 'in_progress':
      return 'Under Review';
    case 'accepted':
    case 'approved':
      return 'Approved';
    case 'rejected':
      return 'Rejected';
    default:
      return 'Started';
  }
}

/** Map the scope's Application_Status picklist to the internal form_status column. */
export function fromApplicationStatus(status: string): string | null {
  switch ((status || '').toLowerCase()) {
    case 'started':
      return 'incomplete';
    case 'submitted':
      return 'submitted';
    case 'under review':
    case 'under_review':
      return 'under_review';
    case 'approved':
    case 'accepted':
      return 'accepted';
    case 'rejected':
      return 'rejected';
    case 'in_progress':
      return 'in_progress';
    default:
      return null;
  }
}

export function isUuid(val?: string | null): boolean {
  return !!val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
}
