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
import { OfferLetter } from './offer-letter.entity.js';

// Offer_Acceptances (scope: Acceptance Management). Created automatically
// when an offer letter is sent (AcceptanceService.createAcceptanceRecord).
export enum AcceptanceStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  EXPIRED = 'expired',
}

export const FEE_PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'waived'] as const;
export const ENROLLMENT_STATUSES = ['not_enrolled', 'pending', 'confirmed', 'cancelled'] as const;

@Entity('offer_acceptances')
export class OfferAcceptance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Acceptance ID (Auto Number)
  @Column({ name: 'acceptance_no', type: 'int' })
  @Generated('increment')
  acceptanceNo: number;

  @Column({ name: 'offer_letter_id', type: 'uuid' })
  offerLetterId: string;

  @ManyToOne(() => OfferLetter, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'offer_letter_id' })
  offerLetter: OfferLetter;

  @Column({
    name: 'acceptance_status',
    type: 'enum',
    enum: AcceptanceStatus,
    default: AcceptanceStatus.PENDING,
  })
  acceptanceStatus: AcceptanceStatus;

  @Column({ name: 'candidate_confirmation_date', type: 'timestamp', nullable: true })
  candidateConfirmationDate: Date | null;

  @Column({ name: 'acceptance_deadline', type: 'date', nullable: true })
  acceptanceDeadline: Date | string | null;

  @Column({ name: 'seat_booking_fee', type: 'decimal', precision: 10, scale: 2, default: 0 })
  seatBookingFee: number;

  // Fee Payment Link (URL) — where the candidate pays the seat booking fee.
  @Column({ name: 'fee_payment_link', type: 'varchar', length: 500, nullable: true })
  feePaymentLink: string | null;

  // Mirrors PaymentOrderStatus ('pending' | 'paid' | 'failed') + 'waived'.
  @Column({ name: 'fee_payment_status', length: 20, default: 'pending' })
  feePaymentStatus: string;

  @Column({ name: 'payment_reference_id', length: 100, nullable: true })
  paymentReferenceId: string | null;

  @Column({ name: 'onboarding_package_sent', default: false })
  onboardingPackageSent: boolean;

  @Column({ name: 'onboarding_sent_at', type: 'timestamp', nullable: true })
  onboardingSentAt: Date | null;

  @Column({ name: 'onboarding_info', type: 'text', nullable: true })
  onboardingInfo: string | null;

  @Column({ name: 'enrollment_status', length: 30, default: 'not_enrolled' })
  enrollmentStatus: string;

  @Column({ name: 'decline_reason', type: 'text', nullable: true })
  declineReason: string | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
