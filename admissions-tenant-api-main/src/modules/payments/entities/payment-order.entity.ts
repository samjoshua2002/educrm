import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Application } from '../../applications/entities/application.entity.js';
import { OfferAcceptance } from '../../admissions-decisions/entities/offer-acceptance.entity.js';

export enum PaymentOrderStatus {
  CREATED = 'created',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

// Phase 6b — distinguishes the original (Phase "start") application-fee
// payment flow from the new seat-booking-fee flow so PaymentsService.markPaid
// can branch on which downstream record to update. Defaults to
// APPLICATION_FEE so every pre-existing row/behavior is unaffected.
export enum PaymentOrderPurpose {
  APPLICATION_FEE = 'application_fee',
  SEAT_BOOKING_FEE = 'seat_booking_fee',
}

@Entity('payment_orders')
export class PaymentOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'application_id' })
  applicationId: string;

  @ManyToOne(() => Application, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'application_id' })
  application: Application;

  @Column({ name: 'razorpay_order_id', length: 100 })
  razorpayOrderId: string;

  @Column({ name: 'razorpay_payment_id', length: 100, nullable: true })
  razorpayPaymentId: string;

  @Column({ name: 'razorpay_signature', length: 255, nullable: true })
  razorpaySignature: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ length: 10, default: 'INR' })
  currency: string;

  @Column({
    type: 'enum',
    enum: PaymentOrderStatus,
    default: PaymentOrderStatus.CREATED,
  })
  status: PaymentOrderStatus;

  @Column({ length: 50, nullable: true })
  method: string;

  @Column({
    type: 'enum',
    enum: PaymentOrderPurpose,
    default: PaymentOrderPurpose.APPLICATION_FEE,
  })
  purpose: PaymentOrderPurpose;

  @Column({ name: 'offer_acceptance_id', type: 'uuid', nullable: true })
  offerAcceptanceId: string;

  @ManyToOne(() => OfferAcceptance, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'offer_acceptance_id' })
  offerAcceptance: OfferAcceptance;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'paid_at', nullable: true })
  paidAt: Date;
}
