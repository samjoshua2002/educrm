import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity.js';

// Per-organization settings for the decision / offer workflow.
@Entity('admission_decision_settings')
@Index(['organizationId'], { unique: true })
export class DecisionSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  // 'auto' = when an offer is declined / expires / is withdrawn, the next
  // ranked waitlisted applicant for that program gets an offer at once.
  // 'manual' = staff are notified and release the offer themselves.
  @Column({ name: 'waitlist_movement_mode', length: 10, default: 'auto' })
  waitlistMovementMode: string;

  // Default number of days an offer stays valid (Offer Valid Till).
  @Column({ name: 'offer_validity_days', type: 'int', default: 15 })
  offerValidityDays: number;

  // Default number of days the candidate has to accept (Acceptance Deadline).
  @Column({ name: 'acceptance_window_days', type: 'int', default: 15 })
  acceptanceWindowDays: number;

  // Seat booking fee; falls back to organization.settings.seatBookingFee.
  @Column({ name: 'seat_booking_fee', type: 'decimal', precision: 10, scale: 2, nullable: true })
  seatBookingFee: number | null;

  // Users (besides org admins) allowed to approve / finalize / release decisions.
  @Column({ name: 'approver_user_ids', type: 'uuid', array: true, default: () => "'{}'" })
  approverUserIds: string[];

  // When true, releasing an "Offer Made" decision generates and sends the
  // offer letter from the default template straight away.
  @Column({ name: 'auto_send_offer_on_release', default: false })
  autoSendOfferOnRelease: boolean;

  // Default text for the onboarding package email.
  @Column({ name: 'default_onboarding_info', type: 'text', nullable: true })
  defaultOnboardingInfo: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
