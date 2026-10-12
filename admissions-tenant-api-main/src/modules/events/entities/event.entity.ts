import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('announcement_events')
export class AnnouncementEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId: string | null;

  @Column({ length: 255 })
  title: string;

  @Column({ length: 50, default: 'announcement' })
  type: string; // 'announcement' | 'event'

  @Index()
  @Column({ length: 100, default: 'General Notice' })
  category: string;

  @Column({ length: 50, default: 'Medium' })
  priority: string; // 'Low' | 'Medium' | 'High' | 'Urgent'

  @Index()
  @Column({ length: 50, default: 'Published' })
  status: string; // 'Draft' | 'Published' | 'Scheduled' | 'Archived'

  @Column({ name: 'target_audience', type: 'jsonb', default: () => "'[]'" })
  targetAudience: string[];

  @Column({ name: 'target_course_id', type: 'varchar', length: 100, nullable: true })
  targetCourseId: string | null;

  @Column({ name: 'target_lead_stages', type: 'jsonb', default: () => "'[]'" })
  targetLeadStages: string[];

  @Column({ name: 'event_start_date', type: 'varchar', length: 50, nullable: true })
  eventStartDate: string | null;

  @Column({ name: 'event_end_date', type: 'varchar', length: 50, nullable: true })
  eventEndDate: string | null;

  @Column({ name: 'event_start_time', type: 'varchar', length: 50, nullable: true })
  eventStartTime: string | null;

  @Column({ name: 'event_end_time', type: 'varchar', length: 50, nullable: true })
  eventEndTime: string | null;

  @Column({ name: 'venue_type', length: 50, default: 'in_person' })
  venueType: string; // 'in_person' | 'virtual' | 'hybrid'

  @Column({ name: 'venue_location', type: 'text', nullable: true })
  venueLocation: string | null;

  @Column({ name: 'scheduled_publish_date', type: 'varchar', length: 50, nullable: true })
  scheduledPublishDate: string | null;

  @Column({ name: 'scheduled_publish_time', type: 'varchar', length: 50, nullable: true })
  scheduledPublishTime: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'poster_url', type: 'text', nullable: true })
  posterUrl: string | null;

  @Column({ name: 'attachment_url', type: 'text', nullable: true })
  attachmentUrl: string | null;

  @Column({ name: 'attachment_name', type: 'varchar', length: 255, nullable: true })
  attachmentName: string | null;

  @Column({ name: 'attachment_type', length: 50, default: 'other' })
  attachmentType: string;

  @Column({ name: 'send_in_app_notification', default: true })
  sendInAppNotification: boolean;

  @Column({ name: 'send_email_broadcast', default: false })
  sendEmailBroadcast: boolean;

  @Column({ name: 'send_whatsapp', default: false })
  sendWhatsapp: boolean;

  @Column({ name: 'email_template_id', type: 'varchar', length: 100, nullable: true })
  emailTemplateId: string | null;

  @Column({ name: 'created_by_id', type: 'uuid', nullable: true })
  createdById: string | null;

  @Column({ name: 'created_by_name', type: 'varchar', length: 150, nullable: true })
  createdByName: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
