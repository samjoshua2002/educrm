import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Generated,
} from 'typeorm';
import { Application } from '../../applications/entities/application.entity.js';

export const REMINDER_TYPES = ['Fee Pending', 'Docs Missing', 'Deadline'] as const;
export const TRIGGER_EVENTS = ['Status change', 'Time-based'] as const;
export const REMINDER_CHANNELS = ['Email', 'SMS', 'WhatsApp', 'In-app'] as const;
export const REMINDER_STATUSES = ['Sent', 'Failed'] as const;
export const APPLICANT_RESPONSES = ['Completed', 'No Action'] as const;

/**
 * Reminders & Nudges fields (scope p.21): Reminder_ID, Application_ID,
 * Reminder_Type, Trigger_Event, Reminder_Channel (multi), Reminder_Template,
 * Reminder_Sent_Date, Reminder_Status, Attempt_Count, Next_Scheduled_Date,
 * Applicant_Response, Auto_Close.
 */
@Entity('application_reminders')
@Index(['organizationId', 'applicationId'])
@Index(['isClosed', 'nextScheduledDate'])
export class Reminder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Reminder_ID — auto number */
  @Column({ name: 'reminder_no', type: 'int' })
  @Generated('increment')
  reminderNo: number;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ name: 'application_id', type: 'uuid' })
  applicationId: string;

  @ManyToOne(() => Application, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'application_id' })
  application: Application;

  /** Rule scenario that created it: fee_not_paid | documents_missing | documents_rejected | deadline_approaching */
  @Column({ type: 'varchar', length: 40 })
  scenario: string;

  /** 'Fee Pending' | 'Docs Missing' | 'Deadline' */
  @Column({ name: 'reminder_type', type: 'varchar', length: 20 })
  reminderType: string;

  /** 'Status change' | 'Time-based' */
  @Column({ name: 'trigger_event', type: 'varchar', length: 20 })
  triggerEvent: string;

  /** Multi-select: Email / SMS / WhatsApp / In-app */
  @Column({ name: 'reminder_channels', type: 'jsonb', default: () => "'[]'" })
  reminderChannels: string[];

  /** Template reference (email_templates.id) */
  @Column({ name: 'reminder_template_id', type: 'uuid', nullable: true })
  reminderTemplateId: string | null;

  @Column({ name: 'reminder_template_name', type: 'varchar', length: 255, nullable: true })
  reminderTemplateName: string | null;

  @Column({ name: 'reminder_sent_date', type: 'timestamp', nullable: true })
  reminderSentDate: Date | null;

  /** 'Sent' | 'Failed' — null until the first attempt. */
  @Column({ name: 'reminder_status', type: 'varchar', length: 10, nullable: true })
  reminderStatus: string | null;

  @Column({ name: 'attempt_count', type: 'int', default: 0 })
  attemptCount: number;

  @Column({ name: 'next_scheduled_date', type: 'timestamp', nullable: true })
  nextScheduledDate: Date | null;

  /** 'Completed' | 'No Action' */
  @Column({ name: 'applicant_response', type: 'varchar', length: 20, default: 'No Action' })
  applicantResponse: string;

  @Column({ name: 'auto_close', default: true })
  autoClose: boolean;

  @Column({ name: 'is_closed', default: false })
  isClosed: boolean;

  @Column({ name: 'closed_at', type: 'timestamp', nullable: true })
  closedAt: Date | null;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError: string | null;

  /** Per-channel result of the latest attempt. */
  @Column({ name: 'channel_results', type: 'jsonb', nullable: true })
  channelResults: Record<string, { success: boolean; error?: string; at: string }> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
