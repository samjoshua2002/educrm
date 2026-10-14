import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import {
  GATEWAY_CREDENTIAL_FIELDS,
  GATEWAY_LABELS,
  PAYMENT_CURRENCIES,
  PAYMENT_GATEWAYS,
  PAYMENT_METHODS,
  PaymentGatewaySetting,
} from './entities/payment-gateway-setting.entity.js';
import { GatewayConfig } from './gateways/gateway.types.js';
import { RazorpayGateway } from './gateways/razorpay.gateway.js';
import { StripeGateway } from './gateways/stripe.gateway.js';
import { PayuGateway } from './gateways/payu.gateway.js';
import { PaytmGateway } from './gateways/paytm.gateway.js';
import { UpdateGatewaySettingDto } from './dto/payment-admin.dto.js';

const MASK = '••••••••';

export interface ResolvedGateway {
  gateway: string;
  label: string;
  isEnabled: boolean;
  isDefault: boolean;
  currency: string;
  feeAmount: number | null;
  methods: string[];
  config: GatewayConfig;
}

/** Per-organization payment gateway configuration (Razorpay, Stripe, PayU, Paytm). */
@Injectable()
export class PaymentGatewaysService {
  private readonly logger = new Logger(PaymentGatewaysService.name);
  readonly razorpay = new RazorpayGateway();
  readonly stripe = new StripeGateway();
  readonly payu = new PayuGateway();
  readonly paytm = new PaytmGateway();

  constructor(
    @InjectRepository(PaymentGatewaySetting)
    private readonly repo: Repository<PaymentGatewaySetting>,
    private readonly config: ConfigService,
  ) {}

  meta() {
    return {
      gateways: PAYMENT_GATEWAYS.map((g) => ({ gateway: g, label: GATEWAY_LABELS[g], fields: GATEWAY_CREDENTIAL_FIELDS[g] })),
      methods: PAYMENT_METHODS,
      currencies: PAYMENT_CURRENCIES,
    };
  }

  private envRazorpay(): Record<string, string> | null {
    const keyId = this.config.get<string>('RAZORPAY_KEY_ID');
    const keySecret = this.config.get<string>('RAZORPAY_KEY_SECRET');
    if (!keyId || !keySecret) return null;
    return { keyId, keySecret, webhookSecret: this.config.get<string>('RAZORPAY_WEBHOOK_SECRET') || '' };
  }

  private hasRequired(gateway: string, creds: Record<string, string>) {
    return (GATEWAY_CREDENTIAL_FIELDS[gateway] || []).filter((f) => f.required).every((f) => !!creds?.[f.key]);
  }

  /** Resolves every gateway for an org; Razorpay falls back to the server's env keys (original behaviour). */
  async resolveAll(orgId: string | null): Promise<ResolvedGateway[]> {
    const rows = orgId ? await this.repo.find({ where: { organizationId: orgId } }) : [];
    const env = this.envRazorpay();
    const anyConfigured = rows.some((r) => r.isEnabled);
    return PAYMENT_GATEWAYS.map((g) => {
      const row = rows.find((r) => r.gateway === g);
      let creds = row?.credentials || {};
      let enabled = !!row?.isEnabled;
      let isDefault = !!row?.isDefault;
      if (g === 'razorpay' && env && !this.hasRequired('razorpay', creds)) {
        creds = { ...env, ...Object.fromEntries(Object.entries(creds).filter(([, v]) => !!v)) };
        // Backward compatibility: with nothing configured, Razorpay via env keys stays the default.
        if (!row && !anyConfigured) {
          enabled = true;
          isDefault = true;
        }
      }
      return {
        gateway: g,
        label: row?.displayName || GATEWAY_LABELS[g],
        isEnabled: enabled && this.hasRequired(g, creds),
        isDefault,
        currency: row?.currency || 'INR',
        feeAmount: row?.feeAmount != null ? Number(row.feeAmount) : null,
        methods: row?.methods?.length ? row.methods : [...PAYMENT_METHODS],
        config: {
          credentials: creds,
          mode: (row?.mode as any) || (g === 'razorpay' && !row ? (String(creds.keyId || '').startsWith('rzp_live') ? 'live' : 'test') : 'test'),
          methods: row?.methods?.length ? row.methods : [...PAYMENT_METHODS],
        },
      };
    });
  }

  async resolve(orgId: string | null, gateway: string): Promise<ResolvedGateway> {
    const all = await this.resolveAll(orgId);
    const g = all.find((x) => x.gateway === gateway);
    if (!g) throw new BadRequestException(`Unknown payment gateway "${gateway}"`);
    return g;
  }

  async enabled(orgId: string | null) {
    const all = (await this.resolveAll(orgId)).filter((g) => g.isEnabled);
    if (all.length && !all.some((g) => g.isDefault)) all[0].isDefault = true;
    return all;
  }

  // ---------------------------------------------------------------------------
  // Admin settings
  // ---------------------------------------------------------------------------

  private view(g: string, row: PaymentGatewaySetting | undefined, resolved: ResolvedGateway) {
    const fields = GATEWAY_CREDENTIAL_FIELDS[g] || [];
    const credentials: Record<string, string> = {};
    for (const f of fields) {
      const v = row?.credentials?.[f.key] || '';
      credentials[f.key] = f.secret ? (v ? MASK : '') : v;
    }
    return {
      gateway: g,
      label: GATEWAY_LABELS[g],
      displayName: row?.displayName || null,
      isEnabled: !!row?.isEnabled,
      isDefault: !!row?.isDefault,
      mode: row?.mode || 'test',
      currency: row?.currency || 'INR',
      feeAmount: row?.feeAmount != null ? Number(row.feeAmount) : null,
      methods: row?.methods?.length ? row.methods : [...PAYMENT_METHODS],
      credentials,
      fields,
      configured: this.hasRequired(g, row?.credentials || {}),
      usingServerKeys: g === 'razorpay' && !row && resolved.isEnabled,
      active: resolved.isEnabled,
      lastTestedAt: row?.lastTestedAt || null,
      lastTestResult: row?.lastTestResult || null,
      webhookPath: `/api/payments/webhook/${g}/${row?.organizationId || ':orgId'}`,
    };
  }

  async list(orgId: string) {
    const rows = await this.repo.find({ where: { organizationId: orgId } });
    const resolved = await this.resolveAll(orgId);
    const base = (this.config.get<string>('API_PUBLIC_URL') || '').replace(/\/$/, '');
    return {
      ...this.meta(),
      webhookBaseUrl: base ? `${base}/payments/webhook` : null,
      settings: PAYMENT_GATEWAYS.map((g) => {
        const v = this.view(g, rows.find((r) => r.gateway === g), resolved.find((r) => r.gateway === g)!);
        v.webhookPath = `/api/payments/webhook/${g}/${orgId}`;
        return v;
      }),
    };
  }

  async update(orgId: string, gateway: string, dto: UpdateGatewaySettingDto) {
    if (!(PAYMENT_GATEWAYS as readonly string[]).includes(gateway)) throw new BadRequestException('Unknown payment gateway');
    let row = await this.repo.findOne({ where: { organizationId: orgId, gateway } });
    if (!row) row = this.repo.create({ organizationId: orgId, gateway, credentials: {}, methods: [...PAYMENT_METHODS] });

    if (dto.credentials) {
      const fields = GATEWAY_CREDENTIAL_FIELDS[gateway];
      const next = { ...(row.credentials || {}) };
      for (const f of fields) {
        const v = dto.credentials[f.key];
        if (v === undefined || v === MASK) continue;
        next[f.key] = String(v).trim();
      }
      row.credentials = next;
    }
    if (dto.methods) {
      const m = dto.methods.filter((x) => (PAYMENT_METHODS as readonly string[]).includes(x));
      if (!m.length) throw new BadRequestException('Select at least one payment method');
      row.methods = m;
    }
    if (dto.mode) row.mode = dto.mode === 'live' ? 'live' : 'test';
    if (dto.currency) row.currency = dto.currency.toUpperCase().slice(0, 3);
    if (dto.feeAmount !== undefined) row.feeAmount = dto.feeAmount === null ? null : Number(dto.feeAmount);
    if (dto.displayName !== undefined) row.displayName = dto.displayName || null;
    if (dto.isEnabled !== undefined) {
      if (dto.isEnabled && !this.hasRequired(gateway, row.credentials)) {
        throw new BadRequestException(`Enter the required ${GATEWAY_LABELS[gateway]} credentials before enabling it`);
      }
      row.isEnabled = dto.isEnabled;
    }
    if (row.currency !== 'INR' && row.isEnabled && !row.feeAmount) {
      throw new BadRequestException(`Set the fee amount in ${row.currency} for international payments`);
    }
    if (dto.isDefault !== undefined) row.isDefault = dto.isDefault;
    if (row.isDefault && !row.isEnabled) row.isDefault = false;
    const saved = await this.repo.save(row);
    if (saved.isDefault) {
      await this.repo
        .createQueryBuilder()
        .update()
        .set({ isDefault: false })
        .where('organization_id = :orgId AND gateway <> :gateway', { orgId, gateway })
        .execute();
    }
    return (await this.list(orgId)).settings.find((s) => s.gateway === gateway);
  }

  async test(orgId: string, gateway: string) {
    const g = await this.resolve(orgId, gateway);
    let ok = false;
    let message: string;
    try {
      message = await this.client(gateway).testConnection(g.config);
      ok = true;
    } catch (e) {
      message = (e as Error).message;
      this.logger.warn(`Gateway test failed for ${gateway} (${orgId}): ${message}`);
    }
    const row = await this.repo.findOne({ where: { organizationId: orgId, gateway } });
    if (row) {
      row.lastTestedAt = new Date();
      row.lastTestResult = `${ok ? 'OK' : 'FAILED'}: ${message}`;
      await this.repo.save(row);
    }
    return { success: ok, message };
  }

  client(gateway: string) {
    switch (gateway) {
      case 'razorpay':
        return this.razorpay;
      case 'stripe':
        return this.stripe;
      case 'payu':
        return this.payu;
      case 'paytm':
        return this.paytm;
      default:
        throw new BadRequestException(`Unknown payment gateway "${gateway}"`);
    }
  }

  /** All org settings rows for a gateway that have a webhook secret (legacy Razorpay webhook route). */
  async rowsWithCredentials(gateway: string) {
    return this.repo.find({ where: { gateway } });
  }
}
