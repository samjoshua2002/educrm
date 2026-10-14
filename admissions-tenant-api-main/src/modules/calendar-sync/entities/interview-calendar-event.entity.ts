import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

// The calendar event created for one interview (one per interview, in the
// organiser's calendar; the rest of the panel and the candidate are invited
// as attendees).
@Entity('interview_calendar_events')
export class InterviewCalendarEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Index({ unique: true })
  @Column({ name: 'interview_id', type: 'uuid' })
  interviewId: string;

  @Column({ name: 'calendar_sync_id', type: 'uuid', nullable: true })
  calendarSyncId: string | null;

  @Column({ name: 'interviewer_id', type: 'uuid', nullable: true })
  interviewerId: string | null;

  @Column({ name: 'calendar_provider', type: 'varchar', length: 30, nullable: true })
  calendarProvider: string | null;

  @Column({ name: 'event_id', type: 'varchar', length: 255, nullable: true })
  eventId: string | null;

  @Column({ name: 'meeting_link', type: 'text', nullable: true })
  meetingLink: string | null;

  // 'Synced' | 'Failed' | 'Not Connected' | 'Deleted'
  @Column({ name: 'sync_status', length: 20, default: 'Not Connected' })
  syncStatus: string;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError: string | null;

  @Column({ name: 'last_sync_time', type: 'timestamptz', nullable: true })
  lastSyncTime: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
