import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

/**
 * One row per (campaign, email address). Its id is the opaque token used in
 * the tracking pixel, click redirects and the unsubscribe link.
 */
@Entity('email_campaign_recipients')
@Index(['campaignId', 'email'], { unique: true })
export class EmailCampaignRecipient {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'campaign_id', type: 'uuid' })
  campaignId: string;

  @Index()
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ name: 'application_id', type: 'uuid', nullable: true })
  applicationId: string | null;

  @Column({ name: 'lead_id', type: 'uuid', nullable: true })
  leadId: string | null;

  @Column({ name: 'application_no', type: 'varchar', length: 100, nullable: true })
  applicationNo: string | null;

  /** Prospects / Applicants / Admitted / Waitlisted */
  @Column({ name: 'audience_type', type: 'varchar', length: 20, nullable: true })
  audienceType: string | null;

  /** Lower-cased email */
  @Column({ length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  name: string | null;

  /** Pending / Sent / Delivered / Bounced / Failed / Unsubscribed / Stopped */
  @Column({ length: 20, default: 'Pending' })
  status: string;

  @Column({ name: 'send_count', type: 'int', default: 0 })
  sendCount: number;

  @Column({ name: 'last_sent_at', type: 'timestamptz', nullable: true })
  lastSentAt: Date | null;

  @Column({ name: 'delivered_at', type: 'timestamptz', nullable: true })
  deliveredAt: Date | null;

  @Column({ name: 'first_opened_at', type: 'timestamptz', nullable: true })
  firstOpenedAt: Date | null;

  @Column({ name: 'open_count', type: 'int', default: 0 })
  openCount: number;

  @Column({ name: 'first_clicked_at', type: 'timestamptz', nullable: true })
  firstClickedAt: Date | null;

  @Column({ name: 'click_count', type: 'int', default: 0 })
  clickCount: number;

  @Column({ name: 'bounced_at', type: 'timestamptz', nullable: true })
  bouncedAt: Date | null;

  @Column({ name: 'unsubscribed_at', type: 'timestamptz', nullable: true })
  unsubscribedAt: Date | null;

  @Column({ name: 'stopped_reason', type: 'varchar', length: 50, nullable: true })
  stoppedReason: string | null;

  @Column({ name: 'failure_reason', type: 'text', nullable: true })
  failureReason: string | null;

  @Column({ name: 'last_message_id', type: 'varchar', length: 255, nullable: true })
  lastMessageId: string | null;

  /** Latest communication_logs row for this recipient */
  @Column({ name: 'communication_log_id', type: 'uuid', nullable: true })
  communicationLogId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
