import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Generated,
  Unique,
  Index,
} from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity.js';
import { User } from '../../users/entities/user.entity.js';

// Scope: Interview Calendar Sync (API Name: Interview_Calendar_Sync) —
// calendar mapping for interviewers (Google / Outlook sync).
@Entity('interview_calendar_syncs')
@Unique(['interviewerId', 'calendarProvider'])
export class InterviewCalendarSync {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Calendar_Sync_ID (Auto Number)
  @Column({ name: 'calendar_sync_number', type: 'int' })
  @Generated('increment')
  calendarSyncNumber: number;

  @Index()
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  // Interviewer (Lookup Users)
  @Column({ name: 'interviewer_id', type: 'uuid' })
  interviewerId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'interviewer_id' })
  interviewer: User;

  // Calendar_Provider (Pick List: Google Calendar / Outlook)
  @Column({ name: 'calendar_provider', length: 30 })
  calendarProvider: string;

  // Calendar_Email (Email)
  @Column({ name: 'calendar_email', type: 'varchar', length: 255, nullable: true })
  calendarEmail: string | null;

  // Calendar_Event_ID (Single Line) — the latest event this mapping created.
  @Column({ name: 'calendar_event_id', type: 'varchar', length: 255, nullable: true })
  calendarEventId: string | null;

  // Sync_Status (Pick List: Not Connected / Connected / Synced / Failed /
  // Disconnected)
  @Column({ name: 'sync_status', length: 20, default: 'Not Connected' })
  syncStatus: string;

  // Last_Sync_Time (Date-Time)
  @Column({ name: 'last_sync_time', type: 'timestamptz', nullable: true })
  lastSyncTime: Date | null;

  // Availability_Window (Multi-line) — free time in working hours, filled
  // from the provider's free/busy data (editable by hand).
  @Column({ name: 'availability_window', type: 'text', nullable: true })
  availabilityWindow: string | null;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError: string | null;

  // OAuth tokens — never returned by the API.
  @Column({ name: 'access_token', type: 'text', nullable: true, select: false })
  accessToken: string | null;

  @Column({ name: 'refresh_token', type: 'text', nullable: true, select: false })
  refreshToken: string | null;

  @Column({ name: 'token_expires_at', type: 'timestamptz', nullable: true })
  tokenExpiresAt: Date | null;

  @Index()
  @Column({ name: 'oauth_state', type: 'varchar', length: 100, nullable: true, select: false })
  oauthState: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
