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
import { Application } from '../../applications/entities/application.entity.js';
import { User } from '../../users/entities/user.entity.js';

// Phase 6a — Admission Decisions module. One (typically) active,
// non-locked AdmissionDecision per Application, progressing through
// decisionStage until finalizeDecision() locks it. See
// AdmissionDecisionsService for the stage-progression / finalize rules.
@Entity('admission_decisions')
export class AdmissionDecision {
  @PrimaryGeneratedColumn('uuid')
  id: string;

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
  decisionStage: string; // 'under_review' | 'committee_review' | 'final_approval' | 'decision_released'

  @Column({ name: 'final_decision', length: 20, nullable: true })
  finalDecision: string; // 'offer_made' | 'waitlisted' | 'rejected'

  // Mirrors Interview.assignedPanel — array of User ids sitting on the
  // decision committee for this application.
  @Column({ name: 'decision_committee', type: 'uuid', array: true, default: () => "'{}'" })
  decisionCommittee: string[];

  // Snapshot of Application.compositeScore at the time the decision record
  // was created/updated — read via ScoringService.getCompositeScoreBreakdown,
  // never recomputed here (Phase 5 scoring internals are off-limits).
  @Column({ name: 'decision_score', type: 'decimal', precision: 6, scale: 2, nullable: true })
  decisionScore: number;

  @Column({ name: 'decision_date', nullable: true })
  decisionDate: Date;

  @Column({ name: 'approved_by', type: 'uuid', nullable: true })
  approvedBy: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'approved_by' })
  approvedByUser: User;

  @Column({ name: 'approval_status', length: 20, default: 'pending' })
  approvalStatus: string; // 'pending' | 'approved' | 'rejected'

  @Column({ name: 'internal_remarks', type: 'text', nullable: true })
  internalRemarks: string;

  @Column({ name: 'applicant_visible', default: false })
  applicantVisible: boolean;

  @Column({ name: 'decision_locked', default: false })
  decisionLocked: boolean;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
