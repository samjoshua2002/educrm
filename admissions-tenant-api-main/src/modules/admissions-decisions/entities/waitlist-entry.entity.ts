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

// Waitlist_Management (scope: Waitlist Management).
export enum WaitlistStatus {
  ACTIVE = 'active',
  OFFER_RELEASED = 'offer_released',
  CONVERTED = 'converted',
  CLOSED = 'closed',
}

// Movement Trigger picklist — what caused the entry to move.
export const MOVEMENT_TRIGGERS = [
  'offer_declined',
  'offer_expired',
  'offer_withdrawn',
  'acceptance_expired',
  'seat_added',
  'manual_review',
] as const;

@Entity('waitlist_entries')
export class WaitlistEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Waitlist ID (Auto Number)
  @Column({ name: 'waitlist_no', type: 'int' })
  @Generated('increment')
  waitlistNo: number;

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

  // Program the candidate is waitlisted for (ranking is per program).
  @Column({ name: 'program', type: 'varchar', length: 255, nullable: true })
  program: string | null;

  @Column({ name: 'waitlist_rank', type: 'int', nullable: true })
  waitlistRank: number | null;

  @Column({
    name: 'waitlist_status',
    type: 'enum',
    enum: WaitlistStatus,
    default: WaitlistStatus.ACTIVE,
  })
  waitlistStatus: WaitlistStatus;

  @Column({ name: 'movement_trigger', type: 'varchar', length: 100, nullable: true })
  movementTrigger: string | null;

  @Column({ name: 'alternate_program_offered', type: 'varchar', length: 255, nullable: true })
  alternateProgramOffered: string | null;

  @Column({ name: 'offer_released', default: false })
  offerReleased: boolean;

  @Column({ name: 'released_offer_id', type: 'uuid', nullable: true })
  releasedOfferId: string | null;

  @Column({ name: 'communication_sent', default: false })
  communicationSent: boolean;

  @Column({ name: 'last_review_date', type: 'date', nullable: true })
  lastReviewDate: Date | string | null;

  @Column({ name: 'remarks', type: 'text', nullable: true })
  remarks: string | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
