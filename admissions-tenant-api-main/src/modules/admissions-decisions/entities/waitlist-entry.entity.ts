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

// Phase 6b — Waitlist Management module. Created automatically when
// AdmissionDecisionsService.finalizeDecision locks a decision with
// finalDecision = 'waitlisted' (see WaitlistService.addToWaitlist).
export enum WaitlistStatus {
  ACTIVE = 'active',
  OFFER_RELEASED = 'offer_released',
  CONVERTED = 'converted',
  CLOSED = 'closed',
}

@Entity('waitlist_entries')
export class WaitlistEntry {
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

  @Column({ name: 'waitlist_rank', type: 'int', nullable: true })
  waitlistRank: number;

  @Column({
    name: 'waitlist_status',
    type: 'enum',
    enum: WaitlistStatus,
    default: WaitlistStatus.ACTIVE,
  })
  waitlistStatus: WaitlistStatus;

  @Column({ name: 'movement_trigger', length: 100, nullable: true })
  movementTrigger: string;

  @Column({ name: 'alternate_program_offered', length: 255, nullable: true })
  alternateProgramOffered: string;

  @Column({ name: 'offer_released', default: false })
  offerReleased: boolean;

  @Column({ name: 'communication_sent', default: false })
  communicationSent: boolean;

  @Column({ name: 'last_review_date', type: 'date', nullable: true })
  lastReviewDate: Date;

  @Column({ name: 'remarks', type: 'text', nullable: true })
  remarks: string;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
