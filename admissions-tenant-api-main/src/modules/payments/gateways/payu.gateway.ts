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

const sha512 = (s: string) => crypto.createHash('sha512').update(s).digest('hex');

export function mapPayuMethod(mode?: string | null): string | null {
  switch ((mode || '').toUpperCase()) {
    case 'UPI':
      return 'UPI';
    case 'CC':
    case 'DC':
    case 'CREDITCARD':
    case 'DEBITCARD':
    case 'EMI':
      return 'Card';
    case 'NB':
    case 'NETBANKING':
      return 'Net Banking';
    case 'CASH':
    case 'WALLET':
      return 'Wallet';
    case '':
      return null;
    default:
      return 'Other';
  }
}

/**
 * PayU India hosted checkout (https://docs.payu.in):
 * - Checkout: browser form-POST to /_payment with a SHA-512 request hash.
 * - Response / webhook: reverse SHA-512 hash verification.
 * - Status & refunds: merchant postservice (verify_payment, cancel_refund_transaction, check_action_status).
 */
export class PayuGateway {
  private hosts(config: GatewayConfig) {
    return config.mode === 'live'
      ? { pay: 'https://secure.payu.in/_payment', info: 'https://info.payu.in/merchant/postservice.php?form=2' }
      : { pay: 'https://test.payu.in/_payment', info: 'https://test.payu.in/merchant/postservice.php?form=2' };
  }

  private async command(config: GatewayConfig, command: string, vars: string[]) {
    requireCreds(config, ['merchantKey', 'merchantSalt'], 'PayU');
    const { merchantKey: key, merchantSalt: salt } = config.credentials;
    const body = new URLSearchParams();
    body.append('key', key);
    body.append('command', command);
    vars.forEach((v, i) => body.append(`var${i + 1}`, v));
    body.append('hash', sha512(`${key}|${command}|${vars[0]}|${salt}`));
    const res = await fetch(this.hosts(config).info, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: body.toString(),
    });
    const json = await readJson(res);
    if (!res.ok) throw new GatewayError(`PayU API error ${res.status}`);
    return json;
  }

  async createCheckout(config: GatewayConfig, input: CheckoutInput): Promise<CheckoutResult> {
    requireCreds(config, ['merchantKey', 'merchantSalt'], 'PayU');
    const { merchantKey: key, merchantSalt: salt } = config.credentials;
    const txnid = `PAY${input.paymentNo}T${Date.now().toString(36)}`.slice(0, 25);
    const amount = input.amount.toFixed(2);
    const productinfo = (input.description || 'Application Fee').slice(0, 100);
    const firstname = (input.customer.name || 'Applicant').split(' ')[0].slice(0, 60);
    const email = input.customer.email || '';
    const udf1 = input.paymentId;
    const udf2 = input.applicationId;
    const hash = sha512(`${key}|${txnid}|${amount}|${productinfo}|${firstname}|${email}|${udf1}|${udf2}|||||||||${salt}`);
    const enforce = this.enforcePaymethod(config.methods);
    const fields: Record<string, string> = {
      key,
      txnid,
      amount,
      productinfo,
      firstname,
      email,
      phone: (input.customer.phone || '').replace(/\D/g, '').slice(-10),
      surl: input.callbackUrl,
      furl: input.callbackUrl,
      udf1,
      udf2,
      hash,
    };
    if (enforce) fields.enforce_paymethod = enforce;
    return { action: 'form_post', gatewayOrderId: txnid, url: this.hosts(config).pay, fields };
  }

  private enforcePaymethod(methods: string[]) {
    const m = (methods || []).map((x) => x.toLowerCase());
    if (!m.length || m.length >= 4) return '';
    const out: string[] = [];
    if (m.includes('card')) out.push('creditcard', 'debitcard');
    if (m.includes('net banking')) out.push('netbanking');
    if (m.includes('upi')) out.push('upi');
    if (m.includes('wallet')) out.push('cashcard');
    return out.join('|');
  }

  /** Reverse hash: SALT|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key */
  verifyResponse(config: GatewayConfig, p: Record<string, any>) {
    requireCreds(config, ['merchantKey', 'merchantSalt'], 'PayU');
    const salt = config.credentials.merchantSalt;
    const g = (k: string) => (p[k] ?? '').toString();
    let base = `${salt}|${g('status')}||||||${g('udf5')}|${g('udf4')}|${g('udf3')}|${g('udf2')}|${g('udf1')}|${g('email')}|${g('firstname')}|${g('productinfo')}|${g('amount')}|${g('txnid')}|${g('key')}`;
    if (p.additionalCharges) base = `${g('additionalCharges')}|${base}`;
    return safeEqual(sha512(base), g('hash').toLowerCase());
  }

  /** Converts a verified PayU response/webhook body to a status. */
  responseStatus(p: Record<string, any>): StatusResult {
    const st = (p.status || '').toString().toLowerCase();
    return {
      status: st === 'success' ? 'success' : st === 'failure' || st === 'failed' ? 'failed' : 'pending',
      transactionId: p.mihpayid || null,
      method: mapPayuMethod(p.mode),
      amount: p.amount ? Number(p.amount) : null,
      currency: 'INR',
      failureReason: st === 'success' ? null : p.error_Message || p.field9 || null,
      raw: { mihpayid: p.mihpayid, status: p.status, mode: p.mode, txnid: p.txnid, bank_ref_num: p.bank_ref_num },
    };
  }

  async fetchStatus(config: GatewayConfig, txnid: string): Promise<StatusResult> {
    const json = await this.command(config, 'verify_payment', [txnid]);
    const d = json?.transaction_details?.[txnid];
    if (!d) return { status: 'pending', raw: json };
    const st = (d.status || '').toLowerCase();
    return {
      status: st === 'success' ? 'success' : st === 'failure' || st === 'failed' ? 'failed' : 'pending',
      transactionId: d.mihpayid || null,
      method: mapPayuMethod(d.mode),
      amount: d.transaction_amount ? Number(d.transaction_amount) : d.amt ? Number(d.amt) : null,
      currency: 'INR',
      failureReason: st === 'success' ? null : d.error_Message || null,
      raw: d,
    };
  }

  async refund(config: GatewayConfig, mihpayid: string, amount: number, reference: string): Promise<RefundResult> {
    try {
      const json = await this.command(config, 'cancel_refund_transaction', [mihpayid, reference, amount.toFixed(2)]);
      const ok = Number(json?.status) === 1;
      return {
        success: ok,
        status: ok ? 'In Progress' : 'Failed',
        gatewayRefundId: json?.request_id ? String(json.request_id) : null,
        error: ok ? null : json?.msg || 'PayU refund was not accepted',
        raw: json,
      };
    } catch (e) {
      return { success: false, status: 'Failed', error: (e as Error).message };
    }
  }

  async fetchRefund(config: GatewayConfig, requestId: string): Promise<RefundResult> {
    const json = await this.command(config, 'check_action_status', [requestId]);
    const d = json?.transaction_details?.[requestId];
    const entry: any = d ? Object.values(d)[0] : null;
    const st = (entry?.status || '').toLowerCase();
    return {
      success: st !== 'failure' && st !== 'failed',
      status: st === 'success' ? 'Completed' : st === 'failure' || st === 'failed' ? 'Failed' : 'In Progress',
      gatewayRefundId: requestId,
      raw: json,
    };
  }

  /** PayU webhooks carry the same fields and reverse hash as the browser response. */
  verifyWebhook(config: GatewayConfig, body: Record<string, any>) {
    try {
      return !!body?.hash && this.verifyResponse(config, body);
    } catch {
      return false;
    }
  }

  parseWebhook(body: any): WebhookEvent {
    const st = (body?.status || '').toString().toLowerCase();
    if (st === 'success') {
      return {
        kind: 'payment_success',
        gatewayOrderId: body.txnid,
        transactionId: body.mihpayid,
        method: mapPayuMethod(body.mode),
        amount: body.amount ? Number(body.amount) : null,
        raw: { txnid: body.txnid, status: body.status },
      };
    }
    if (st === 'failure' || st === 'failed') {
      return { kind: 'payment_failed', gatewayOrderId: body.txnid, transactionId: body.mihpayid, raw: { txnid: body.txnid, status: body.status } };
    }
    return { kind: 'ignore', raw: { txnid: body?.txnid, status: body?.status } };
  }

  async testConnection(config: GatewayConfig) {
    const json = await this.command(config, 'verify_payment', ['connection-test']);
    if (json?.status === undefined && !json?.msg) throw new GatewayError('Unexpected response from PayU');
    if (typeof json?.msg === 'string' && /invalid hash|invalid key/i.test(json.msg)) throw new GatewayError(json.msg);
    return 'Connected to PayU';
  }
}
