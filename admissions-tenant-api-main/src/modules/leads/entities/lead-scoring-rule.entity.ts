import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/** Scope 3 categories (Academic, Work Experience, Program Fit, Engagement, Geography, Email Bounce / Invalid) */
export const SCORING_CATEGORIES = [
  'Academic',
  'Work Experience',
  'Program Fit',
  'Engagement',
  'Geography',
  'Email Bounce / Invalid',
] as const;

/** Which sub-score the points roll up into. Total Lead Score = all of them. */
export type ScoreType = 'academic' | 'engagement' | 'profile';

export type RuleOperator =
  | 'gte'
  | 'lte'
  | 'gt'
  | 'lt'
  | 'eq'
  | 'neq'
  | 'in'
  | 'not_in'
  | 'contains'
  | 'exists'
  | 'is_true';

/**
 * One configurable scoring rule: "if <attribute> <operator> <value> then +/- points".
 * Evaluated by LeadScoringService against the lead's facts.
 */
@Entity('lead_scoring_rules')
export class LeadScoringRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ length: 50 })
  category: string;

  /** Human label shown in the UI and in the score breakdown, e.g. "GMAT/GRE Score >= 650" */
  @Column({ length: 255 })
  label: string;

  /** Fact key, see LeadScoringService.ATTRIBUTES */
  @Column({ length: 60 })
  attribute: string;

  @Column({ length: 20 })
  operator: RuleOperator;

  /** Comparison value; comma-separated for in / not_in */
  @Column({ type: 'text', nullable: true })
  value: string | null;

  @Column({ type: 'int' })
  points: number;

  @Column({ name: 'score_type', type: 'varchar', length: 20, default: 'profile' })
  scoreType: ScoreType;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
