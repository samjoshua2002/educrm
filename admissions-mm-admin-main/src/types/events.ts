export type EventType = "announcement" | "event";

export type EventPriority = "Low" | "Medium" | "High" | "Urgent";

export type EventStatus = "Published" | "Scheduled" | "Draft" | "Archived";

export type EventCategory =
  | "General"
  | "Exam"
  | "Academic"
  | "Admissions"
  | "GD & Interview"
  | "Orientation"
  | "Webinar"
  | "Holiday";

export type TargetRole =
  | "all"
  | "student"
  | "org_admin"
  | "counselor"
  | "lead_manager"
  | "application_manager"
  | "exam_manager"
  | "lead";

export type VenueType = "in_person" | "virtual" | "hybrid";

export interface AnnouncementEventItem {
  id: string;
  organizationId?: string;
  title: string;
  type: EventType;
  category: EventCategory;
  description: string;
  priority: EventPriority;
  targetAudience: string[]; // ["student", "staff", "all", "counselor", etc.]
  targetLeadStages?: string[];
  /** Lead sources (leads.source) */
  targetLeadSources?: string[];
  /** Application statuses (applications.form_status) */
  targetApplicationStatuses?: string[];
  targetAcademicSession?: string;
  /** Branch ids: staff, leads and applicants of these branches */
  targetBranchIds?: string[];
  targetCourseId?: string;
  targetCourseName?: string;
  eventStartDate?: string;
  eventEndDate?: string;
  eventStartTime?: string;
  eventEndTime?: string;
  venueType?: VenueType;
  venueLocation?: string;
  status: EventStatus;
  scheduledPublishDate?: string;
  scheduledPublishTime?: string;
  /** ISO timestamp of the scheduled publish moment */
  scheduledPublishAt?: string;
  sendInAppNotification: boolean;
  sendEmailBroadcast: boolean;
  sendWhatsapp: boolean;
  emailTemplateId?: string;
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentType?: "image" | "pdf" | "other";
  posterUrl?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  createdByName?: string;
  deliveryStatus?: string | null;
  lastDeliveredAt?: string | null;
  deliveryStats?: EventDeliveryStats | null;
}

export interface EventDeliveryStats {
  reason?: string;
  recipients?: { staff?: number; students?: number; leads?: number; applicants?: number };
  inApp?: number;
  email?: { sent: number; failed: number; error?: string };
  whatsapp?: { sent: number; failed: number; error?: string };
  startedAt?: string;
  finishedAt?: string;
  error?: string;
}

export interface AudienceTargeting {
  targetAudience: string[];
  targetCourseId?: string;
  targetLeadStages?: string[];
  targetLeadSources?: string[];
  targetApplicationStatuses?: string[];
  targetAcademicSession?: string;
  targetBranchIds?: string[];
}

export interface AudiencePreview {
  staff: number;
  staffByRole: Record<string, number>;
  students: number;
  leads: number;
  applicants: number;
  portalAccounts: number;
  uniqueEmails: number;
  uniquePhones: number;
}

export type CreateAnnouncementEventInput = Omit<
  AnnouncementEventItem,
  "id" | "createdAt" | "updatedAt" | "deliveryStatus" | "lastDeliveredAt" | "deliveryStats"
>;

export type UpdateAnnouncementEventInput = Partial<CreateAnnouncementEventInput>;
