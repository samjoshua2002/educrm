import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Generated,
} from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity.js';

// Scope: Evaluation Rubrics (API Name: Evaluation_Rubrics).
@Entity('evaluation_rubrics')
export class EvaluationRubric {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Rubric_ID (Auto Number)
  @Column({ name: 'rubric_number', type: 'int' })
  @Generated('increment')
  rubricNumber: number;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  // Interview_Type (Pick List: GD / PI)
  @Column({ name: 'interview_type', length: 20 })
  interviewType: string;

  // Parameter_Name (Single Line)
  @Column({ name: 'parameter_name', length: 255 })
  parameterName: string;

  // Max_Score (Number)
  @Column({ name: 'max_score', type: 'decimal', precision: 5, scale: 2 })
  maxScore: number;

  // Weightage (Number %)
  @Column({ name: 'weightage_percent', type: 'decimal', precision: 5, scale: 2, nullable: true })
  weightagePercent: number;

  // Description (Multi-line)
  @Column({ type: 'text', nullable: true })
  description: string;

  // Active (Checkbox)
  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
