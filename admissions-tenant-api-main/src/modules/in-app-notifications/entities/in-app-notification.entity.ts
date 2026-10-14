import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * In-app notification / alert.
 *
 * Audience rules:
 *  - organizationId = null  → platform-level (superadmin) notification
 *  - recipientUserId set    → only that user
 *  - recipientRole set      → every user of that role (or comma-separated roles) inside organizationId
 *  - neither set            → every STAFF user inside organizationId (students only see
 *                             rows addressed to them or to recipientRole "student")
 */
@Entity('in_app_notifications')
export class InAppNotification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId: string | null;

  @Index()
  @Column({ name: 'recipient_user_id', type: 'uuid', nullable: true })
  recipientUserId: string | null;

  @Column({ name: 'recipient_role', type: 'varchar', length: 50, nullable: true })
  recipientRole: string | null;

  /** Source module, e.g. 'leads' | 'applications' | 'interviews' | 'decisions' | 'payments' | 'communications' | 'announcements' | 'system' */
  @Index()
  @Column({ length: 50, default: 'system' })
  module: string;

  /** Machine-readable event type, e.g. 'lead.assigned', 'payment.failed' */
  @Column({ length: 100, default: 'general' })
  type: string;

  /** 'info' | 'success' | 'warning' | 'critical' */
  @Column({ length: 20, default: 'info' })
  severity: string;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  body: string | null;

  /** Frontend route to open when the notification is clicked */
  @Column({ type: 'varchar', length: 500, nullable: true })
  link: string | null;

  @Column({ name: 'related_entity_id', type: 'varchar', length: 100, nullable: true })
  relatedEntityId: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  /** User ids that have read this notification (supports broadcast notifications) */
  @Column({ name: 'read_by', type: 'jsonb', default: () => "'[]'" })
  readBy: string[];

  @Index()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
