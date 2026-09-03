import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { OfferLetter } from './offer-letter.entity.js';

// Phase 6b — Offer Acceptances module. Created automatically (see
// AcceptanceService.createAcceptanceRecord, invoked from
// OfferLettersService.sendOfferLetter) once an offer letter is sent, and
// tracks the candidate's seat-booking-fee payment + confirmation before
// AdmissionDecision's 'offer_made' outcome is treated as a confirmed seat.
export enum AcceptanceStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  EXPIRED = 'expired',
}

@Entity('offer_acceptances')
export class OfferAcceptance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

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

  @Column({ name: 'candidate_confirmation_date', nullable: true })
  candidateConfirmationDate: Date;

  @Column({ name: 'acceptance_deadline', type: 'date', nullable: true })
  acceptanceDeadline: Date;

  @Column({ name: 'seat_booking_fee', type: 'decimal', precision: 10, scale: 2, default: 0 })
  seatBookingFee: number;

  // Kept as a plain string (not an enum) since it mirrors PaymentOrderStatus
  // values ('pending' | 'paid' | 'failed') without a hard DB-level coupling
  // to the payments module's enum.
  @Column({ name: 'fee_payment_status', length: 20, default: 'pending' })
  feePaymentStatus: string;

  @Column({ name: 'payment_reference_id', length: 100, nullable: true })
  paymentReferenceId: string;

  @Column({ name: 'onboarding_package_sent', default: false })
  onboardingPackageSent: boolean;

  @Column({ name: 'onboarding_info', type: 'text', nullable: true })
  onboardingInfo: string;

  @Column({ name: 'enrollment_status', length: 30, default: 'not_enrolled' })
  enrollmentStatus: string; // 'not_enrolled' | 'confirmed'

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
