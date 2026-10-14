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
import { safeEqual } from './razorpay.gateway.js';

const API = 'https://api.stripe.com/v1';
/** Currencies Stripe treats as having no minor unit. */
const ZERO_DECIMAL = ['BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 'MGA', 'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF'];

function toMinor(amount: number, currency: string) {
  return ZERO_DECIMAL.includes(currency.toUpperCase()) ? Math.round(amount) : Math.round(amount * 100);
}
function fromMinor(amount: number, currency: string) {
  return ZERO_DECIMAL.includes((currency || '').toUpperCase()) ? amount : amount / 100;
}

function mapStripeMethod(t?: string | null): string | null {
  switch ((t || '').toLowerCase()) {
    case 'card':
    case 'link':
      return 'Card';
    case 'upi':
      return 'UPI';
    case '':
      return null;
    default:
      return t && ['alipay', 'wechat_pay', 'paypal', 'amazon_pay', 'cashapp', 'grabpay'].includes(t) ? 'Wallet' : 'Other';
  }
}

function form(params: Record<string, string | number | undefined | null>) {
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') body.append(k, String(v));
  }
  return body.toString();
}

/** Stripe Checkout Sessions / Refunds API (https://stripe.com/docs/api) — international card payments. */
export class StripeGateway {
  private async call(config: GatewayConfig, method: string, path: string, params?: Record<string, any>) {
    requireCreds(config, ['secretKey'], 'Stripe');
    const res = await fetch(`${API}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${config.credentials.secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params ? form(params) : undefined,
    });
    const json = await readJson(res);
    if (!res.ok) throw new GatewayError(json?.error?.message || `Stripe API error ${res.status}`);
    return json;
  }

  async createCheckout(config: GatewayConfig, input: CheckoutInput): Promise<CheckoutResult> {
    const sep = input.returnUrl.includes('?') ? '&' : '?';
    const session = await this.call(config, 'POST', '/checkout/sessions', {
      mode: 'payment',
      success_url: `${input.returnUrl}${sep}paymentId=${input.paymentId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${input.cancelUrl}${input.cancelUrl.includes('?') ? '&' : '?'}paymentId=${input.paymentId}&cancelled=1`,
      client_reference_id: input.paymentId,
      customer_email: input.customer.email || undefined,
      'line_items[0][quantity]': 1,
      'line_items[0][price_data][currency]': input.currency.toLowerCase(),
      'line_items[0][price_data][unit_amount]': toMinor(input.amount, input.currency),
      'line_items[0][price_data][product_data][name]': input.description,
      'metadata[paymentId]': input.paymentId,
      'metadata[applicationId]': input.applicationId,
      'metadata[applicationNo]': input.applicationNo,
      'payment_intent_data[metadata][paymentId]': input.paymentId,
      'payment_intent_data[metadata][applicationId]': input.applicationId,
    });
    if (!session?.url) throw new GatewayError('Stripe did not return a checkout URL');
    return { action: 'redirect', gatewayOrderId: session.id, url: session.url };
  }

  async fetchStatus(config: GatewayConfig, sessionId: string): Promise<StatusResult> {
    const s = await this.call(
      config,
      'GET',
      `/checkout/sessions/${encodeURIComponent(sessionId)}?expand[]=payment_intent&expand[]=payment_intent.latest_charge`,
    );
    const pi = s.payment_intent && typeof s.payment_intent === 'object' ? s.payment_intent : null;
    const charge = pi?.latest_charge && typeof pi.latest_charge === 'object' ? pi.latest_charge : null;
    const method = mapStripeMethod(charge?.payment_method_details?.type || pi?.payment_method_types?.[0]);
    const cardCountry = charge?.payment_method_details?.card?.country;
    if (s.payment_status === 'paid' || s.payment_status === 'no_payment_required') {
      return {
        status: 'success',
        transactionId: pi?.id || s.payment_intent,
        method,
        amount: fromMinor(Number(s.amount_total), s.currency),
        currency: (s.currency || '').toUpperCase(),
        isInternational: !!cardCountry && cardCountry !== 'IN',
        raw: { id: s.id, payment_status: s.payment_status, status: s.status, payment_intent: pi?.id },
      };
    }
    if (s.status === 'expired' || pi?.status === 'canceled') {
      return { status: 'failed', failureReason: 'Checkout session expired', raw: { id: s.id, status: s.status } };
    }
    if (pi?.last_payment_error) {
      return { status: 'failed', failureReason: pi.last_payment_error.message, transactionId: pi.id, raw: { id: s.id } };
    }
    return { status: 'pending', raw: { id: s.id, status: s.status, payment_status: s.payment_status } };
  }

  async refund(config: GatewayConfig, paymentIntentId: string, amount: number, currency: string, reference: string): Promise<RefundResult> {
    try {
      const r = await this.call(config, 'POST', '/refunds', {
        payment_intent: paymentIntentId,
        amount: toMinor(amount, currency),
        'metadata[reference]': reference,
      });
      return {
        success: r.status !== 'failed' && r.status !== 'canceled',
        status: r.status === 'succeeded' ? 'Completed' : r.status === 'failed' || r.status === 'canceled' ? 'Failed' : 'In Progress',
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
      status: r.status === 'succeeded' ? 'Completed' : r.status === 'failed' || r.status === 'canceled' ? 'Failed' : 'In Progress',
      gatewayRefundId: r.id,
      raw: r,
    };
  }

  /** Stripe-Signature: t=timestamp,v1=hmac_sha256(secret, `${t}.${payload}`) */
  verifyWebhook(config: GatewayConfig, rawBody: Buffer, header?: string) {
    const secret = config.credentials?.webhookSecret;
    if (!secret || !header || !rawBody) return false;
    const parts = Object.fromEntries(
      header.split(',').map((p) => {
        const i = p.indexOf('=');
        return [p.slice(0, i).trim(), p.slice(i + 1).trim()];
      }),
    );
    const t = parts['t'];
    const signatures = header
      .split(',')
      .filter((p) => p.trim().startsWith('v1='))
      .map((p) => p.trim().slice(3));
    if (!t || signatures.length === 0) return false;
    if (Math.abs(Date.now() / 1000 - Number(t)) > 300) return false;
    const expected = crypto.createHmac('sha256', secret).update(`${t}.${rawBody.toString('utf8')}`).digest('hex');
    return signatures.some((s) => safeEqual(expected, s));
  }

  parseWebhook(body: any): WebhookEvent {
    const type = body?.type;
    const obj = body?.data?.object || {};
    if (type === 'checkout.session.completed' || type === 'checkout.session.async_payment_succeeded') {
      if (obj.payment_status !== 'paid' && type === 'checkout.session.completed') return { kind: 'ignore', raw: body };
      return {
        kind: 'payment_success',
        gatewayOrderId: obj.id,
        transactionId: obj.payment_intent,
        amount: fromMinor(Number(obj.amount_total), obj.currency),
        raw: { id: body.id, type },
      };
    }
    if (type === 'checkout.session.async_payment_failed' || type === 'checkout.session.expired') {
      return { kind: 'payment_failed', gatewayOrderId: obj.id, raw: { id: body.id, type } };
    }
    if (type === 'refund.updated' || type === 'refund.created' || type === 'charge.refund.updated') {
      if (obj.status === 'succeeded') return { kind: 'refund_completed', gatewayRefundId: obj.id, transactionId: obj.payment_intent, raw: { id: body.id, type } };
      if (obj.status === 'failed') return { kind: 'refund_failed', gatewayRefundId: obj.id, transactionId: obj.payment_intent, raw: { id: body.id, type } };
    }
    return { kind: 'ignore', raw: { id: body?.id, type } };
  }

  async testConnection(config: GatewayConfig) {
    const b = await this.call(config, 'GET', '/balance');
    return `Connected to Stripe (${b?.livemode ? 'live' : 'test'} mode)`;
  }
}
