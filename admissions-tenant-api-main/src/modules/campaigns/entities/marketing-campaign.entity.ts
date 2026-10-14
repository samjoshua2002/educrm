import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Marketing campaign (Google Ads, Meta Ads, education fair, portal listing…).
 * Leads are mapped to a campaign via Lead.campaignId / utm_campaign, which
 * powers channel-ROI and campaign performance reports.
 */
@Entity('marketing_campaigns')
export class MarketingCampaign {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ length: 255 })
  name: string;

  /** Matches Lead.utmCampaign so leads are auto-mapped to this campaign */
  @Index()
  @Column({ name: 'utm_campaign', type: 'varchar', length: 150, nullable: true })
  utmCampaign: string | null;

  /** 'Paid Ads' | 'Organic' | 'Referral' | 'Event' | 'Portal' */
  @Column({ name: 'source_type', length: 50, default: 'Paid Ads' })
  sourceType: string;

  /** Specific platform, e.g. Google, Facebook, Shiksha */
  @Column({ name: 'sub_source', type: 'varchar', length: 100, nullable: true })
  subSource: string | null;

  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate: string | null;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate: string | null;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  cost: number;

  @Column({ length: 10, default: 'INR' })
  currency: string;

  /** 'Active' | 'Paused' | 'Completed' */
  @Column({ length: 20, default: 'Active' })
  status: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
