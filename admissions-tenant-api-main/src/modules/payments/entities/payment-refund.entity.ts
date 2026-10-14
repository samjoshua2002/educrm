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
import { PaymentOrder } from './payment-order.entity.js';

/** One full or partial refund issued through a gateway's refund API. */
@Entity('payment_refunds')
@Index(['paymentOrderId'])
export class PaymentRefund {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId: string | null;

  @Column({ name: 'payment_order_id', type: 'uuid' })
  paymentOrderId: string;

  @ManyToOne(() => PaymentOrder, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'payment_order_id' })
  paymentOrder: PaymentOrder;

  @Column({ type: 'varchar', length: 20 })
  gateway: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  /** 'full' | 'partial' */
  @Column({ name: 'refund_type', type: 'varchar', length: 10 })
  refundType: string;

  /** 'In Progress' | 'Completed' | 'Failed' */
  @Column({ type: 'varchar', length: 20, default: 'In Progress' })
  status: string;

  @Column({ name: 'gateway_refund_id', type: 'varchar', length: 255, nullable: true })
  gatewayRefundId: string | null;

  /** Our own unique reference sent to the gateway. */
  @Column({ name: 'reference', type: 'varchar', length: 60 })
  reference: string;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({ type: 'text', nullable: true })
  error: string | null;

  @Column({ name: 'gateway_response', type: 'jsonb', nullable: true })
  gatewayResponse: Record<string, any> | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
