export type GatewayMode = 'test' | 'live';

export interface GatewayConfig {
  credentials: Record<string, string>;
  mode: GatewayMode;
  methods: string[];
}

export interface CheckoutInput {
  paymentId: string;
  paymentNo: number;
  applicationId: string;
  applicationNo: string;
  /** Major units (e.g. 2000.00 INR) */
  amount: number;
  currency: string;
  customer: { name: string; email: string; phone: string; id: string };
  description: string;
  /** Frontend page that shows the payment result. */
  returnUrl: string;
  /** Backend URL the gateway posts the browser back to (PayU / Paytm). */
  callbackUrl: string;
  cancelUrl: string;
}

export type CheckoutResult =
  | {
      action: 'razorpay_checkout';
      gatewayOrderId: string;
      keyId: string;
      amountMinor: number;
      currency: string;
      methods: Record<string, boolean>;
    }
  | { action: 'redirect'; gatewayOrderId: string; url: string }
  | { action: 'form_post'; gatewayOrderId: string; url: string; fields: Record<string, string> };

export interface StatusResult {
  status: 'success' | 'failed' | 'pending';
  transactionId?: string | null;
  /** UPI / Card / Net Banking / Wallet / Other */
  method?: string | null;
  amount?: number | null;
  currency?: string | null;
  failureReason?: string | null;
  isInternational?: boolean;
  raw?: any;
}

export interface RefundResult {
  success: boolean;
  status: 'In Progress' | 'Completed' | 'Failed';
  gatewayRefundId?: string | null;
  error?: string | null;
  raw?: any;
}

export interface WebhookEvent {
  kind: 'payment_success' | 'payment_failed' | 'refund_completed' | 'refund_failed' | 'ignore';
  gatewayOrderId?: string | null;
  transactionId?: string | null;
  gatewayRefundId?: string | null;
  method?: string | null;
  amount?: number | null;
  raw?: any;
}

export class GatewayError extends Error {}

export function requireCreds(config: GatewayConfig, keys: string[], gateway: string) {
  const missing = keys.filter((k) => !config.credentials?.[k]);
  if (missing.length) {
    throw new GatewayError(`${gateway} is not configured: missing ${missing.join(', ')}`);
  }
}

export async function readJson(res: Response): Promise<any> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}
