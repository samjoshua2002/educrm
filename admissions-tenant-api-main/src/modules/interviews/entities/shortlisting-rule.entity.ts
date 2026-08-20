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

@Entity('shortlisting_rules')
export class ShortlistingRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ length: 255 })
  program: string;

  @Column({ name: 'academic_year', length: 20 })
  academicYear: string;

  @Column({ name: 'min_gpa', type: 'decimal', precision: 5, scale: 2, nullable: true })
  minGpa: number;

  @Column({ name: 'min_test_score', type: 'decimal', precision: 5, scale: 2, nullable: true })
  minTestScore: number;

  @Column({ name: 'min_experience_years', type: 'decimal', precision: 4, scale: 1, nullable: true })
  minExperienceYears: number;

  @Column({ name: 'academic_weightage', type: 'decimal', precision: 5, scale: 2, default: 0 })
  academicWeightage: number;

  @Column({ name: 'test_weightage', type: 'decimal', precision: 5, scale: 2, default: 0 })
  testWeightage: number;

  @Column({ name: 'experience_weightage', type: 'decimal', precision: 5, scale: 2, default: 0 })
  experienceWeightage: number;

  @Column({ name: 'cutoff_score', type: 'decimal', precision: 5, scale: 2 })
  cutoffScore: number;

  @Column({ length: 20, default: 'active' })
  status: string; // 'active' | 'inactive'

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
