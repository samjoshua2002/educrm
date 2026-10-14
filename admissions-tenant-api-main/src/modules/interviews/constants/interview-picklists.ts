// Picklist values for the Interview Scheduling & Evaluation module, taken
// from the scope document (Module-wise fields, pages 22-28). Shared by DTO
// validation and exposed to the UI via GET .../interview-picklists.

export const INTERVIEW_TYPES = ['GD', 'PI'] as const;

export const INTERVIEW_MODES = ['In-person', 'Virtual'] as const;

// Interview Status picklist (scope: Slot Available / Scheduled / Rescheduled /
// Completed / No Show / Cancelled).
export const INTERVIEW_STATUSES = [
  'Slot Available',
  'Scheduled',
  'Rescheduled',
  'Completed',
  'No Show',
  'Cancelled',
] as const;

export const INTERVIEW_OUTCOMES = ['Selected', 'Rejected', 'On Hold', 'Waitlisted'] as const;

// Slot Status picklist (scope: Available / Booked / Blocked / Cancelled).
export const SLOT_STATUSES = ['Available', 'Booked', 'Blocked', 'Cancelled'] as const;

// Time_Zone picklist (IANA names, most relevant first).
export const TIME_ZONES = [
  'Asia/Kolkata',
  'Asia/Dubai',
  'Asia/Singapore',
  'Asia/Kathmandu',
  'Asia/Dhaka',
  'Asia/Colombo',
  'Europe/London',
  'Europe/Berlin',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'Australia/Sydney',
  'UTC',
] as const;

// Recommendation picklist (scope).
export const RECOMMENDATIONS = ['Strongly Recommend', 'Recommend', 'Neutral', 'Do Not Recommend'] as const;

// Evaluation_Status picklist. Stored lower-case for backward compatibility
// with existing rows ('draft' / 'submitted'); 'Not Started' is derived when
// no evaluation row exists yet.
export const EVALUATION_STATUSES = ['Not Started', 'draft', 'submitted'] as const;

export const RULE_STATUSES = ['active', 'inactive'] as const;

// Calendar Provider picklist (scope: Google Calendar / Outlook).
export const CALENDAR_PROVIDERS = ['Google Calendar', 'Outlook'] as const;

export const CALENDAR_SYNC_STATUSES = ['Not Connected', 'Connected', 'Synced', 'Failed', 'Disconnected'] as const;

// Entrance exams treated as "CAT" by the split entrance scoring (owner
// request). Anything else (XAT, MAT, CMAT, GMAT, GRE, SNAP, NMAT, ...) is an
// "other" exam. Matched case-insensitively on the whole word.
export function isCatExam(testName?: string | null): boolean {
  if (!testName) return false;
  const name = String(testName).trim();
  return /\bCAT\b/i.test(name) || /common\s+admission\s+test/i.test(name);
}
