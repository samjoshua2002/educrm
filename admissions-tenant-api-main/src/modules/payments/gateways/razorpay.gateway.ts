import * as crypto from 'crypto';
import {
  CheckoutInput,
  CheckoutResult,
  GatewayConfig,
  GatewayError,
  RefundResult,
  StatusResult,
  WebhookEvent,
  readJson,
  requireCreds,
} from './gateway.types.js';

const API = 'https://api.razorpay.com/v1';

export function mapRazorpayMethod(m?: string | null): string | null {
  switch ((m || '').toLowerCase()) {
    case 'upi':
      return 'UPI';
    case 'card':
    case 'emi':
      return 'Card';
    case 'netbanking':
      return 'Net Banking';
    case 'wallet':
      return 'Wallet';
    case '':
      return null;
    default:
      return 'Other';
  }
}

/** Razorpay Orders / Payments / Refunds REST API (https://razorpay.com/docs/api). */
export class RazorpayGateway {
  private auth(config: GatewayConfig) {
    requireCreds(config, ['keyId', 'keySecret'], 'Razorpay');
    return 'Basic ' + Buffer.from(`${config.credentials.keyId}:${config.credentials.keySecret}`).toString('base64');
  }

  private async call(config: GatewayConfig, method: string, path: string, body?: any) {
    const res = await fetch(`${API}${path}`, {
      method,
      headers: { Authorization: this.auth(config), 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await readJson(res);
    if (!res.ok) throw new GatewayError(json?.error?.description || `Razorpay API error ${res.status}`);
    return json;
  }

  async createCheckout(config: GatewayConfig, input: CheckoutInput, notes: Record<string, string> = {}): Promise<CheckoutResult> {
    const amountMinor = Math.round(input.amount * 100);
    const order = await this.call(config, 'POST', '/orders', {
      amount: amountMinor,
      currency: input.currency,
      receipt: `pay_${input.paymentNo}`.slice(0, 40),
      notes: { applicationId: input.applicationId, paymentId: input.paymentId, ...notes },
    });
    const allowed = (config.methods || []).map((m) => m.toLowerCase());
    return {
      action: 'razorpay_checkout',
      gatewayOrderId: order.id,
      keyId: config.credentials.keyId,
      amountMinor,
      currency: input.currency,
      methods: {
        upi: allowed.includes('upi'),
        card: allowed.includes('card'),
        netbanking: allowed.includes('net banking'),
        wallet: allowed.includes('wallet'),
      },
    };
  }

  verifyCheckoutSignature(config: GatewayConfig, orderId: string, paymentId: string, signature: string) {
    requireCreds(config, ['keySecret'], 'Razorpay');
    const expected = crypto.createHmac('sha256', config.credentials.keySecret).update(`${orderId}|${paymentId}`).digest('hex');
    return safeEqual(expected, signature);
  }

  async fetchStatus(config: GatewayConfig, gatewayOrderId: string): Promise<StatusResult> {
    const list = await this.call(config, 'GET', `/orders/${encodeURIComponent(gatewayOrderId)}/payments`);
    const items: any[] = list?.items || [];
    const captured = items.find((p) => p.status === 'captured');
    if (captured) {
      return {
        status: 'success',
        transactionId: captured.id,
        method: mapRazorpayMethod(captured.method),
        amount: Number(captured.amount) / 100,
        currency: captured.currency,
        isInternational: !!captured.international,
        raw: captured,
      };
    }
    const authorized = items.find((p) => p.status === 'authorized');
    if (authorized) {
      // Auto-capture is normally on; capture explicitly when it is not.
      try {
        const cap = await this.call(config, 'POST', `/payments/${authorized.id}/capture`, {
          amount: authorized.amount,
          currency: authorized.currency,
        });
        if (cap?.status === 'captured') {
          return {
            status: 'success',
            transactionId: cap.id,
            method: mapRazorpayMethod(cap.method),
            amount: Number(cap.amount) / 100,
            currency: cap.currency,
            raw: cap,
          };
        }
      } catch {
        /* stays pending */
      }
      return { status: 'pending', raw: authorized };
    }
    if (items.length > 0 && items.every((p) => p.status === 'failed')) {
      const last = items[items.length - 1];
      return { status: 'failed', transactionId: last.id, failureReason: last.error_description || 'Payment failed', raw: last };
    }
    return { status: 'pending', raw: list };
  }

  async refund(config: GatewayConfig, transactionId: string, amount: number, reference: string): Promise<RefundResult> {
    try {
      const r = await this.call(config, 'POST', `/payments/${encodeURIComponent(transactionId)}/refund`, {
        amount: Math.round(amount * 100),
        receipt: reference,
        notes: { reference },
      });
      return {
        success: true,
        status: r.status === 'processed' ? 'Completed' : r.status === 'failed' ? 'Failed' : 'In Progress',
        gatewayRefundId: r.id,
        raw: r,
      };
    } catch (e) {
      return { success: false, status: 'Failed', error: (e as Error).message };
    }
  }

  async fetchRefund(config: GatewayConfig, refundId: string): Promise<RefundResult> {
    const r = await this.call(config, 'GET', `/refunds/${encodeURIComponent(refundId)}`);
    return {
      success: r.status !== 'failed',
      status: r.status === 'processed' ? 'Completed' : r.status === 'failed' ? 'Failed' : 'In Progress',
      gatewayRefundId: r.id,
      raw: r,
    };
  }

  verifyWebhook(config: GatewayConfig, rawBody: Buffer, signature?: string) {
    const secret = config.credentials?.webhookSecret;
    if (!secret || !signature || !rawBody) return false;
    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    return safeEqual(expected, signature);
  }

  parseWebhook(body: any): WebhookEvent {
    const event = body?.event;
    const payment = body?.payload?.payment?.entity;
    const refund = body?.payload?.refund?.entity;
    if (event === 'payment.captured' || event === 'order.paid') {
      return {
        kind: 'payment_success',
        gatewayOrderId: payment?.order_id,
        transactionId: payment?.id,
        method: mapRazorpayMethod(payment?.method),
        amount: payment ? Number(payment.amount) / 100 : null,
        raw: body,
      };
    }
    if (event === 'payment.failed') {
      return { kind: 'payment_failed', gatewayOrderId: payment?.order_id, transactionId: payment?.id, raw: body };
    }
    if (event === 'refund.processed') {
      return { kind: 'refund_completed', gatewayRefundId: refund?.id, transactionId: refund?.payment_id, raw: body };
    }
    if (event === 'refund.failed') {
      return { kind: 'refund_failed', gatewayRefundId: refund?.id, transactionId: refund?.payment_id, raw: body };
    }
    return { kind: 'ignore', raw: body };
  }

  async testConnection(config: GatewayConfig) {
    await this.call(config, 'GET', '/orders?count=1');
    return 'Connected to Razorpay';
  }
}

export function safeEqual(a: string, b: string) {
  const ba = Buffer.from(String(a || ''));
  const bb = Buffer.from(String(b || ''));
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}
