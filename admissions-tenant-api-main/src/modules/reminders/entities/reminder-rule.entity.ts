import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export const REMINDER_SCENARIOS = {
  fee_not_paid: {
    label: 'Application started but fee not paid',
    reminderType: 'Fee Pending',
    triggerEvent: 'Time-based',
  },
  documents_missing: {
    label: 'Fee paid but documents missing',
    reminderType: 'Docs Missing',
    triggerEvent: 'Status change',
  },
  documents_rejected: {
    label: 'Documents rejected — re-upload required',
    reminderType: 'Docs Missing',
    triggerEvent: 'Status change',
  },
  deadline_approaching: {
    label: 'Deadline approaching',
    reminderType: 'Deadline',
    triggerEvent: 'Time-based',
  },
} as const;
export type ReminderScenario = keyof typeof REMINDER_SCENARIOS;

/** Per-organization rule of the reminders automation engine. */
@Entity('reminder_rules')
@Index(['organizationId', 'scenario'], { unique: true })
export class ReminderRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ type: 'varchar', length: 40 })
  scenario: string;

  @Column({ name: 'is_enabled', default: true })
  isEnabled: boolean;

  @Column({ type: 'jsonb', default: () => `'["Email","In-app"]'` })
  channels: string[];

  @Column({ name: 'template_id', type: 'uuid', nullable: true })
  templateId: string | null;

  /** Wait after the trigger before the first reminder. */
  @Column({ name: 'first_reminder_after_hours', type: 'int', default: 24 })
  firstReminderAfterHours: number;

  /** Configurable reminder frequency (repeat interval). */
  @Column({ name: 'frequency_hours', type: 'int', default: 48 })
  frequencyHours: number;

  @Column({ name: 'max_attempts', type: 'int', default: 3 })
  maxAttempts: number;

  @Column({ name: 'auto_close', default: true })
  autoClose: boolean;

  /** deadline_approaching only — the application deadline. */
  @Column({ name: 'deadline_date', type: 'date', nullable: true })
  deadlineDate: string | null;

  /** deadline_approaching only — start reminding N days before the deadline. */
  @Column({ name: 'deadline_days_before', type: 'int', default: 7 })
  deadlineDaysBefore: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
