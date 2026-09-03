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

// Phase 6b — Rejections module. Created automatically when
// AdmissionDecisionsService.finalizeDecision locks a decision with
// finalDecision = 'rejected' (see RejectionService.createRejectionRecord),
// but can also be created standalone for rejections that happen outside the
// decision workflow (e.g. a verification-stage rejection).
export enum RejectionReason {
  BELOW_CUTOFF = 'below_cutoff',
  INCOMPLETE_DOCUMENTS = 'incomplete_documents',
  FAILED_INTERVIEW = 'failed_interview',
  SEAT_UNAVAILABLE = 'seat_unavailable',
  OTHER = 'other',
}

@Entity('rejections')
export class Rejection {
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

  @Column({
    name: 'rejection_reason',
    type: 'enum',
    enum: RejectionReason,
    default: RejectionReason.OTHER,
  })
  rejectionReason: RejectionReason;

  @Column({ name: 'detailed_reason', type: 'text', nullable: true })
  detailedReason: string;

  @Column({ name: 'rejection_date', default: () => 'CURRENT_TIMESTAMP' })
  rejectionDate: Date;

  @Column({ name: 'communication_sent', default: false })
  communicationSent: boolean;

  @Column({ name: 'alternate_options_suggested', type: 'text', nullable: true })
  alternateOptionsSuggested: string;

  @Column({ name: 'eligible_for_reapply', default: true })
  eligibleForReapply: boolean;

  @Column({ name: 'next_intake', length: 100, nullable: true })
  nextIntake: string;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
