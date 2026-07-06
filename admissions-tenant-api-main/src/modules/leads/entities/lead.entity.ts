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
import { User } from '../../users/entities/user.entity.js';
import { Course } from '../../courses/entities/course.entity.js';

export enum LeadStatus {
  UNVERIFIED = 'unverified',
  VERIFIED = 'verified',
  DISQUALIFIED = 'disqualified',
  WORKING = 'working',
  CONVERTED = 'converted',
  CLOSED = 'closed',
}

export enum LeadScoreBand {
  HOT = 'hot',
  WARM = 'warm',
  COLD = 'cold',
}

export enum LeadClosureReason {
  NOT_INTERESTED = 'not_interested',
  ENROLLED_ELSEWHERE = 'enrolled_elsewhere',
  UNREACHABLE = 'unreachable',
  INVALID_CONTACT = 'invalid_contact',
  DO_NOT_CALL = 'do_not_call',
  FINANCIAL_CONSTRAINTS = 'financial_constraints',
  TIMING_MISMATCH = 'timing_mismatch',
  OTHER = 'other',
}

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

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assigned_to' })
  assignedToUser: User;

  @Column({ name: 'assigned_at', nullable: true })
  assignedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({
    type: 'varchar',
    length: 50,
    default: LeadStatus.UNVERIFIED,
  })
  status: LeadStatus;

  @Column({ name: 'verified_by', type: 'uuid', nullable: true })
  verifiedBy: string;

  @Column({ name: 'verified_at', nullable: true })
  verifiedAt: Date;

  @Column({ type: 'int', nullable: true })
  score: number;

  @Column({ name: 'score_band', type: 'varchar', length: 20, nullable: true })
  scoreBand: LeadScoreBand;

  @Column({ name: 'next_follow_up_at', nullable: true })
  nextFollowUpAt: Date;

  @Column({ name: 'closure_reason', type: 'varchar', length: 100, nullable: true })
  closureReason: LeadClosureReason | null;

  @Column({ name: 'closure_notes', type: 'text', nullable: true })
  closureNotes: string | null;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @ManyToOne(() => Branch, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'branch_id' })
  branch: Branch;

  @Column({ name: 'course_id', type: 'uuid', nullable: true })
  courseId: string;

  @ManyToOne(() => Course, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'course_id' })
  course: Course;
}
