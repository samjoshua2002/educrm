import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
  Index,
} from 'typeorm';

// Marks entered on the candidate's GD & Interview page for one component of
// the selected GD scoring scheme (e.g. "GD" or "PI", or a custom component).
// Kept in the interviews module (not on Application) so each scheme keeps its
// own marks; schemeId is 'standard' for the predefined template.
@Entity('candidate_component_scores')
@Unique(['applicationId', 'schemeId', 'componentKey'])
export class CandidateComponentScore {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ name: 'application_id', type: 'uuid' })
  applicationId: string;

  @Column({ name: 'scheme_id', length: 64 })
  schemeId: string;

  @Column({ name: 'component_key', length: 64 })
  componentKey: string;

  // { [parameterKey]: marks } when the component has parameters.
  @Column({ name: 'parameter_scores', type: 'jsonb', nullable: true })
  parameterScores: Record<string, number> | null;

  @Column({ name: 'raw_score', type: 'decimal', precision: 7, scale: 2, nullable: true })
  rawScore: number | null;

  @Column({ type: 'text', nullable: true })
  remarks: string | null;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
