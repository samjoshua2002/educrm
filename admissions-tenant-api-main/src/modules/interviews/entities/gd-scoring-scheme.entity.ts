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

export interface GdSchemeParameter {
  key: string;
  name: string;
  maxMarks: number;
}

export interface GdSchemeComponent {
  key: string;
  label: string;
  // Which interview's panel evaluations (rubric scores) feed this component.
  // null = entered manually on the candidate's GD & Interview page only.
  interviewType: 'GD' | 'PI' | null;
  maxMarks: number;
  // Points this component contributes to the composite score when the
  // candidate gets full marks: contribution = raw / maxMarks x compositeWeight.
  compositeWeight: number;
  includeInComposite: boolean;
  // Optional break-down. When present, the raw component score is the sum of
  // the parameter marks (and maxMarks should equal the sum of their maxima).
  parameters: GdSchemeParameter[];
}

// Owner request: admins can define their own GD/PI scoring scheme. The
// predefined "Standard" template (GD /10, PI /30, existing composite formula)
// is NOT stored here: it is a constant (see gd-scoring-schemes.service.ts)
// and is used whenever ScoreConversionConfig.gdScoringSchemeId is null.
@Entity('gd_scoring_schemes')
export class GdScoringScheme {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ length: 150 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  components: GdSchemeComponent[];

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
