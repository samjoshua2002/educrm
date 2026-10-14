import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Generated,
} from 'typeorm';

export const CALL_TYPES = ['Inbound', 'Outbound', 'Missed'] as const;
/** Scope statuses + 'In Progress' while a provider call is still running. */
export const CALL_STATUSES = ['Answered', 'Not Answered', 'Busy', 'Dropped', 'In Progress'] as const;
export const CALL_OUTCOMES = ['Interested', 'Not Interested', 'Follow-up Required'] as const;

/** Call log (scope: Communication Management §3 Call Management). */
@Entity('call_logs')
export class CallLog {
  /** Call ID (Primary Key) */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Display number → "CALL-000123" */
  @Column({ name: 'call_no', type: 'int' })
  @Generated('increment')
  callNo: number;

  @Index()
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  // ── 1. Call information ────────────────────────────────────────────────
  /** Applicant ID (FK → applications.id) */
  @Index()
  @Column({ name: 'application_id', type: 'uuid', nullable: true })
  applicationId: string | null;

  @Index()
  @Column({ name: 'lead_id', type: 'uuid', nullable: true })
  leadId: string | null;

  @Column({ name: 'application_no', type: 'varchar', length: 100, nullable: true })
  applicationNo: string | null;

  @Column({ name: 'applicant_name', type: 'varchar', length: 255, nullable: true })
  applicantName: string | null;

  /** Contact Number (national digits) */
  @Index()
  @Column({ name: 'contact_number', length: 30 })
  contactNumber: string;

  @Column({ name: 'country_code', length: 6, default: '91' })
  countryCode: string;

  @Column({ name: 'program_interested', type: 'varchar', length: 255, nullable: true })
  programInterested: string | null;

  /** Inbound / Outbound / Missed */
  @Column({ name: 'call_type', length: 20, default: 'Outbound' })
  callType: string;

  @Index()
  @Column({ name: 'call_start_time', type: 'timestamptz', nullable: true })
  callStartTime: Date | null;

  @Column({ name: 'call_end_time', type: 'timestamptz', nullable: true })
  callEndTime: Date | null;

  /** Call Duration (seconds) */
  @Column({ name: 'duration_seconds', type: 'int', default: 0 })
  durationSeconds: number;

  /** Answered / Not Answered / Busy / Dropped (+ In Progress) */
  @Column({ name: 'call_status', length: 20, default: 'Answered' })
  callStatus: string;

  // ── 2. Agent details ───────────────────────────────────────────────────
  @Index()
  @Column({ name: 'agent_user_id', type: 'uuid', nullable: true })
  agentUserId: string | null;

  @Column({ name: 'agent_name', type: 'varchar', length: 255, nullable: true })
  agentName: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  department: string | null;

  /** Extension / Device ID (agent phone, SIP extension…) */
  @Column({ name: 'extension_device_id', type: 'varchar', length: 120, nullable: true })
  extensionDeviceId: string | null;

  // ── 3. Recording & notes ───────────────────────────────────────────────
  @Column({ name: 'recording_url', type: 'text', nullable: true })
  recordingUrl: string | null;

  @Column({ type: 'text', nullable: true })
  transcription: string | null;

  @Column({ name: 'agent_notes', type: 'text', nullable: true })
  agentNotes: string | null;

  /** Interested / Not Interested / Follow-up Required */
  @Column({ name: 'call_outcome', type: 'varchar', length: 30, nullable: true })
  callOutcome: string | null;

  @Column({ name: 'follow_up_date', type: 'timestamptz', nullable: true })
  followUpDate: Date | null;

  // ── 4. Automation actions ──────────────────────────────────────────────
  /** Auto-SMS after missed call (Yes / No) */
  @Column({ name: 'auto_sms_after_missed_call', default: false })
  autoSmsAfterMissedCall: boolean;

  @Column({ name: 'auto_sms_sent_at', type: 'timestamptz', nullable: true })
  autoSmsSentAt: Date | null;

  @Column({ name: 'auto_sms_message_log_id', type: 'uuid', nullable: true })
  autoSmsMessageLogId: string | null;

  @Column({ name: 'auto_sms_error', type: 'text', nullable: true })
  autoSmsError: string | null;

  /** Auto-create follow-up task */
  @Column({ name: 'auto_create_follow_up_task', default: false })
  autoCreateFollowUpTask: boolean;

  @Column({ name: 'follow_up_task_created_at', type: 'timestamptz', nullable: true })
  followUpTaskCreatedAt: Date | null;

  /** Auto-tag applicant based on conversation */
  @Column({ name: 'auto_tag_applicant', default: false })
  autoTagApplicant: boolean;

  /** Tags applied (manual + automatic) */
  @Column({ type: 'jsonb', default: () => "'[]'" })
  tags: string[];

  // ── Provider ───────────────────────────────────────────────────────────
  /** 'exotel' | 'twilio' | 'manual' */
  @Column({ length: 20, default: 'manual' })
  provider: string;

  @Index()
  @Column({ name: 'provider_call_id', type: 'varchar', length: 150, nullable: true })
  providerCallId: string | null;

  @Column({ name: 'provider_status', type: 'varchar', length: 50, nullable: true })
  providerStatus: string | null;

  @Column({ name: 'failure_reason', type: 'text', nullable: true })
  failureReason: string | null;

  /** Mirror row in communication_logs (timeline) */
  @Column({ name: 'communication_log_id', type: 'uuid', nullable: true })
  communicationLogId: string | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
