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

const IV = '@@@@&&&&####$$$$';

function aesAlgo(key: string) {
  const len = Buffer.byteLength(key);
  return len === 32 ? 'aes-256-cbc' : len === 24 ? 'aes-192-cbc' : 'aes-128-cbc';
}

/** Paytm checksum (same algorithm as the official paytmchecksum library). */
export const PaytmChecksum = {
  encrypt(input: string, key: string) {
    const cipher = crypto.createCipheriv(aesAlgo(key), Buffer.from(key), Buffer.from(IV));
    return cipher.update(input, 'binary', 'base64') + cipher.final('base64');
  },
  decrypt(encrypted: string, key: string) {
    const decipher = crypto.createDecipheriv(aesAlgo(key), Buffer.from(key), Buffer.from(IV));
    return decipher.update(encrypted, 'base64', 'binary') + decipher.final('binary');
  },
  paramString(params: Record<string, any>) {
    return Object.keys(params)
      .sort()
      .map((k) => {
        const v = params[k];
        return v === null || v === undefined || String(v).toLowerCase() === 'null' ? '' : String(v);
      })
      .join('|');
  },
  generate(params: Record<string, any> | string, key: string) {
    const str = typeof params === 'string' ? params : this.paramString(params);
    const salt = crypto.randomBytes(3).toString('base64').slice(0, 4);
    const hash = crypto.createHash('sha256').update(`${str}|${salt}`).digest('hex') + salt;
    return this.encrypt(hash, key);
  },
  verify(params: Record<string, any> | string, key: string, checksum: string) {
    try {
      let str: string;
      if (typeof params === 'string') str = params;
      else {
        const copy = { ...params };
        delete copy.CHECKSUMHASH;
        str = this.paramString(copy);
      }
      const hashWithSalt = this.decrypt(checksum, key);
      const salt = hashWithSalt.slice(-4);
      const expected = crypto.createHash('sha256').update(`${str}|${salt}`).digest('hex') + salt;
      return expected === hashWithSalt;
    } catch {
      return false;
    }
  },
};

export function mapPaytmMethod(mode?: string | null): string | null {
  switch ((mode || '').toUpperCase()) {
    case 'UPI':
      return 'UPI';
    case 'CC':
    case 'DC':
    case 'EMI':
    case 'CREDIT_CARD':
    case 'DEBIT_CARD':
      return 'Card';
    case 'NB':
    case 'NET_BANKING':
      return 'Net Banking';
    case 'PPI':
    case 'BALANCE':
    case 'WALLET':
    case 'PAYTM_DIGITAL_CREDIT':
      return 'Wallet';
    case '':
      return null;
    default:
      return 'Other';
  }
}

/**
 * Paytm Payment Gateway (https://business.paytm.com/docs):
 * Initiate Transaction API -> showPaymentPage form POST, callback/webhook
 * verified with the AES/SHA-256 checksum, Transaction Status API v3, Refund API.
 */
export class PaytmGateway {
  private host(config: GatewayConfig) {
    return config.mode === 'live' ? 'https://securegw.paytm.in' : 'https://securegw-stage.paytm.in';
  }

  private async call(config: GatewayConfig, path: string, body: Record<string, any>) {
    requireCreds(config, ['merchantId', 'merchantKey'], 'Paytm');
    const signature = PaytmChecksum.generate(JSON.stringify(body), config.credentials.merchantKey);
    const res = await fetch(`${this.host(config)}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body, head: { signature } }),
    });
    const json = await readJson(res);
    if (!res.ok) throw new GatewayError(`Paytm API error ${res.status}`);
    return json;
  }

  private enabledModes(methods: string[]) {
    const m = (methods || []).map((x) => x.toLowerCase());
    if (!m.length || m.length >= 4) return undefined;
    const out: { mode: string }[] = [];
    if (m.includes('upi')) out.push({ mode: 'UPI' });
    if (m.includes('card')) out.push({ mode: 'CREDIT_CARD' }, { mode: 'DEBIT_CARD' });
    if (m.includes('net banking')) out.push({ mode: 'NET_BANKING' });
    if (m.includes('wallet')) out.push({ mode: 'BALANCE' });
    return out;
  }

  async createCheckout(config: GatewayConfig, input: CheckoutInput): Promise<CheckoutResult> {
    requireCreds(config, ['merchantId', 'merchantKey'], 'Paytm');
    const mid = config.credentials.merchantId;
    const orderId = `PAY${input.paymentNo}_${Date.now()}`.slice(0, 50);
    const body: Record<string, any> = {
      requestType: 'Payment',
      mid,
      websiteName: config.credentials.website || (config.mode === 'live' ? 'DEFAULT' : 'WEBSTAGING'),
      orderId,
      callbackUrl: input.callbackUrl,
      txnAmount: { value: input.amount.toFixed(2), currency: input.currency || 'INR' },
      userInfo: {
        custId: `CUST_${input.customer.id || input.applicationId}`.slice(0, 64),
        email: input.customer.email || undefined,
        mobile: (input.customer.phone || '').replace(/\D/g, '').slice(-10) || undefined,
        firstName: input.customer.name || undefined,
      },
    };
    const modes = this.enabledModes(config.methods);
    if (modes) body.enablePaymentMode = modes;
    const json = await this.call(config, `/theia/api/v1/initiateTransaction?mid=${encodeURIComponent(mid)}&orderId=${encodeURIComponent(orderId)}`, body);
    const info = json?.body?.resultInfo;
    const txnToken = json?.body?.txnToken;
    if (!txnToken || info?.resultStatus !== 'S') {
      throw new GatewayError(info?.resultMsg || 'Paytm did not return a transaction token');
    }
    return {
      action: 'form_post',
      gatewayOrderId: orderId,
      url: `${this.host(config)}/theia/api/v1/showPaymentPage?mid=${encodeURIComponent(mid)}&orderId=${encodeURIComponent(orderId)}`,
      fields: { mid, orderId, txnToken },
    };
  }

  /** Verifies the CHECKSUMHASH of the browser callback / webhook form post. */
  verifyCallback(config: GatewayConfig, params: Record<string, any>) {
    requireCreds(config, ['merchantKey'], 'Paytm');
    if (!params?.CHECKSUMHASH) return false;
    return PaytmChecksum.verify(params, config.credentials.merchantKey, params.CHECKSUMHASH);
  }

  callbackStatus(p: Record<string, any>): StatusResult {
    const st = (p.STATUS || '').toUpperCase();
    return {
      status: st === 'TXN_SUCCESS' ? 'success' : st === 'TXN_FAILURE' ? 'failed' : 'pending',
      transactionId: p.TXNID || null,
      method: mapPaytmMethod(p.PAYMENTMODE),
      amount: p.TXNAMOUNT ? Number(p.TXNAMOUNT) : null,
      currency: p.CURRENCY || 'INR',
      failureReason: st === 'TXN_SUCCESS' ? null : p.RESPMSG || null,
      raw: { ORDERID: p.ORDERID, TXNID: p.TXNID, STATUS: p.STATUS, RESPCODE: p.RESPCODE, PAYMENTMODE: p.PAYMENTMODE },
    };
  }

  async fetchStatus(config: GatewayConfig, orderId: string): Promise<StatusResult> {
    const json = await this.call(config, '/v3/order/status', { mid: config.credentials.merchantId, orderId });
    const b = json?.body || {};
    const st = (b.resultInfo?.resultStatus || '').toUpperCase();
    return {
      status: st === 'TXN_SUCCESS' ? 'success' : st === 'TXN_FAILURE' ? 'failed' : 'pending',
      transactionId: b.txnId || null,
      method: mapPaytmMethod(b.paymentMode),
      amount: b.txnAmount ? Number(b.txnAmount) : null,
      currency: 'INR',
      failureReason: st === 'TXN_SUCCESS' ? null : b.resultInfo?.resultMsg || null,
      raw: b,
    };
  }

  async refund(config: GatewayConfig, orderId: string, txnId: string, amount: number, reference: string): Promise<RefundResult> {
    try {
      const json = await this.call(config, '/refund/apply', {
        mid: config.credentials.merchantId,
        txnType: 'REFUND',
        orderId,
        txnId,
        refId: reference,
        refundAmount: amount.toFixed(2),
      });
      const b = json?.body || {};
      const st = (b.resultInfo?.resultStatus || '').toUpperCase();
      const failed = st === 'TXN_FAILURE' || st === 'F';
      return {
        success: !failed,
        status: st === 'TXN_SUCCESS' ? 'Completed' : failed ? 'Failed' : 'In Progress',
        gatewayRefundId: b.refundId || null,
        error: failed ? b.resultInfo?.resultMsg || 'Paytm refund failed' : null,
        raw: b,
      };
    } catch (e) {
      return { success: false, status: 'Failed', error: (e as Error).message };
    }
  }

  async fetchRefund(config: GatewayConfig, orderId: string, reference: string): Promise<RefundResult> {
    const json = await this.call(config, '/v2/refund/status', { mid: config.credentials.merchantId, orderId, refId: reference });
    const b = json?.body || {};
    const st = (b.resultInfo?.resultStatus || '').toUpperCase();
    return {
      success: st !== 'TXN_FAILURE',
      status: st === 'TXN_SUCCESS' ? 'Completed' : st === 'TXN_FAILURE' ? 'Failed' : 'In Progress',
      gatewayRefundId: b.refundId || null,
      raw: b,
    };
  }

  verifyWebhook(config: GatewayConfig, body: Record<string, any>) {
    try {
      return this.verifyCallback(config, body);
    } catch {
      return false;
    }
  }

  parseWebhook(body: any): WebhookEvent {
    if (body?.REFUNDID || body?.refundId) {
      const rs = (body.STATUS || body.status || '').toUpperCase();
      const rid = body.REFUNDID || body.refundId;
      if (rs === 'TXN_SUCCESS') return { kind: 'refund_completed', gatewayRefundId: rid, raw: { REFUNDID: rid, STATUS: rs } };
      if (rs === 'TXN_FAILURE') return { kind: 'refund_failed', gatewayRefundId: rid, raw: { REFUNDID: rid, STATUS: rs } };
      return { kind: 'ignore', raw: { REFUNDID: rid } };
    }
    const st = (body?.STATUS || '').toUpperCase();
    if (st === 'TXN_SUCCESS') {
      return {
        kind: 'payment_success',
        gatewayOrderId: body.ORDERID,
        transactionId: body.TXNID,
        method: mapPaytmMethod(body.PAYMENTMODE),
        amount: body.TXNAMOUNT ? Number(body.TXNAMOUNT) : null,
        raw: { ORDERID: body.ORDERID, STATUS: body.STATUS },
      };
    }
    if (st === 'TXN_FAILURE') {
      return { kind: 'payment_failed', gatewayOrderId: body.ORDERID, transactionId: body.TXNID, raw: { ORDERID: body.ORDERID, STATUS: body.STATUS } };
    }
    return { kind: 'ignore', raw: { ORDERID: body?.ORDERID, STATUS: body?.STATUS } };
  }

  async testConnection(config: GatewayConfig) {
    const json = await this.call(config, '/v3/order/status', { mid: config.credentials.merchantId, orderId: 'CONNECTION_TEST' });
    const code = json?.body?.resultInfo?.resultCode;
    if (code === '2005' || /checksum/i.test(json?.body?.resultInfo?.resultMsg || '')) {
      throw new GatewayError('Paytm rejected the checksum - check the Merchant Key');
    }
    return 'Connected to Paytm';
  }
}
