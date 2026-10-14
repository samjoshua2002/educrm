import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export const INTERACTION_CHANNELS = ['Email', 'SMS', 'WhatsApp', 'Call', 'System'] as const;
export const INTERACTION_DIRECTIONS = ['Inbound', 'Outbound', 'System Generated'] as const;
export const INTERACTION_DELIVERY_STATUSES = ['Sent', 'Read', 'Failed'] as const;

/**
 * One row per interaction with an applicant / lead (scope §5 Communication
 * History). Email sends write here directly; SMS / WhatsApp (message_logs),
 * calls (call_logs) and email campaigns mirror a row here with
 * `relatedRecordId` pointing at their own record.
 */
@Entity('communication_logs')
export class CommunicationLog {
  /** Interaction ID (Primary Key) */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId: string | null;

  /** Applicant ID (FK → applications.id) */
  @Index()
  @Column({ name: 'application_id', type: 'uuid', nullable: true })
  applicationId: string | null;

  @Index()
  @Column({ name: 'lead_id', type: 'uuid', nullable: true })
  leadId: string | null;

  @Index()
  @Column({ name: 'application_no', type: 'varchar', length: 100, nullable: true })
  applicationNo: string | null;

  @Column({ name: 'applicant_name', type: 'varchar', length: 255, nullable: true })
  applicantName: string | null;

  @Column({ name: 'recipient_email', type: 'varchar', length: 255, nullable: true })
  recipientEmail: string | null;

  @Column({ name: 'recipient_phone', type: 'varchar', length: 50, nullable: true })
  recipientPhone: string | null;

  /** Email / SMS / WhatsApp / Call / System */
  @Column({ length: 50, default: 'Email' })
  channel: string;

  /** Inbound / Outbound / System Generated */
  @Column({ length: 20, default: 'Outbound' })
  direction: string;

  /** Related Record ID (Email ID / Call ID / Message ID / Campaign recipient ID) */
  @Index()
  @Column({ name: 'related_record_id', type: 'varchar', length: 150, nullable: true })
  relatedRecordId: string | null;

  /** e.g. 'message_log' | 'call_log' | 'email_campaign' | 'email' */
  @Column({ name: 'related_record_type', type: 'varchar', length: 40, nullable: true })
  relatedRecordType: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  category: string | null; // display name, e.g. "Application Submitted"

  @Column({ name: 'category_id', type: 'uuid', nullable: true })
  categoryId: string | null;

  @Column({ name: 'template_id', type: 'uuid', nullable: true })
  templateId: string | null;

  /** Subject / Title */
  @Column({ length: 500 })
  subject: string;

  /** Message summary / call summary */
  @Column({ type: 'text', nullable: true })
  summary: string | null;

  /** Full content / conversation transcript (rendered body) */
  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'text', nullable: true })
  footer: string | null;

  /** Attachment links [{ name, url }] */
  @Column({ type: 'jsonb', default: () => "'[]'" })
  attachments: { name: string; url: string; type?: string }[];

  /** Display name of the sender (legacy) */
  @Column({ type: 'varchar', length: 150, nullable: true })
  sender: string | null;

  /** Handled By — user name, or 'System' */
  @Column({ name: 'handled_by', type: 'varchar', length: 150, nullable: true })
  handledBy: string | null;

  @Column({ name: 'handled_by_user_id', type: 'uuid', nullable: true })
  handledByUserId: string | null;

  /** 'Sent' | 'Delivered' | 'Read' | 'Opened' | 'Failed' | 'Scheduled' | 'Blocked' | 'Cancelled' */
  @Column({ length: 20, default: 'Sent' })
  status: string;

  @Column({ name: 'failure_reason', type: 'text', nullable: true })
  failureReason: string | null;

  @Column({ name: 'message_id', type: 'varchar', length: 150, nullable: true })
  messageId: string | null;

  /** When a Scheduled entry is due (email compose "send later") */
  @Index()
  @Column({ name: 'scheduled_at', type: 'timestamptz', nullable: true })
  scheduledAt: Date | null;

  @Column({ name: 'time_zone', type: 'varchar', length: 64, nullable: true })
  timeZone: string | null;

  // ── Status & follow-up ─────────────────────────────────────────────────
  @Column({ name: 'action_taken', type: 'text', nullable: true })
  actionTaken: string | null;

  @Column({ name: 'next_follow_up_date', type: 'timestamptz', nullable: true })
  nextFollowUpDate: Date | null;

  @Column({ name: 'assigned_staff_id', type: 'uuid', nullable: true })
  assignedStaffId: string | null;

  @Column({ name: 'assigned_staff_name', type: 'varchar', length: 255, nullable: true })
  assignedStaffName: string | null;

  @Column({ type: 'text', nullable: true })
  remarks: string | null;

  /** Date & Time of the interaction */
  @CreateDateColumn({ name: 'sent_at' })
  sentAt: Date;

  @UpdateDateColumn({ name: 'updated_at', nullable: true })
  updatedAt: Date;
}
