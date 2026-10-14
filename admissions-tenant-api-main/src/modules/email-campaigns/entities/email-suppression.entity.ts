import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

/**
 * Email suppression list (unsubscribes, hard bounces, manual blocks).
 * Honored by email campaigns, compose / scheduled emails and template-based
 * transactional emails.
 */
@Entity('email_suppressions')
@Index(['organizationId', 'email'], { unique: true })
export class EmailSuppression {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  /** Lower-cased email address */
  @Column({ length: 255 })
  email: string;

  /** 'Unsubscribed' | 'Hard Bounce' | 'Manual' */
  @Column({ length: 30, default: 'Unsubscribed' })
  reason: string;

  @Column({ name: 'campaign_id', type: 'uuid', nullable: true })
  campaignId: string | null;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
