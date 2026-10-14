import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export const PAYMENT_GATEWAYS = ['razorpay', 'payu', 'stripe', 'paytm'] as const;
export type PaymentGatewayName = (typeof PAYMENT_GATEWAYS)[number];

export const GATEWAY_LABELS: Record<string, string> = {
  razorpay: 'Razorpay',
  payu: 'PayU',
  stripe: 'Stripe',
  paytm: 'Paytm',
};

export const PAYMENT_METHODS = ['UPI', 'Card', 'Net Banking', 'Wallet'] as const;
export const PAYMENT_CURRENCIES = ['INR', 'USD', 'Other'] as const;

/** Credential keys each gateway needs (secrets are never returned unmasked). */
export const GATEWAY_CREDENTIAL_FIELDS: Record<string, { key: string; label: string; secret: boolean; required: boolean }[]> = {
  razorpay: [
    { key: 'keyId', label: 'Key ID', secret: false, required: true },
    { key: 'keySecret', label: 'Key Secret', secret: true, required: true },
    { key: 'webhookSecret', label: 'Webhook Secret', secret: true, required: false },
  ],
  stripe: [
    { key: 'publishableKey', label: 'Publishable Key', secret: false, required: false },
    { key: 'secretKey', label: 'Secret Key', secret: true, required: true },
    { key: 'webhookSecret', label: 'Webhook Signing Secret', secret: true, required: false },
  ],
  payu: [
    { key: 'merchantKey', label: 'Merchant Key', secret: false, required: true },
    { key: 'merchantSalt', label: 'Merchant Salt', secret: true, required: true },
  ],
  paytm: [
    { key: 'merchantId', label: 'Merchant ID (MID)', secret: false, required: true },
    { key: 'merchantKey', label: 'Merchant Key', secret: true, required: true },
    { key: 'website', label: 'Website Name', secret: false, required: false },
  ],
};

/** Per-organization configuration of one payment gateway. */
@Entity('payment_gateway_settings')
@Index(['organizationId', 'gateway'], { unique: true })
export class PaymentGatewaySetting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ type: 'varchar', length: 20 })
  gateway: string;

  @Column({ name: 'is_enabled', default: false })
  isEnabled: boolean;

  @Column({ name: 'is_default', default: false })
  isDefault: boolean;

  /** 'test' | 'live' */
  @Column({ type: 'varchar', length: 10, default: 'test' })
  mode: string;

  /** Currency charged through this gateway — INR / USD / other ISO code. */
  @Column({ type: 'varchar', length: 3, default: 'INR' })
  currency: string;

  /**
   * Fee charged when the currency is not INR (international payments).
   * For INR the organization's application fee (with discount) is used.
   */
  @Column({ name: 'fee_amount', type: 'decimal', precision: 12, scale: 2, nullable: true })
  feeAmount: number | null;

  /** Allowed payment methods: UPI / Card / Net Banking / Wallet */
  @Column({ type: 'jsonb', default: () => `'["UPI","Card","Net Banking","Wallet"]'` })
  methods: string[];

  @Column({ type: 'jsonb', default: () => "'{}'" })
  credentials: Record<string, string>;

  @Column({ name: 'display_name', type: 'varchar', length: 100, nullable: true })
  displayName: string | null;

  @Column({ name: 'last_tested_at', type: 'timestamp', nullable: true })
  lastTestedAt: Date | null;

  @Column({ name: 'last_test_result', type: 'text', nullable: true })
  lastTestResult: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
