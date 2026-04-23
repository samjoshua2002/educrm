import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity.js';
import { Branch } from '../../branches/entities/branch.entity.js';

@Entity('leads')
export class Lead {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id' })
  organizationId: string;

  @Column({ name: 'branch_id', nullable: true })
  branchId: string;

  @Column({ name: 'first_name', length: 100, nullable: true })
  firstName: string;

  @Column({ name: 'last_name', length: 100, nullable: true })
  lastName: string;

  @Column({ length: 255, nullable: true })
  email: string;

  @Column({ length: 50, nullable: true })
  phone: string;

  @Column({ length: 100, nullable: true })
  country: string;

  @Column({ length: 100, nullable: true })
  state: string;

  @Column({ length: 100, nullable: true })
  city: string;

  @Column({ length: 100, nullable: true })
  source: string;

  @Column({ name: 'source_detail', type: 'text', nullable: true })
  sourceDetail: string;

  @Column({ name: 'utm_source', length: 100, nullable: true })
  utmSource: string;

  @Column({ name: 'utm_medium', length: 100, nullable: true })
  utmMedium: string;

  @Column({ name: 'utm_campaign', length: 100, nullable: true })
  utmCampaign: string;

  @Column({ name: 'form_id', type: 'uuid', nullable: true })
  formId: string;

  @Column({ name: 'campaign_id', type: 'uuid', nullable: true })
  campaignId: string;

  @Column({ name: 'is_duplicate', default: false })
  isDuplicate: boolean;

  @Column({ name: 'duplicate_count', default: 0 })
  duplicateCount: number;

  @Column({ name: 'raw_payload', type: 'jsonb', default: '{}' })
  rawPayload: any;

  @Column({ name: 'assigned_to', type: 'uuid', nullable: true })
  assignedTo: string;

  @Column({ name: 'assigned_at', nullable: true })
  assignedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @ManyToOne(() => Branch, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'branch_id' })
  branch: Branch;
}
