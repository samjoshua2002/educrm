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
import { Application } from '../../applications/entities/application.entity.js';
import { User } from '../../users/entities/user.entity.js';

// Admission_Decisions (scope: Decision Workflow Engine).
// Stage order: under_review -> committee_review -> final_approval -> decision_released.
// See AdmissionDecisionsService for the workflow rules.
export const DECISION_STAGES = ['under_review', 'committee_review', 'final_approval', 'decision_released'] as const;
export const FINAL_DECISIONS = ['offer_made', 'waitlisted', 'rejected'] as const;
export const APPROVAL_STATUSES = ['pending', 'approved', 'rejected'] as const;

export interface CommitteeReview {
  userId: string;
  userName?: string;
  recommendation: 'offer_made' | 'waitlisted' | 'rejected';
  score?: number | null;
  comments?: string | null;
  reviewedAt: string;
}

@Entity('admission_decisions')
export class AdmissionDecision {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Decision ID (Auto Number)
  @Column({ name: 'decision_no', type: 'int' })
  @Generated('increment')
  decisionNo: number;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ name: 'application_id', type: 'uuid' })
  applicationId: string;

  @ManyToOne(() => Application, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'application_id' })
  application: Application;

  @Column({ name: 'decision_stage', length: 30, default: 'under_review' })
  decisionStage: string;

  @Column({ name: 'final_decision', length: 20, nullable: true })
  finalDecision: string; // null until approved

  // Decision Committee — Lookup (Users)
  @Column({ name: 'decision_committee', type: 'uuid', array: true, default: () => "'{}'" })
  decisionCommittee: string[];

  // Decision Committee — Lookup (Teams), see DecisionCommitteeTeam
  @Column({ name: 'decision_committee_team_ids', type: 'uuid', array: true, default: () => "'{}'" })
  decisionCommitteeTeamIds: string[];

  // Reviews recorded by committee members during committee_review.
  @Column({ name: 'committee_reviews', type: 'jsonb', default: () => "'[]'" })
  committeeReviews: CommitteeReview[];

  @Column({ name: 'decision_score', type: 'decimal', precision: 6, scale: 2, nullable: true })
  decisionScore: number | null;

  @Column({ name: 'decision_date', type: 'timestamp', nullable: true })
  decisionDate: Date | null;

  @Column({ name: 'approved_by', type: 'uuid', nullable: true })
  approvedBy: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'approved_by' })
  approvedByUser: User;

  @Column({ name: 'approval_status', length: 20, default: 'pending' })
  approvalStatus: string;

  @Column({ name: 'internal_remarks', type: 'text', nullable: true })
  internalRemarks: string | null;

  @Column({ name: 'applicant_visible', default: false })
  applicantVisible: boolean;

  @Column({ name: 'decision_locked', default: false })
  decisionLocked: boolean;

  @Column({ name: 'released_by', type: 'uuid', nullable: true })
  releasedBy: string | null;

  @Column({ name: 'released_at', type: 'timestamp', nullable: true })
  releasedAt: Date | null;

  // Set once the applicant-facing communication for the released decision went out.
  @Column({ name: 'applicant_notified_at', type: 'timestamp', nullable: true })
  applicantNotifiedAt: Date | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
