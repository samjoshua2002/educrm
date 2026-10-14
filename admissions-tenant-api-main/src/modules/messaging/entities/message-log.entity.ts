import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export const MESSAGE_CHANNELS = ['SMS', 'WhatsApp'] as const;
export const MESSAGE_TYPES = ['Reminder', 'OTP', 'Status', 'Alert', 'Marketing'] as const;
export const MESSAGE_TRIGGER_EVENTS = ['Deadline', 'Missing Documents', 'Offer Release'] as const;
export const MESSAGE_PRIORITIES = ['High', 'Normal', 'Low'] as const;
/** Sent status per scope: Sent / Failed / Delivered (+ internal Scheduled / Queued / Blocked). */
export const MESSAGE_SENT_STATUSES = ['Scheduled', 'Queued', 'Sent', 'Delivered', 'Failed', 'Blocked'] as const;
export const CONSENT_STATUSES = ['Opted In', 'Opted Out', 'Unknown'] as const;

/** SMS & WhatsApp message log — one row per message (scope §2). */
@Entity('message_logs')
export class MessageLog {
  /** Message ID (Primary Key) */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  // ── 1. Message details ──────────────────────────────────────────────────
  /** 'SMS' | 'WhatsApp' */
  @Column({ length: 20 })
  channel: string;

  /** Reminder / OTP / Status / Alert / Marketing */
  @Column({ name: 'message_type', length: 20, default: 'Status' })
  messageType: string;

  @Column({ name: 'template_id', type: 'varchar', length: 100, nullable: true })
  templateId: string | null;

  @Column({ type: 'text' })
  body: string;

  @Column({ name: 'character_count', type: 'int', default: 0 })
  characterCount: number;

  /** WhatsApp only — PDF / image URL */
  @Column({ name: 'media_url', type: 'text', nullable: true })
  mediaUrl: string | null;

  /** CTA link (Application / Payment / Interview link) */
  @Column({ name: 'cta_link', type: 'text', nullable: true })
  ctaLink: string | null;

  // ── 2. Recipient details ────────────────────────────────────────────────
  /** Applicant ID (FK → applications.id) */
  @Index()
  @Column({ name: 'application_id', type: 'uuid', nullable: true })
  applicationId: string | null;

  @Index()
  @Column({ name: 'lead_id', type: 'uuid', nullable: true })
  leadId: string | null;

  @Column({ name: 'application_no', type: 'varchar', length: 100, nullable: true })
  applicationNo: string | null;

  @Column({ name: 'recipient_name', type: 'varchar', length: 255, nullable: true })
  recipientName: string | null;

  /** National number (digits only, without country code) */
  @Index()
  @Column({ name: 'mobile_number', length: 30 })
  mobileNumber: string;

  @Column({ name: 'country_code', length: 6, default: '91' })
  countryCode: string;

  @Column({ name: 'preferred_language', type: 'varchar', length: 50, nullable: true })
  preferredLanguage: string | null;

  /** Opted In / Opted Out / Unknown — snapshot at send time */
  @Column({ name: 'consent_status', length: 20, default: 'Unknown' })
  consentStatus: string;

  // ── 3. Scheduling & trigger ─────────────────────────────────────────────
  /** Deadline / Missing Documents / Offer Release (free text allowed for system triggers) */
  @Column({ name: 'trigger_event', type: 'varchar', length: 100, nullable: true })
  triggerEvent: string | null;

  @Index()
  @Column({ name: 'scheduled_at', type: 'timestamptz', nullable: true })
  scheduledAt: Date | null;

  /** High / Normal / Low */
  @Column({ length: 10, default: 'Normal' })
  priority: string;

  @Column({ name: 'time_zone', type: 'varchar', length: 64, nullable: true })
  timeZone: string | null;

  // ── 4. Delivery & tracking ──────────────────────────────────────────────
  /** Sent / Failed / Delivered (+ Scheduled / Queued / Blocked) */
  @Index()
  @Column({ name: 'sent_status', length: 20, default: 'Queued' })
  sentStatus: string;

  /** WhatsApp only: 'Read' | 'Unread' */
  @Column({ name: 'read_status', type: 'varchar', length: 20, nullable: true })
  readStatus: string | null;

  @Column({ name: 'sent_at', type: 'timestamptz', nullable: true })
  sentAt: Date | null;

  @Column({ name: 'delivered_at', type: 'timestamptz', nullable: true })
  deliveredAt: Date | null;

  @Column({ name: 'read_at', type: 'timestamptz', nullable: true })
  readAt: Date | null;

  @Column({ name: 'failure_reason', type: 'text', nullable: true })
  failureReason: string | null;

  /** Provider ID: 'twilio' | 'gupshup' | 'msg91' */
  @Column({ type: 'varchar', length: 30, nullable: true })
  provider: string | null;

  @Index()
  @Column({ name: 'provider_message_id', type: 'varchar', length: 150, nullable: true })
  providerMessageId: string | null;

  @Column({ name: 'attempts', type: 'int', default: 0 })
  attempts: number;

  /** Who sent it (user id) — null = system */
  @Column({ name: 'sent_by_user_id', type: 'uuid', nullable: true })
  sentByUserId: string | null;

  @Column({ name: 'sent_by_name', type: 'varchar', length: 255, nullable: true })
  sentByName: string | null;

  /** Inbound replies are logged too (direction = 'Inbound'). */
  @Column({ length: 20, default: 'Outbound' })
  direction: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
