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
  bands: Record<string, Array<{ minPercent?: number; minPercentile?: number; minYears?: number; minMonths?: number; points: number }>>;

  @Column({ name: 'discrepancy_threshold', type: 'decimal', precision: 5, scale: 2, default: 10 })
  discrepancyThreshold: number;

  @Column({ name: 'qualifying_score', type: 'decimal', precision: 5, scale: 2, default: 50, nullable: true })
  qualifyingScore: number;

  @Column({ name: 'results_announced', type: 'boolean', default: false })
  resultsAnnounced: boolean;

  @Column({ name: 'results_declaration_date', type: 'timestamptz', nullable: true })
  resultsDeclarationDate: Date;

  @Column({ name: 'auto_announce_results', type: 'boolean', default: false })
  autoAnnounceResults: boolean;

  // Entrance exam scoring mode (owner request):
  //  - best_overall (default, existing behaviour): the single best
  //    percentile across ALL entrance tests, scored on bands.testPercentile.
  //  - cat_split: CAT is scored on its own (bands.catPercentile x catWeight%)
  //    and the best percentile among non-CAT exams (XAT, MAT, CMAT, GMAT,
  //    GRE, ...) is scored on bands.otherTestPercentile x otherTestWeight%.
  //    The entrance component is the sum of the two.
  @Column({ name: 'entrance_scoring_mode', length: 20, default: 'best_overall' })
  entranceScoringMode: string;

  @Column({ name: 'cat_weight', type: 'decimal', precision: 6, scale: 2, default: 100 })
  catWeight: number;

  @Column({ name: 'other_test_weight', type: 'decimal', precision: 6, scale: 2, default: 100 })
  otherTestWeight: number;

  // Selected GD/PI scoring scheme (owner request). null = the predefined
  // "Standard" template (GD /10, PI /30, existing composite formula).
  @Column({ name: 'gd_scoring_scheme_id', type: 'uuid', nullable: true })
  gdScoringSchemeId: string | null;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
