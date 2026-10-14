import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/** Per-organization knobs for scoring thresholds, default routing and duplicate handling. */
@Entity('lead_management_settings')
export class LeadManagementSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid', unique: true })
  organizationId: string;

  /** Lead Score >= hotThreshold → Hot */
  @Column({ name: 'hot_threshold', type: 'int', default: 25 })
  hotThreshold: number;

  /** Lead Score >= warmThreshold (and < hot) → Warm; below → Cold */
  @Column({ name: 'warm_threshold', type: 'int', default: 10 })
  warmThreshold: number;

  /** Fallback when no routing rule matches */
  @Column({ name: 'default_distribution', type: 'varchar', length: 20, default: 'round_robin' })
  defaultDistribution: 'round_robin' | 'load_based';

  /** Role pool used by the fallback distribution for new leads */
  @Column({ name: 'default_assignee_role', type: 'varchar', length: 50, default: 'lead_manager' })
  defaultAssigneeRole: string;

  /** Exact-match confidence at or above which a re-submission is folded into the existing lead (no new record) */
  @Column({ name: 'reentry_block_threshold', type: 'int', default: 95 })
  reentryBlockThreshold: number;

  /** Minimum confidence to flag a potential duplicate */
  @Column({ name: 'duplicate_flag_threshold', type: 'int', default: 70 })
  duplicateFlagThreshold: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
