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
}

export type CreateAnnouncementEventInput = Omit<
  AnnouncementEventItem,
  "id" | "createdAt" | "updatedAt"
>;

export type UpdateAnnouncementEventInput = Partial<CreateAnnouncementEventInput>;
