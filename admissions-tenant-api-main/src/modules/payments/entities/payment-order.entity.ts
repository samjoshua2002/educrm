import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Generated,
  Index,
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

/**
 * Application Fee Payment Integration fields (scope p.16):
 * Payment_ID (paymentNo), Application_ID, Payment_Status (status), Payment_Amount
 * (amount), Currency, Payment_Gateway (gateway), Transaction_ID (transactionId),
 * Payment_Method (method), Payment_Date (paidAt), Reconciliation_Status,
 * Refund_Status, Refund_Amount, Finance_Remarks.
 */
@Entity('payment_orders')
@Index(['gateway', 'gatewayOrderId'])
export class PaymentOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Payment_ID — auto number */
  @Column({ name: 'payment_no', type: 'int' })
  @Generated('increment')
  paymentNo: number;

  @Column({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId: string | null;

  /** 'razorpay' | 'payu' | 'stripe' | 'paytm' */
  @Column({ type: 'varchar', length: 20, default: 'razorpay' })
  gateway: string;

  /** Gateway order / session / txn reference used to start the checkout. */
  @Column({ name: 'gateway_order_id', type: 'varchar', length: 255, nullable: true })
  gatewayOrderId: string | null;

  /** Transaction_ID — gateway transaction reference of the captured payment. */
  @Column({ name: 'transaction_id', type: 'varchar', length: 255, nullable: true })
  transactionId: string | null;

  @Column({ name: 'is_international', default: false })
  isInternational: boolean;

  /** 'Matched' | 'Unmatched' */
  @Column({ name: 'reconciliation_status', type: 'varchar', length: 20, default: 'Unmatched' })
  reconciliationStatus: string;

  @Column({ name: 'reconciliation_notes', type: 'text', nullable: true })
  reconciliationNotes: string | null;

  @Column({ name: 'reconciled_by', type: 'uuid', nullable: true })
  reconciledBy: string | null;

  @Column({ name: 'reconciled_at', type: 'timestamp', nullable: true })
  reconciledAt: Date | null;

  @Column({ name: 'gateway_status', type: 'varchar', length: 30, nullable: true })
  gatewayStatus: string | null;

  @Column({ name: 'gateway_amount', type: 'decimal', precision: 12, scale: 2, nullable: true })
  gatewayAmount: number | null;

  @Column({ name: 'gateway_checked_at', type: 'timestamp', nullable: true })
  gatewayCheckedAt: Date | null;

  /** 'Not Initiated' | 'In Progress' | 'Completed' */
  @Column({ name: 'refund_status', type: 'varchar', length: 20, default: 'Not Initiated' })
  refundStatus: string;

  @Column({ name: 'refund_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  refundAmount: number;

  @Column({ name: 'finance_remarks', type: 'text', nullable: true })
  financeRemarks: string | null;

  @Column({ name: 'failure_reason', type: 'text', nullable: true })
  failureReason: string | null;

  @Column({ name: 'gateway_response', type: 'jsonb', nullable: true })
  gatewayResponse: Record<string, any> | null;

  /** Frontend page the student is sent back to after a redirect checkout. */
  @Column({ name: 'return_url', type: 'text', nullable: true })
  returnUrl: string | null;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'application_id' })
  applicationId: string;

  @ManyToOne(() => Application, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'application_id' })
  application: Application;

  @Column({ name: 'razorpay_order_id', type: 'varchar', length: 100, nullable: true })
  razorpayOrderId: string | null;

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
