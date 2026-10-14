import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export const CAPTURE_EVENT_TYPES = ['Education Fair', 'Webinar', 'Open House', 'Campus Event', 'Seminar', 'Other'];

/**
 * Event used as a lead source: attendee lists are bulk-uploaded and walk-ins
 * register through a public QR registration page.
 */
@Entity('lead_capture_events')
export class LeadCaptureEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ length: 255 })
  name: string;

  @Column({ name: 'event_type', length: 50, default: 'Education Fair' })
  eventType: string;

  @Column({ name: 'event_date', type: 'date', nullable: true })
  eventDate: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  venue: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  /** Public QR registration slug */
  @Index({ unique: true })
  @Column({ length: 80 })
  slug: string;

  /** Optional default program for registrations */
  @Column({ name: 'course_id', type: 'uuid', nullable: true })
  courseId: string | null;

  @Column({ name: 'campaign_id', type: 'uuid', nullable: true })
  campaignId: string | null;

  /** Link to an announcement event of the Events module, when relevant */
  @Column({ name: 'announcement_event_id', type: 'uuid', nullable: true })
  announcementEventId: string | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'registration_count', type: 'int', default: 0 })
  registrationCount: number;

  @Column({ name: 'imported_count', type: 'int', default: 0 })
  importedCount: number;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
