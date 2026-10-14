import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Generated,
} from 'typeorm';

export const CAMPAIGN_TYPES = ['Manual', 'Automated', 'Drip', 'Trigger-based'] as const;
export const CAMPAIGN_OBJECTIVES = ['Lead Nurture', 'Application Reminder', 'Interview', 'Offer', 'Fee Reminder'] as const;
export const TARGET_AUDIENCES = ['Prospects', 'Applicants', 'Admitted', 'Waitlisted'] as const;
export const SEGMENT_CRITERIA = ['Incomplete Application', 'Paid Fees', 'Attended Interview'] as const;
/** Scope statuses Active / Paused / Completed (+ Draft before the first activation). */
export const CAMPAIGN_STATUSES = ['Draft', 'Active', 'Paused', 'Completed'] as const;
export const CAMPAIGN_TRIGGER_EVENTS = ['Signup', 'Form Submission', 'Deadline Missed'] as const;
export const CAMPAIGN_FREQUENCIES = ['One-time', 'Daily', 'Weekly', 'Event-based'] as const;
export const STOP_CONDITIONS = ['Form Submitted', 'Fee Paid'] as const;

/** Email campaign (scope: Communication Management §1 Email campaigns). */
@Entity('email_campaigns')
export class EmailCampaign {
  /** Campaign ID (Primary Key) */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Human readable number → "CMP-0001" */
  @Column({ name: 'campaign_no', type: 'int' })
  @Generated('increment')
  campaignNo: number;

  @Index()
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  // ── 1. Campaign information ────────────────────────────────────────────
  @Column({ length: 255 })
  name: string;

  /** Manual / Automated / Drip / Trigger-based */
  @Column({ name: 'campaign_type', length: 20, default: 'Manual' })
  campaignType: string;

  /** Lead Nurture / Application Reminder / Interview / Offer / Fee Reminder */
  @Column({ length: 40, default: 'Lead Nurture' })
  objective: string;

  /** Target Program / Course (courses.id) — null = all programs */
  @Column({ name: 'target_course_id', type: 'uuid', nullable: true })
  targetCourseId: string | null;

  @Column({ name: 'target_program', type: 'varchar', length: 255, nullable: true })
  targetProgram: string | null;

  /** Academic Year (matches applications.academic_session) */
  @Column({ name: 'academic_year', type: 'varchar', length: 20, nullable: true })
  academicYear: string | null;

  /** Intake Term (matches leads.intake) */
  @Column({ name: 'intake_term', type: 'varchar', length: 50, nullable: true })
  intakeTerm: string | null;

  /** Prospects / Applicants / Admitted / Waitlisted (multi) */
  @Column({ name: 'target_audience', type: 'jsonb', default: () => `'["Prospects"]'` })
  targetAudience: string[];

  /** Incomplete Application / Paid Fees / Attended Interview (multi, all must match) */
  @Column({ name: 'segment_criteria', type: 'jsonb', default: () => "'[]'" })
  segmentCriteria: string[];

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;

  @Column({ name: 'created_by_name', type: 'varchar', length: 255, nullable: true })
  createdByName: string | null;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy: string | null;

  /** Draft / Active / Paused / Completed */
  @Index()
  @Column({ length: 20, default: 'Draft' })
  status: string;

  // ── 2. Email content ───────────────────────────────────────────────────
  @Column({ name: 'template_id', type: 'uuid', nullable: true })
  templateId: string | null;

  @Column({ length: 500, default: '' })
  subject: string;

  @Column({ name: 'pre_header', type: 'varchar', length: 255, nullable: true })
  preHeader: string | null;

  /** Body Content (HTML) */
  @Column({ name: 'html_body', type: 'text', default: '' })
  htmlBody: string;

  /** Text Version (Plain Text) */
  @Column({ name: 'text_body', type: 'text', nullable: true })
  textBody: string | null;

  /** Attachments [{ name, url, type: Prospectus / Offer Letter / Brochure / Other }] */
  @Column({ type: 'jsonb', default: () => "'[]'" })
  attachments: { name: string; url: string; type?: string }[];

  /** Personalization variables used in subject / body ({{First_Name}} …) */
  @Column({ name: 'personalization_variables', type: 'jsonb', default: () => "'[]'" })
  personalizationVariables: string[];

  @Column({ length: 50, default: 'English' })
  language: string;

  /** Email footer: institution address (unsubscribe link is always appended) */
  @Column({ name: 'footer_address', type: 'text', nullable: true })
  footerAddress: string | null;

  @Column({ name: 'footer_text', type: 'text', nullable: true })
  footerText: string | null;

  @Column({ name: 'sender_name', type: 'varchar', length: 150, nullable: true })
  senderName: string | null;

  // ── 3. Automation & scheduling ─────────────────────────────────────────
  /** Signup / Form Submission / Deadline Missed */
  @Column({ name: 'trigger_event', type: 'varchar', length: 30, nullable: true })
  triggerEvent: string | null;

  /** Deadline used by the "Deadline Missed" trigger */
  @Column({ name: 'deadline_at', type: 'timestamptz', nullable: true })
  deadlineAt: Date | null;

  /** Scheduled Send Date & Time (UTC instant) */
  @Column({ name: 'scheduled_at', type: 'timestamptz', nullable: true })
  scheduledAt: Date | null;

  /** One-time / Daily / Weekly / Event-based */
  @Column({ length: 20, default: 'One-time' })
  frequency: string;

  /** Max Send Limit per Applicant */
  @Column({ name: 'max_sends_per_recipient', type: 'int', default: 1 })
  maxSendsPerRecipient: number;

  @Column({ name: 'time_zone', length: 64, default: 'Asia/Kolkata' })
  timeZone: string;

  /** Form Submitted / Fee Paid */
  @Column({ name: 'stop_conditions', type: 'jsonb', default: () => "'[]'" })
  stopConditions: string[];

  /** Optional end date for recurring campaigns */
  @Column({ name: 'end_at', type: 'timestamptz', nullable: true })
  endAt: Date | null;

  @Index()
  @Column({ name: 'next_run_at', type: 'timestamptz', nullable: true })
  nextRunAt: Date | null;

  @Column({ name: 'last_run_at', type: 'timestamptz', nullable: true })
  lastRunAt: Date | null;

  /** Watermark for event-based triggers (events after this instant are processed) */
  @Column({ name: 'trigger_checked_at', type: 'timestamptz', nullable: true })
  triggerCheckedAt: Date | null;

  @Column({ name: 'activated_at', type: 'timestamptz', nullable: true })
  activatedAt: Date | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  /** Guards against two cron ticks running the same campaign */
  @Column({ name: 'is_running', default: false })
  isRunning: boolean;

  // ── 4. Tracking & performance (counters) ───────────────────────────────
  @Column({ name: 'total_sent', type: 'int', default: 0 })
  totalSent: number;

  @Column({ name: 'delivered_count', type: 'int', default: 0 })
  deliveredCount: number;

  @Column({ name: 'failed_count', type: 'int', default: 0 })
  failedCount: number;

  @Column({ name: 'bounce_count', type: 'int', default: 0 })
  bounceCount: number;

  /** Unique opens (recipients) */
  @Column({ name: 'open_count', type: 'int', default: 0 })
  openCount: number;

  /** Unique clicks (recipients) */
  @Column({ name: 'click_count', type: 'int', default: 0 })
  clickCount: number;

  @Column({ name: 'unsubscribe_count', type: 'int', default: 0 })
  unsubscribeCount: number;

  @Column({ name: 'skipped_count', type: 'int', default: 0 })
  skippedCount: number;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError: string | null;

  /** Created Date */
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  /** Modified Date */
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
