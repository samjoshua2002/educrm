import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity.js';

// A single row per org. `bands` holds the admin-editable lookup tables used to
// convert raw academic %/test percentile into points, e.g.:
// {
//   "tenth":      [{ "minPercent": 90, "points": 10 }, { "minPercent": 80, "points": 8 }, ...],
//   "twelfth":    [...],
//   "ug":         [...],
//   "testPercentile": [{ "minPercentile": 99, "points": 10 }, ...]
// }
@Entity('score_conversion_configs')
export class ScoreConversionConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid', unique: true })
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ type: 'jsonb' })
  bands: Record<string, Array<{ minPercent?: number; minPercentile?: number; minYears?: number; points: number }>>;

  @Column({ name: 'discrepancy_threshold', type: 'decimal', precision: 5, scale: 2, default: 10 })
  discrepancyThreshold: number;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
