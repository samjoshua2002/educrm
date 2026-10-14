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
import { User } from '../../users/entities/user.entity.js';

// Scope: Shortlisting Rules (API Name: Shortlisting_Rules).
@Entity('shortlisting_rules')
export class ShortlistingRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Rule_ID (Auto Number)
  @Column({ name: 'rule_number', type: 'int' })
  @Generated('increment')
  ruleNumber: number;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  // Program (Pick List)
  @Column({ length: 255 })
  program: string;

  // Academic_Year (Pick List)
  @Column({ name: 'academic_year', length: 20 })
  academicYear: string;

  // Minimum_GPA (Decimal)
  @Column({ name: 'min_gpa', type: 'decimal', precision: 5, scale: 2, nullable: true })
  minGpa: number;

  // Minimum_Test_Score (Number) — minimum best entrance-test percentile
  @Column({ name: 'min_test_score', type: 'decimal', precision: 5, scale: 2, nullable: true })
  minTestScore: number;

  // Work_Experience (Years) (Number)
  @Column({ name: 'min_experience_years', type: 'decimal', precision: 4, scale: 1, nullable: true })
  minExperienceYears: number;

  // Academic_Weightage / Test_Weightage / Experience_Weightage (Number %)
  @Column({ name: 'academic_weightage', type: 'decimal', precision: 5, scale: 2, default: 0 })
  academicWeightage: number;

  @Column({ name: 'test_weightage', type: 'decimal', precision: 5, scale: 2, default: 0 })
  testWeightage: number;

  @Column({ name: 'experience_weightage', type: 'decimal', precision: 5, scale: 2, default: 0 })
  experienceWeightage: number;

  // Cutoff_Score (Number)
  @Column({ name: 'cutoff_score', type: 'decimal', precision: 5, scale: 2 })
  cutoffScore: number;

  // Rule_Status (Pick List: Active / Inactive) — stored lower-case
  @Column({ length: 20, default: 'active' })
  status: string;

  // Created_By (Lookup Users). No FK constraint so legacy rows whose
  // creator id is not in users keep loading.
  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string;

  @ManyToOne(() => User, { createForeignKeyConstraints: false, nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
