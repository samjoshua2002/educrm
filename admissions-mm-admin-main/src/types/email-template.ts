export interface EmailTemplate {
  id: string;
  organizationId?: string | null;
  name: string;
  category: string;
  channel: "Email" | "SMS" | "WhatsApp";
  subject: string;
  body: string;
  description?: string | null;
  variables: string[];
  status: "active" | "draft";
  isDefault?: boolean;
  usageCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateEmailTemplateInput {
  name: string;
  category: string;
  channel?: "Email" | "SMS" | "WhatsApp";
  subject: string;
  body: string;
  description?: string;
  variables?: string[];
  status?: "active" | "draft";
  isDefault?: boolean;
}

export type UpdateEmailTemplateInput = Partial<CreateEmailTemplateInput>;

export interface ShortcutVariable {
  key: string;
  tag: string;
  label: string;
  description: string;
  sampleValue: string;
  sourceField: string;
}

export const AVAILABLE_SHORTCUTS: ShortcutVariable[] = [
  {
    key: "student",
    tag: "{student}",
    label: "Student Name",
    description: "Applicant's full name from application profile",
    sampleValue: "Aarav Sharma",
    sourceField: "applicant.name",
  },
  {
    key: "course",
    tag: "{course}",
    label: "Course / Program",
    description: "Course or academic program applied for",
    sampleValue: "PGDM 2026-28",
    sourceField: "appliedFor / program",
  },
  {
    key: "application_no",
    tag: "{application_no}",
    label: "Application No",
    description: "Unique candidate application reference number",
    sampleValue: "APP2026001",
    sourceField: "applicationNo",
  },
  {
    key: "date",
    tag: "{date}",
    label: "Date",
    description: "Current date or interview/schedule date",
    sampleValue: "12 Feb 2026",
    sourceField: "submittedAt / currentDate",
  },
  {
    key: "time",
    tag: "{time}",
    label: "Time Slot",
    description: "Scheduled interview, evaluation, or deadline time",
    sampleValue: "10:30 AM - 12:00 PM IST",
    sourceField: "interviewSlot / deadline",
  },
  {
    key: "venue",
    tag: "{venue}",
    label: "Venue / Link",
    description: "Campus location, auditorium, or virtual video meeting link",
    sampleValue: "Main Campus Seminar Hall A",
    sourceField: "location / meetingLink",
  },
  {
    key: "sender",
    tag: "{sender}",
    label: "Sender (Logged-in User)",
    description: "Name of the active admissions officer sending this communication",
    sampleValue: "Admissions Desk",
    sourceField: "user.name",
  },
  {
    key: "organization",
    tag: "{organization}",
    label: "Organization Name",
    description: "Full registered name of your educational institution",
    sampleValue: "Global Business Institute",
    sourceField: "organization.name",
  },
  {
    key: "email",
    tag: "{email}",
    label: "Student Email",
    description: "Registered applicant contact email address",
    sampleValue: "aarav.sharma@gmail.com",
    sourceField: "applicant.email",
  },
  {
    key: "phone",
    tag: "{phone}",
    label: "Student Phone",
    description: "Applicant mobile contact number",
    sampleValue: "+91 98765 43210",
    sourceField: "applicant.primaryMobile",
  },
];
