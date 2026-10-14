import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Between, In, IsNull, Not, Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { PaymentOrder, PaymentOrderStatus, PaymentOrderPurpose } from './entities/payment-order.entity.js';
import { PaymentRefund } from './entities/payment-refund.entity.js';
import { GATEWAY_LABELS } from './entities/payment-gateway-setting.entity.js';
import { Application } from '../applications/entities/application.entity.js';
import { Organization } from '../organizations/entities/organization.entity.js';
import { OfferAcceptance } from '../admissions-decisions/entities/offer-acceptance.entity.js';
import { OfferLetter } from '../admissions-decisions/entities/offer-letter.entity.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { CreateSeatBookingOrderDto } from './dto/create-seat-booking-order.dto.js';
import { VerifyPaymentDto } from './dto/verify-payment.dto.js';
import { CheckoutDto, RefundDto, RunReconciliationDto, UpdateReconciliationDto } from './dto/payment-admin.dto.js';
import { EmailTemplatesService } from '../email-templates/email-templates.service.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';
import { PaymentGatewaysService, ResolvedGateway } from './payment-gateways.service.js';
import { CheckoutResult, StatusResult, WebhookEvent } from './gateways/gateway.types.js';
import { ApplicationStatusService } from '../applications/application-status.service.js';
import { RemindersService } from '../reminders/reminders.service.js';
import { InAppNotificationsService } from '../in-app-notifications/in-app-notifications.service.js';
import { Role } from '../../common/enums/roles.enum.js';

const DEFAULT_APPLICATION_FEE = 2000;
// Phase 6b — default seat-booking fee (mirrors OrganizationsService's own default).
const DEFAULT_SEAT_BOOKING_FEE = 5000;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Scope picklist: Payment_Status = Pending / Success / Failed / Refunded */
export function toPaymentStatus(s?: string | null): 'Pending' | 'Success' | 'Failed' | 'Refunded' {
  switch ((s || '').toLowerCase()) {
    case 'paid':
    case 'success':
      return 'Success';
    case 'failed':
      return 'Failed';
    case 'refunded':
      return 'Refunded';
    default:
      return 'Pending';
  }
}

interface RequestUser {
  sub: string;
  role: string;
  organizationId?: string;
  email?: string;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(PaymentOrder)
    private readonly paymentOrderRepo: Repository<PaymentOrder>,
    @InjectRepository(PaymentRefund)
    private readonly refundRepo: Repository<PaymentRefund>,
    @InjectRepository(Application)
    private readonly applicationRepo: Repository<Application>,
    @InjectRepository(Organization)
    private readonly organizationRepo: Repository<Organization>,
    @InjectRepository(OfferAcceptance)
    private readonly offerAcceptanceRepo: Repository<OfferAcceptance>,
    @InjectRepository(OfferLetter)
    private readonly offerLetterRepo: Repository<OfferLetter>,
    private readonly configService: ConfigService,
    private readonly emailTemplatesService: EmailTemplatesService,
    private readonly gateways: PaymentGatewaysService,
    private readonly statusService: ApplicationStatusService,
    private readonly reminders: RemindersService,
    private readonly inApp: InAppNotificationsService,
  ) {}

  // ===========================================================================
  // FEES / HELPERS
  // ===========================================================================

  private async orgFor(application: Application) {
    let organization = application.organizationId
      ? await this.organizationRepo.findOne({ where: { id: application.organizationId } })
      : null;
    if (!organization) organization = await this.organizationRepo.findOne({ where: {}, order: { createdAt: 'ASC' } });
    return organization;
  }

  private applicationFee(org: Organization | null) {
    let fee = Number(org?.settings?.applicationFee ?? DEFAULT_APPLICATION_FEE);
    const s = org?.settings;
    if (s?.discountEnabled) {
      const todayStr = new Date().toISOString().split('T')[0];
      const isStarted = !s.discountStartDate || todayStr >= s.discountStartDate;
      const isNotExpired = !s.discountEndDate || todayStr <= s.discountEndDate;
      if (isStarted && isNotExpired && s.discountValue) {
        if (s.discountType === 'percentage') {
          const pct = Math.min(100, Math.max(0, Number(s.discountValue)));
          fee = Math.max(0, fee - (fee * pct) / 100);
        } else {
          fee = Math.max(0, fee - Number(s.discountValue));
        }
      }
    }
    return fee;
  }

  private async findApplication(idOrNo: string) {
    const app = UUID_RE.test(idOrNo)
      ? await this.applicationRepo.findOne({ where: { id: idOrNo } })
      : await this.applicationRepo.findOne({ where: { applicationNo: idOrNo } });
    if (!app) throw new NotFoundException(`Application with ID "${idOrNo}" not found`);
    return app;
  }

  private portalBase() {
    return (
      this.configService.get<string>('STUDENT_PORTAL_URL') ||
      this.configService.get<string>('FRONTEND_URL') ||
      'http://localhost:3001'
    ).replace(/\/$/, '');
  }

  private apiBase() {
    return (
      this.configService.get<string>('API_PUBLIC_URL') ||
      `http://localhost:${this.configService.get('PORT') || 3000}/api`
    ).replace(/\/$/, '');
  }

  /** Accepts a frontend return URL only on a known host (prevents open redirects). */
  private safeReturnUrl(url?: string | null) {
    const fallback = `${this.portalBase()}/payment-status`;
    if (!url) return fallback;
    try {
      const u = new URL(url);
      const allowed = [
        this.configService.get<string>('STUDENT_PORTAL_URL'),
        this.configService.get<string>('FRONTEND_URL'),
        ...(this.configService.get<string>('CORS_ORIGINS') || '').split(','),
      ]
        .filter(Boolean)
        .map((x) => {
          try {
            return new URL(String(x).trim()).host;
          } catch {
            return '';
          }
        });
      if (u.hostname === 'localhost' || u.hostname === '127.0.0.1' || allowed.includes(u.host)) return u.toString();
    } catch {
      /* fall through */
    }
    return fallback;
  }

  private withParams(url: string, params: Record<string, string>) {
    const u = new URL(url);
    for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
    return u.toString();
  }

  private assertOwner(app: Application, user?: RequestUser) {
    if (!user || user.role === Role.SUPERADMIN) return;
    if (user.role !== Role.STUDENT) {
      if (user.organizationId && app.organizationId && user.organizationId !== app.organizationId) {
        throw new ForbiddenException('This application belongs to another organization');
      }
      return;
    }
    const owns =
      (app.studentId && app.studentId === user.sub) ||
      (!!user.email && !!app.email && app.email.toLowerCase() === user.email.toLowerCase());
    if (!owns) {
      // Student JWTs may carry a user id that differs from studentId; allow when org matches.
      if (user.organizationId && app.organizationId && user.organizationId !== app.organizationId) {
        throw new ForbiddenException('You cannot pay for this application');
      }
    }
  }

  // ===========================================================================
  // CHECKOUT (all gateways)
  // ===========================================================================

  /** Gateways the student can choose from for this application. */
  async availableGateways(applicationIdOrNo: string, purpose = 'application_fee', offerAcceptanceId?: string, user?: RequestUser) {
    const app = await this.findApplication(applicationIdOrNo);
    this.assertOwner(app, user);
    const org = await this.orgFor(app);
    const enabled = await this.gateways.enabled(org?.id || null);
    const inrAmount =
      purpose === 'seat_booking_fee' && offerAcceptanceId
        ? Number((await this.offerAcceptanceRepo.findOne({ where: { id: offerAcceptanceId } }))?.seatBookingFee ?? DEFAULT_SEAT_BOOKING_FEE)
        : this.applicationFee(org);
    return {
      applicationId: app.id,
      applicationNo: app.applicationNo,
      paymentStatus: toPaymentStatus(app.paymentStatus),
      gateways: enabled.map((g) => {
        const q = this.quote(g, inrAmount);
        return {
          gateway: g.gateway,
          label: g.label,
          isDefault: g.isDefault,
          currency: q.currency,
          amount: q.amount,
          methods: g.methods,
          international: q.currency !== 'INR',
          mode: g.config.mode,
        };
      }),
    };
  }

  private quote(g: ResolvedGateway, inrAmount: number) {
    if (g.currency && g.currency !== 'INR' && g.feeAmount) return { currency: g.currency, amount: Number(g.feeAmount) };
    return { currency: 'INR', amount: inrAmount };
  }

  async checkout(dto: CheckoutDto, user?: RequestUser) {
    const purpose = dto.purpose === 'seat_booking_fee' ? PaymentOrderPurpose.SEAT_BOOKING_FEE : PaymentOrderPurpose.APPLICATION_FEE;
    let application: Application;
    let inrAmount: number;
    let offerAcceptance: OfferAcceptance | null = null;

    if (purpose === PaymentOrderPurpose.SEAT_BOOKING_FEE) {
      if (!dto.offerAcceptanceId) throw new BadRequestException('offerAcceptanceId is required for the seat booking fee');
      offerAcceptance = await this.offerAcceptanceRepo.findOne({ where: { id: dto.offerAcceptanceId } });
      if (!offerAcceptance) throw new NotFoundException(`Offer acceptance with ID "${dto.offerAcceptanceId}" not found`);
      const letter = await this.offerLetterRepo.findOne({ where: { id: offerAcceptance.offerLetterId } });
      if (!letter) throw new NotFoundException('Offer letter for this acceptance not found');
      application = await this.findApplication(letter.applicationId);
      if ((offerAcceptance.feePaymentStatus || '').toLowerCase() === 'paid') {
        throw new BadRequestException('The seat booking fee has already been paid');
      }
      inrAmount = Number(offerAcceptance.seatBookingFee ?? DEFAULT_SEAT_BOOKING_FEE);
    } else {
      application = await this.findApplication(dto.applicationId);
      if (['success', 'paid'].includes((application.paymentStatus || '').toLowerCase())) {
        throw new BadRequestException('The application fee has already been paid');
      }
      inrAmount = this.applicationFee(await this.orgFor(application));
    }
    this.assertOwner(application, user);

    const org = await this.orgFor(application);
    const enabled = await this.gateways.enabled(org?.id || null);
    if (!enabled.length) throw new BadRequestException('Online payment is not set up for this institution yet');
    const g = dto.gateway ? enabled.find((x) => x.gateway === dto.gateway) : enabled.find((x) => x.isDefault) || enabled[0];
    if (!g) throw new BadRequestException(`${GATEWAY_LABELS[dto.gateway!] || dto.gateway} is not enabled`);

    const { amount, currency } = this.quote(g, inrAmount);
    if (!(amount > 0)) throw new BadRequestException('Fee amount is not configured');

    let order = this.paymentOrderRepo.create({
      applicationId: application.id,
      organizationId: application.organizationId || org?.id || null,
      gateway: g.gateway,
      amount,
      currency,
      status: PaymentOrderStatus.CREATED,
      purpose,
      offerAcceptanceId: offerAcceptance?.id as any,
      isInternational: currency !== 'INR',
      returnUrl: this.safeReturnUrl(dto.returnUrl),
    });
    order = await this.paymentOrderRepo.save(order);

    const returnUrl = order.returnUrl!;
    let checkout: CheckoutResult;
    try {
      const input = {
        paymentId: order.id,
        paymentNo: order.paymentNo,
        applicationId: application.id,
        applicationNo: application.applicationNo,
        amount,
        currency,
        customer: {
          name: application.name || 'Applicant',
          email: application.email || '',
          phone: application.primaryMobile || '',
          id: application.studentId || application.id,
        },
        description: purpose === PaymentOrderPurpose.SEAT_BOOKING_FEE ? `Seat booking fee - ${application.applicationNo}` : `Application fee - ${application.applicationNo}`,
        returnUrl,
        callbackUrl: `${this.apiBase()}/payments/callback/${g.gateway}/${order.id}`,
        cancelUrl: returnUrl,
      };
      switch (g.gateway) {
        case 'razorpay':
          checkout = await this.gateways.razorpay.createCheckout(g.config, input, {
            ...(offerAcceptance ? { offerAcceptanceId: offerAcceptance.id } : {}),
          });
          break;
        case 'stripe':
          checkout = await this.gateways.stripe.createCheckout(g.config, input);
          break;
        case 'payu':
          checkout = await this.gateways.payu.createCheckout(g.config, input);
          break;
        case 'paytm':
          checkout = await this.gateways.paytm.createCheckout(g.config, input);
          break;
        default:
          throw new BadRequestException('Unknown gateway');
      }
    } catch (e) {
      order.status = PaymentOrderStatus.FAILED;
      order.failureReason = `Could not start checkout: ${(e as Error).message}`;
      await this.paymentOrderRepo.save(order);
      this.logger.error(`Checkout failed (${g.gateway}) for ${application.applicationNo}: ${(e as Error).message}`);
      throw new BadRequestException(`Could not start ${g.label} checkout: ${(e as Error).message}`);
    }

    order.gatewayOrderId = checkout.gatewayOrderId;
    if (g.gateway === 'razorpay') order.razorpayOrderId = checkout.gatewayOrderId;
    await this.paymentOrderRepo.save(order);

    return {
      paymentId: order.id,
      paymentNo: order.paymentNo,
      gateway: g.gateway,
      gatewayLabel: g.label,
      amount,
      currency,
      checkout,
      prefill: { name: application.name, email: application.email, contact: application.primaryMobile },
      description: purpose === PaymentOrderPurpose.SEAT_BOOKING_FEE ? 'Seat Booking Fee' : 'Application Fee',
    };
  }

  /** Legacy endpoint kept for existing screens — Razorpay application-fee order. */
  async createOrder(dto: CreateOrderDto, user?: RequestUser) {
    const res = await this.checkout({ applicationId: dto.applicationId, gateway: 'razorpay' }, user);
    const c = res.checkout as Extract<CheckoutResult, { action: 'razorpay_checkout' }>;
    return { orderId: c.gatewayOrderId, amount: c.amountMinor, currency: c.currency, keyId: c.keyId, paymentId: res.paymentId };
  }

  async createSeatBookingOrder(dto: CreateSeatBookingOrderDto, user?: RequestUser) {
    const res = await this.checkout(
      { applicationId: '', offerAcceptanceId: dto.offerAcceptanceId, purpose: 'seat_booking_fee', gateway: 'razorpay' },
      user,
    );
    const c = res.checkout as Extract<CheckoutResult, { action: 'razorpay_checkout' }>;
    return { orderId: c.gatewayOrderId, amount: c.amountMinor, currency: c.currency, keyId: c.keyId, paymentId: res.paymentId };
  }

  private async findByGatewayOrder(gateway: string, gatewayOrderId?: string | null) {
    if (!gatewayOrderId) return null;
    return (
      (await this.paymentOrderRepo.findOne({ where: { gateway, gatewayOrderId } })) ||
      (gateway === 'razorpay' ? await this.paymentOrderRepo.findOne({ where: { razorpayOrderId: gatewayOrderId } }) : null)
    );
  }

  private async configFor(order: PaymentOrder) {
    return this.gateways.resolve(order.organizationId || null, order.gateway || 'razorpay');
  }

  /** Razorpay Checkout handler response — signature verified with the org's key secret. */
  async verifyPayment(dto: VerifyPaymentDto) {
    const order = await this.findByGatewayOrder('razorpay', dto.razorpay_order_id);
    if (!order) throw new NotFoundException('Payment order not found');
    const g = await this.configFor(order);
    if (!this.gateways.razorpay.verifyCheckoutSignature(g.config, dto.razorpay_order_id, dto.razorpay_payment_id, dto.razorpay_signature)) {
      throw new BadRequestException('Invalid payment signature');
    }
    order.razorpaySignature = dto.razorpay_signature;
    let status: StatusResult = { status: 'success', transactionId: dto.razorpay_payment_id };
    try {
      const fetched = await this.gateways.razorpay.fetchStatus(g.config, dto.razorpay_order_id);
      if (fetched.status === 'success') status = fetched;
    } catch (e) {
      this.logger.warn(`Razorpay status lookup failed: ${(e as Error).message}`);
    }
    await this.applyStatus(order, status);
    return { success: true, paymentId: order.id, status: toPaymentStatus(order.status) };
  }

  /** Re-checks a payment with its gateway (Stripe return page, manual refresh). */
  async confirm(paymentId: string, user?: RequestUser) {
    const order = await this.paymentOrderRepo.findOne({ where: { id: paymentId }, relations: ['application'] });
    if (!order) throw new NotFoundException('Payment not found');
    if (order.application) this.assertOwner(order.application, user);
    if (order.status === PaymentOrderStatus.CREATED && order.gatewayOrderId) {
      try {
        const g = await this.configFor(order);
        const st = await this.fetchGatewayStatus(order, g);
        await this.applyStatus(order, st);
      } catch (e) {
        this.logger.warn(`Confirm failed for payment ${order.id}: ${(e as Error).message}`);
      }
    }
    return this.publicView(order);
  }

  private publicView(order: PaymentOrder) {
    return {
      paymentId: order.id,
      paymentNo: order.paymentNo,
      applicationId: order.applicationId,
      purpose: order.purpose,
      gateway: order.gateway,
      gatewayLabel: GATEWAY_LABELS[order.gateway] || order.gateway,
      amount: Number(order.amount),
      currency: order.currency,
      status: toPaymentStatus(order.status),
      transactionId: order.transactionId,
      method: order.method,
      paidAt: order.paidAt,
      failureReason: order.failureReason,
    };
  }

  private async fetchGatewayStatus(order: PaymentOrder, g: ResolvedGateway): Promise<StatusResult> {
    const id = order.gatewayOrderId || order.razorpayOrderId;
    if (!id) return { status: 'pending' };
    switch (order.gateway) {
      case 'stripe':
        return this.gateways.stripe.fetchStatus(g.config, id);
      case 'payu':
        return this.gateways.payu.fetchStatus(g.config, id);
      case 'paytm':
        return this.gateways.paytm.fetchStatus(g.config, id);
      default:
        return this.gateways.razorpay.fetchStatus(g.config, id);
    }
  }

  /** PayU / Paytm post the browser back here; verify the hash / checksum, update, then redirect. */
  async handleCallback(gateway: string, paymentId: string, body: Record<string, any>) {
    const order = UUID_RE.test(paymentId) ? await this.paymentOrderRepo.findOne({ where: { id: paymentId } }) : null;
    const fallback = `${this.portalBase()}/payment-status`;
    if (!order || order.gateway !== gateway) return this.withParams(fallback, { status: 'unknown' });
    const back = order.returnUrl || fallback;
    try {
      const g = await this.configFor(order);
      let st: StatusResult | null = null;
      if (gateway === 'payu') {
        if (this.gateways.payu.verifyResponse(g.config, body) && body.txnid === order.gatewayOrderId) {
          st = this.gateways.payu.responseStatus(body);
        }
      } else if (gateway === 'paytm') {
        if (this.gateways.paytm.verifyCallback(g.config, body) && body.ORDERID === order.gatewayOrderId) {
          st = this.gateways.paytm.callbackStatus(body);
        }
      }
      if (!st) {
        this.logger.warn(`Invalid ${gateway} callback hash for payment ${order.id}; checking with the gateway`);
        st = await this.fetchGatewayStatus(order, g);
      } else if (st.status === 'success') {
        // Double-check with the status API before granting (amount tampering protection).
        try {
          const api = await this.fetchGatewayStatus(order, g);
          if (api.status !== 'pending') st = { ...st, ...api, method: api.method || st.method };
        } catch {
          /* trust the verified hash */
        }
      }
      await this.applyStatus(order, st);
    } catch (e) {
      this.logger.error(`${gateway} callback failed for ${paymentId}: ${(e as Error).message}`);
    }
    return this.withParams(back, { paymentId: order.id, status: toPaymentStatus(order.status).toLowerCase() });
  }

  /** Applies a gateway result to our record (idempotent). */
  private async applyStatus(order: PaymentOrder, st: StatusResult) {
    order.gatewayStatus = st.status;
    order.gatewayCheckedAt = new Date();
    if (st.amount != null) order.gatewayAmount = st.amount;
    if (st.status === 'success') {
      if (st.amount != null && Math.abs(Number(st.amount) - Number(order.amount)) > 0.01) {
        order.reconciliationStatus = 'Unmatched';
        order.reconciliationNotes = `Gateway amount ${st.amount} differs from expected ${order.amount}`;
      }
      await this.markPaid(order, st);
    } else if (st.status === 'failed') {
      await this.markFailed(order, st.failureReason || 'Payment failed', st.transactionId);
    } else {
      await this.paymentOrderRepo.save(order);
    }
  }

  private async markPaid(order: PaymentOrder, st: StatusResult) {
    if (order.status === PaymentOrderStatus.PAID || order.status === PaymentOrderStatus.REFUNDED) {
      await this.paymentOrderRepo.save(order);
      return;
    }
    // Atomic claim: the browser callback, the webhook and the reconciliation
    // job can all report the same payment at once — only one may apply the
    // side effects (application update, notifications, email).
    const claim = await this.paymentOrderRepo.update(
      { id: order.id, status: Not(In([PaymentOrderStatus.PAID, PaymentOrderStatus.REFUNDED])) },
      { status: PaymentOrderStatus.PAID },
    );
    if (!claim.affected) {
      order.status = PaymentOrderStatus.PAID;
      return;
    }
    order.status = PaymentOrderStatus.PAID;
    order.transactionId = st.transactionId || order.transactionId;
    if (order.gateway === 'razorpay' && st.transactionId) order.razorpayPaymentId = st.transactionId;
    order.method = st.method || order.method || 'Other';
    if (st.isInternational) order.isInternational = true;
    order.failureReason = null;
    order.paidAt = new Date();
    if (st.raw) order.gatewayResponse = st.raw;
    await this.paymentOrderRepo.save(order);

    if (order.purpose === PaymentOrderPurpose.SEAT_BOOKING_FEE) {
      if (order.offerAcceptanceId) {
        const oa = await this.offerAcceptanceRepo.findOne({ where: { id: order.offerAcceptanceId } });
        if (oa) {
          oa.feePaymentStatus = 'paid';
          oa.paymentReferenceId = order.transactionId;
          await this.offerAcceptanceRepo.save(oa);
        }
      }
      return;
    }

    const application = await this.applicationRepo.findOne({ where: { id: order.applicationId } });
    if (!application) return;
    application.paymentStatus = 'success';
    application.paymentAmount = order.amount;
    application.paymentDate = new Date();
    application.paymentReference = order.transactionId || '';
    application.paymentMode = `${GATEWAY_LABELS[order.gateway] || order.gateway} - ${order.method}`;
    await this.applicationRepo.save(application);

    // Status rules engine (Application Started -> Fee Paid) and reminders (closes "Fee Pending").
    await this.statusService.evaluate(application.id).catch(() => undefined);
    await this.reminders.refreshForApplication(application.id).catch(() => undefined);

    const studentUserId = await this.statusService.findStudentUserId(application).catch(() => null);
    if (studentUserId) {
      await this.inApp.notify({
        organizationId: application.organizationId,
        recipientUserId: studentUserId,
        module: 'applications',
        type: 'payment_success',
        severity: 'success',
        title: 'Application fee received',
        body: `We received ${order.currency} ${Number(order.amount).toFixed(2)} for application ${application.applicationNo}.`,
        link: '/my-application',
        relatedEntityId: application.id,
      });
    }
    await this.inApp.notify({
      organizationId: application.organizationId,
      recipientRole: Role.APPLICATION_MANAGER,
      module: 'applications',
      type: 'payment_success',
      severity: 'info',
      title: 'Application fee paid',
      body: `${application.name || 'Applicant'} paid ${order.currency} ${Number(order.amount).toFixed(2)} via ${GATEWAY_LABELS[order.gateway] || order.gateway} (${application.applicationNo}).`,
      link: `/organization/applications/${application.applicationNo}`,
      relatedEntityId: application.id,
    });

    await this.emailTemplatesService
      .sendTransactional({
        organizationId: application.organizationId,
        categorySlug: 'fee_payment_confirmation',
        to: application.email,
        applicationNo: application.applicationNo,
        applicantName: application.name,
        variables: {
          name: application.name,
          email: application.email,
          phone: application.primaryMobile,
          application_no: application.applicationNo,
          academic_session: application.academicSession,
          course: application.program,
          branch: application.confirmedCampus,
          amount: String(order.amount),
          currency: order.currency,
          payment_method: order.method,
          transaction_id: order.transactionId || '',
          paid_at: order.paidAt?.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        },
      })
      .catch((e: Error) => this.logger.warn(`Payment confirmation email failed: ${e.message}`));
  }

  private async markFailed(order: PaymentOrder, reason: string, transactionId?: string | null) {
    if (order.status === PaymentOrderStatus.PAID || order.status === PaymentOrderStatus.REFUNDED) return;
    // Conditional write so a late "failed" never overwrites a concurrent success.
    const res = await this.paymentOrderRepo.update(
      { id: order.id, status: Not(In([PaymentOrderStatus.PAID, PaymentOrderStatus.REFUNDED])) },
      {
        status: PaymentOrderStatus.FAILED,
        failureReason: reason,
        ...(transactionId ? { transactionId } : {}),
        ...(order.gatewayCheckedAt ? { gatewayStatus: order.gatewayStatus, gatewayCheckedAt: order.gatewayCheckedAt } : {}),
      },
    );
    if (!res.affected) return;
    order.status = PaymentOrderStatus.FAILED;
    order.failureReason = reason;
    if (transactionId) order.transactionId = transactionId;
    if (order.purpose !== PaymentOrderPurpose.SEAT_BOOKING_FEE && order.applicationId) {
      const app = await this.applicationRepo.findOne({ where: { id: order.applicationId } });
      if (app && !['success', 'paid'].includes((app.paymentStatus || '').toLowerCase())) {
        await this.applicationRepo.update({ id: app.id }, { paymentStatus: 'failed' });
      }
    }
  }

  async recordFailure(orderId: string, reason?: string, user?: RequestUser) {
    if (!orderId) return { success: false };
    const order =
      (UUID_RE.test(orderId) ? await this.paymentOrderRepo.findOne({ where: { id: orderId }, relations: ['application'] }) : null) ||
      (await this.paymentOrderRepo.findOne({ where: { gatewayOrderId: orderId }, relations: ['application'] })) ||
      (await this.paymentOrderRepo.findOne({ where: { razorpayOrderId: orderId }, relations: ['application'] }));
    if (!order) return { success: false };
    if (order.application) this.assertOwner(order.application, user);
    await this.markFailed(order, reason || 'Payment cancelled or failed at checkout');
    return { success: true };
  }

  // ===========================================================================
  // WEBHOOKS (real-time confirmation)
  // ===========================================================================

  async handleWebhook(gateway: string, orgId: string | null, rawBody: Buffer | undefined, headers: Record<string, any>, body: any) {
    let event: WebhookEvent;
    let config: ResolvedGateway | null = null;

    if (gateway === 'razorpay' && !orgId) {
      // Legacy route without orgId: find the org from the order, then verify.
      const orderId = body?.payload?.payment?.entity?.order_id;
      const payId = body?.payload?.refund?.entity?.payment_id;
      const order =
        (await this.findByGatewayOrder('razorpay', orderId)) ||
        (payId ? await this.paymentOrderRepo.findOne({ where: { transactionId: payId } }) : null);
      config = await this.gateways.resolve(order?.organizationId || null, 'razorpay');
    } else {
      config = await this.gateways.resolve(orgId, gateway);
    }

    let valid = false;
    switch (gateway) {
      case 'razorpay':
        valid = !!rawBody && this.gateways.razorpay.verifyWebhook(config.config, rawBody, headers['x-razorpay-signature']);
        event = this.gateways.razorpay.parseWebhook(body);
        break;
      case 'stripe':
        valid = !!rawBody && this.gateways.stripe.verifyWebhook(config.config, rawBody, headers['stripe-signature']);
        event = this.gateways.stripe.parseWebhook(body);
        break;
      case 'payu':
        valid = this.gateways.payu.verifyWebhook(config.config, body);
        event = this.gateways.payu.parseWebhook(body);
        break;
      case 'paytm':
        valid = this.gateways.paytm.verifyWebhook(config.config, body);
        event = this.gateways.paytm.parseWebhook(body);
        break;
      default:
        throw new BadRequestException('Unknown gateway');
    }
    if (!valid) throw new BadRequestException('Invalid webhook signature');
    await this.processEvent(gateway, event, orgId, config);
    return { received: true };
  }

  /**
   * A webhook verified with one organization's credentials may only touch orders of
   * organizations that use those same credentials (e.g. the shared server Razorpay keys).
   */
  private async sameCredentials(orgId: string | null, verifiedWith: ResolvedGateway | null, owner: string | null, gateway: string) {
    if (!orgId || !owner || owner === orgId) return true;
    if (!verifiedWith) return false;
    const ownerCfg = await this.gateways.resolve(owner, gateway).catch(() => null);
    return !!ownerCfg && JSON.stringify(ownerCfg.config.credentials) === JSON.stringify(verifiedWith.config.credentials);
  }

  private async processEvent(gateway: string, event: WebhookEvent, orgId: string | null = null, verifiedWith: ResolvedGateway | null = null) {
    if (event.kind === 'ignore') return;
    if (event.kind === 'payment_success' || event.kind === 'payment_failed') {
      const order = await this.findByGatewayOrder(gateway, event.gatewayOrderId);
      if (!order) {
        this.logger.warn(`${gateway} webhook for unknown order ${event.gatewayOrderId}`);
        return;
      }
      // A webhook signed with one organization's secret may only touch that organization's orders.
      if (!(await this.sameCredentials(orgId, verifiedWith, order.organizationId, gateway))) {
        this.logger.warn(`${gateway} webhook for org ${orgId} referenced order ${order.id} of another organization; ignored`);
        return;
      }
      if (event.kind === 'payment_success') {
        let st: StatusResult = { status: 'success', transactionId: event.transactionId, method: event.method, amount: event.amount };
        // Stripe session events carry no method — fetch details.
        if (!event.method) {
          try {
            const api = await this.fetchGatewayStatus(order, await this.configFor(order));
            if (api.status === 'success') st = api;
          } catch {
            /* keep webhook data */
          }
        }
        await this.applyStatus(order, st);
      } else {
        await this.markFailed(order, 'Payment failed (gateway notification)', event.transactionId);
      }
      return;
    }
    // Refund events
    const refund = event.gatewayRefundId ? await this.refundRepo.findOne({ where: { gateway, gatewayRefundId: event.gatewayRefundId } }) : null;
    if (!refund) return;
    if (!(await this.sameCredentials(orgId, verifiedWith, refund.organizationId, gateway))) return;
    refund.status = event.kind === 'refund_completed' ? 'Completed' : 'Failed';
    await this.refundRepo.save(refund);
    await this.recomputeRefunds(refund.paymentOrderId);
  }

  // ===========================================================================
  // REFUNDS (full / partial via each gateway's refund API)
  // ===========================================================================

  private async orderForOrg(orgId: string | undefined, id: string) {
    const order = await this.paymentOrderRepo.findOne({ where: { id }, relations: ['application'] });
    if (!order) throw new NotFoundException('Payment not found');
    const owner = order.organizationId || order.application?.organizationId;
    if (orgId && owner && owner !== orgId) throw new NotFoundException('Payment not found');
    return order;
  }

  async refund(orgId: string | undefined, id: string, dto: RefundDto, userId: string) {
    const order = await this.orderForOrg(orgId, id);
    if (order.status !== PaymentOrderStatus.PAID) throw new BadRequestException('Only successful payments can be refunded');
    const txn = order.transactionId || order.razorpayPaymentId;
    if (!txn) throw new BadRequestException('This payment has no gateway transaction ID to refund');

    const existing = await this.refundRepo.find({ where: { paymentOrderId: order.id } });
    const already = existing.filter((r) => r.status !== 'Failed').reduce((s, r) => s + Number(r.amount), 0);
    const remaining = Math.round((Number(order.amount) - already) * 100) / 100;
    if (remaining <= 0) throw new BadRequestException('This payment has already been fully refunded');
    const amount = dto.amount ? Math.round(Number(dto.amount) * 100) / 100 : remaining;
    if (amount > remaining + 0.001) throw new BadRequestException(`Refund amount cannot exceed ${remaining.toFixed(2)}`);

    const g = await this.configFor(order);
    const reference = `RF${order.paymentNo}${Date.now().toString(36)}`.toUpperCase().slice(0, 40);
    let result;
    switch (order.gateway) {
      case 'stripe':
        result = await this.gateways.stripe.refund(g.config, txn, amount, order.currency, reference);
        break;
      case 'payu':
        result = await this.gateways.payu.refund(g.config, txn, amount, reference);
        break;
      case 'paytm':
        result = await this.gateways.paytm.refund(g.config, order.gatewayOrderId || '', txn, amount, reference);
        break;
      default:
        result = await this.gateways.razorpay.refund(g.config, txn, amount, reference);
    }

    const refund = await this.refundRepo.save(
      this.refundRepo.create({
        organizationId: order.organizationId || order.application?.organizationId || null,
        paymentOrderId: order.id,
        gateway: order.gateway,
        amount,
        refundType: Math.abs(amount - Number(order.amount)) < 0.01 && already === 0 ? 'full' : 'partial',
        status: result.status,
        gatewayRefundId: result.gatewayRefundId || null,
        reference,
        reason: dto.reason || null,
        error: result.error || null,
        gatewayResponse: result.raw || null,
        createdBy: userId,
      }),
    );
    await this.recomputeRefunds(order.id);
    if (!result.success) throw new BadRequestException(`Refund failed: ${result.error || 'gateway rejected the refund'}`);
    return { refund: this.refundView(refund), payment: await this.adminView(order.id) };
  }

  private refundView(r: PaymentRefund) {
    return {
      id: r.id,
      amount: Number(r.amount),
      refundType: r.refundType,
      status: r.status,
      gateway: r.gateway,
      gatewayRefundId: r.gatewayRefundId,
      reference: r.reference,
      reason: r.reason,
      error: r.error,
      createdBy: r.createdBy,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  }

  private async recomputeRefunds(paymentOrderId: string) {
    const order = await this.paymentOrderRepo.findOne({ where: { id: paymentOrderId } });
    if (!order) return;
    const refunds = await this.refundRepo.find({ where: { paymentOrderId } });
    const live = refunds.filter((r) => r.status !== 'Failed');
    const total = live.reduce((s, r) => s + Number(r.amount), 0);
    const completed = live.filter((r) => r.status === 'Completed').reduce((s, r) => s + Number(r.amount), 0);
    order.refundAmount = Math.round(total * 100) / 100;
    order.refundStatus = live.some((r) => r.status === 'In Progress') ? 'In Progress' : total > 0 ? 'Completed' : 'Not Initiated';
    const fully = completed >= Number(order.amount) - 0.01;
    if (fully && order.status === PaymentOrderStatus.PAID) {
      order.status = PaymentOrderStatus.REFUNDED;
      if (order.purpose !== PaymentOrderPurpose.SEAT_BOOKING_FEE) {
        await this.applicationRepo.update({ id: order.applicationId }, { paymentStatus: 'refunded' });
      }
    }
    await this.paymentOrderRepo.save(order);
  }

  async refunds(orgId: string | undefined, id: string) {
    const order = await this.orderForOrg(orgId, id);
    const rows = await this.refundRepo.find({ where: { paymentOrderId: order.id }, order: { createdAt: 'DESC' } });
    return rows.map((r) => this.refundView(r));
  }

  /** Polls gateways for refunds still in progress. */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async syncRefunds() {
    const pending = await this.refundRepo.find({ where: { status: 'In Progress' }, relations: ['paymentOrder'], take: 100 });
    for (const r of pending) {
      try {
        const g = await this.gateways.resolve(r.paymentOrder?.organizationId || r.organizationId, r.gateway);
        let res;
        if (r.gateway === 'paytm') res = await this.gateways.paytm.fetchRefund(g.config, r.paymentOrder.gatewayOrderId || '', r.reference);
        else if (!r.gatewayRefundId) continue;
        else if (r.gateway === 'stripe') res = await this.gateways.stripe.fetchRefund(g.config, r.gatewayRefundId);
        else if (r.gateway === 'payu') res = await this.gateways.payu.fetchRefund(g.config, r.gatewayRefundId);
        else res = await this.gateways.razorpay.fetchRefund(g.config, r.gatewayRefundId);
        if (res.status !== r.status) {
          r.status = res.status;
          if (res.gatewayRefundId) r.gatewayRefundId = res.gatewayRefundId;
          await this.refundRepo.save(r);
          await this.recomputeRefunds(r.paymentOrderId);
        }
      } catch (e) {
        this.logger.warn(`Refund sync failed for ${r.id}: ${(e as Error).message}`);
      }
    }
  }

  // ===========================================================================
  // RECONCILIATION
  // ===========================================================================

  private adminRow(po: PaymentOrder) {
    const app = po.application;
    return {
      id: po.id,
      paymentNo: po.paymentNo,
      paymentId: `PAY-${String(po.paymentNo).padStart(6, '0')}`,
      applicationId: po.applicationId,
      applicationNo: app?.applicationNo || '—',
      applicantName: app?.name || app?.student?.name || '—',
      applicantEmail: app?.email || app?.student?.email || '—',
      applicantPhone: app?.primaryMobile || app?.student?.phone || '—',
      program: app?.program || '—',
      campus: app?.confirmedCampus || app?.preference1Branch?.name || '—',
      amount: Number(po.amount),
      currency: po.currency || 'INR',
      status: toPaymentStatus(po.status) === 'Success' ? 'paid' : toPaymentStatus(po.status).toLowerCase(),
      paymentStatus: toPaymentStatus(po.status),
      purpose: po.purpose || 'application_fee',
      gateway: po.gateway || 'razorpay',
      gatewayLabel: GATEWAY_LABELS[po.gateway] || po.gateway,
      gatewayOrderId: po.gatewayOrderId || po.razorpayOrderId,
      transactionId: po.transactionId || po.razorpayPaymentId || null,
      method: po.method || null,
      isInternational: po.isInternational,
      reconciliationStatus: po.reconciliationStatus || 'Unmatched',
      reconciliationNotes: po.reconciliationNotes,
      reconciledAt: po.reconciledAt,
      gatewayStatus: po.gatewayStatus,
      gatewayAmount: po.gatewayAmount != null ? Number(po.gatewayAmount) : null,
      gatewayCheckedAt: po.gatewayCheckedAt,
      refundStatus: po.refundStatus || 'Not Initiated',
      refundAmount: Number(po.refundAmount || 0),
      financeRemarks: po.financeRemarks,
      failureReason: po.failureReason,
      razorpayOrderId: po.razorpayOrderId || '—',
      razorpayPaymentId: po.razorpayPaymentId || po.transactionId || '—',
      createdAt: po.createdAt,
      paidAt: po.paidAt,
    };
  }

  async adminView(id: string) {
    const po = await this.paymentOrderRepo.findOne({ where: { id }, relations: ['application', 'application.student', 'application.preference1Branch'] });
    if (!po) throw new NotFoundException('Payment not found');
    return this.adminRow(po);
  }

  async detail(orgId: string | undefined, id: string) {
    await this.orderForOrg(orgId, id);
    return { ...(await this.adminView(id)), refunds: await this.refunds(orgId, id) };
  }

  private orgOrdersQuery(orgId: string | undefined) {
    const qb = this.paymentOrderRepo
      .createQueryBuilder('po')
      .leftJoinAndSelect('po.application', 'application')
      .leftJoinAndSelect('application.student', 'student')
      .leftJoinAndSelect('application.preference1Branch', 'preference1Branch');
    if (orgId) {
      qb.where('(po.organization_id = :orgId OR (po.organization_id IS NULL AND (application.organization_id = :orgId OR application.organization_id IS NULL)))', { orgId });
    }
    return qb;
  }

  private range(dateFrom?: string, dateTo?: string) {
    const from = dateFrom ? new Date(dateFrom) : null;
    if (from) from.setHours(0, 0, 0, 0);
    const to = dateTo ? new Date(dateTo) : null;
    if (to) to.setHours(23, 59, 59, 999);
    return { from, to };
  }

  async reconciliation(orgId: string | undefined, q: any) {
    const qb = this.orgOrdersQuery(orgId);
    const { from, to } = this.range(q.dateFrom, q.dateTo);
    if (from) qb.andWhere('po.created_at >= :from', { from });
    if (to) qb.andWhere('po.created_at <= :to', { to });
    if (q.gateway && q.gateway !== 'all') qb.andWhere('po.gateway = :gateway', { gateway: q.gateway });
    if (q.reconciliationStatus && q.reconciliationStatus !== 'all') qb.andWhere('po.reconciliation_status = :rs', { rs: q.reconciliationStatus });
    if (q.refundStatus && q.refundStatus !== 'all') qb.andWhere('po.refund_status = :rf', { rf: q.refundStatus });
    if (q.status && q.status !== 'all') {
      const map: Record<string, string> = { Pending: 'created', Success: 'paid', Failed: 'failed', Refunded: 'refunded' };
      qb.andWhere('po.status = :st', { st: map[q.status] || q.status });
    }
    if (q.search) {
      qb.andWhere(
        '(application.application_no ILIKE :s OR application.name ILIKE :s OR po.transaction_id ILIKE :s OR po.gateway_order_id ILIKE :s OR po.razorpay_payment_id ILIKE :s)',
        { s: `%${q.search}%` },
      );
    }
    qb.orderBy('po.created_at', 'DESC');
    const all = await qb.getMany();
    const rows = all.map((po) => this.adminRow(po));

    const sum = (arr: typeof rows, f: (r: (typeof rows)[number]) => number) => arr.reduce((s, r) => s + f(r), 0);
    const success = rows.filter((r) => r.paymentStatus === 'Success' || r.paymentStatus === 'Refunded');
    const byGateway = Object.keys(GATEWAY_LABELS).map((g) => {
      const list = rows.filter((r) => r.gateway === g);
      return {
        gateway: g,
        label: GATEWAY_LABELS[g],
        count: list.length,
        collected: sum(list.filter((r) => r.paymentStatus === 'Success' || r.paymentStatus === 'Refunded'), (r) => (r.currency === 'INR' ? r.amount : 0)),
        matched: list.filter((r) => r.reconciliationStatus === 'Matched').length,
        unmatched: list.filter((r) => r.reconciliationStatus !== 'Matched').length,
      };
    });
    const summary = {
      total: rows.length,
      matched: rows.filter((r) => r.reconciliationStatus === 'Matched').length,
      unmatched: rows.filter((r) => r.reconciliationStatus !== 'Matched').length,
      successCount: success.length,
      collectedInr: sum(success.filter((r) => r.currency === 'INR'), (r) => r.amount),
      collectedOther: sum(success.filter((r) => r.currency !== 'INR'), (r) => r.amount),
      refundedInr: sum(rows.filter((r) => r.currency === 'INR'), (r) => r.refundAmount),
      refundsInProgress: rows.filter((r) => r.refundStatus === 'In Progress').length,
      mismatchedAmount: rows.filter((r) => r.gatewayAmount != null && Math.abs(r.gatewayAmount - r.amount) > 0.01).length,
      byGateway,
    };

    const page = Math.max(1, parseInt(q.page, 10) || 1);
    const limit = Math.min(500, Math.max(1, parseInt(q.limit, 10) || 20));
    // Rows go under items (not data) so the response wrapper keeps summary intact.
    return {
      items: rows.slice((page - 1) * limit, page * limit),
      total: rows.length,
      totalPages: Math.ceil(rows.length / limit),
      page,
      limit,
      summary,
    };
  }

  /** Fetches each order's status from its gateway and marks Matched / Unmatched. */
  async runReconciliation(orgId: string | undefined, dto: RunReconciliationDto, userId: string) {
    const qb = this.orgOrdersQuery(orgId).andWhere('(po.gateway_order_id IS NOT NULL OR po.razorpay_order_id IS NOT NULL)');
    const { from, to } = this.range(dto.dateFrom, dto.dateTo);
    if (from) qb.andWhere('po.created_at >= :from', { from });
    if (to) qb.andWhere('po.created_at <= :to', { to });
    if (dto.gateway) qb.andWhere('po.gateway = :gateway', { gateway: dto.gateway });
    const orders = await qb.orderBy('po.createdAt', 'DESC').take(500).getMany();

    let matched = 0;
    let unmatched = 0;
    let recovered = 0;
    let errors = 0;
    const configs = new Map<string, ResolvedGateway>();
    for (const order of orders) {
      try {
        const key = `${order.organizationId}|${order.gateway}`;
        if (!configs.has(key)) configs.set(key, await this.configFor(order));
        const g = configs.get(key)!;
        const st = await this.fetchGatewayStatus(order, g);
        const wasPaid = order.status === PaymentOrderStatus.PAID || order.status === PaymentOrderStatus.REFUNDED;
        if (st.status === 'success' && !wasPaid) {
          await this.applyStatus(order, st);
          recovered++;
        } else {
          order.gatewayStatus = st.status;
          order.gatewayAmount = st.amount ?? order.gatewayAmount;
          order.gatewayCheckedAt = new Date();
        }
        const ours = order.status === PaymentOrderStatus.PAID || order.status === PaymentOrderStatus.REFUNDED ? 'success' : order.status === PaymentOrderStatus.FAILED ? 'failed' : 'pending';
        const amountOk = st.amount == null || Math.abs(Number(st.amount) - Number(order.amount)) <= 0.01;
        const txnOk = !st.transactionId || !order.transactionId || st.transactionId === order.transactionId || st.status !== 'success';
        const isMatch = st.status === ours && amountOk && txnOk;
        order.reconciliationStatus = isMatch ? 'Matched' : 'Unmatched';
        order.reconciliationNotes = isMatch
          ? null
          : [
              st.status !== ours ? `Gateway status "${st.status}" vs record "${ours}"` : null,
              !amountOk ? `Gateway amount ${st.amount} vs record ${order.amount}` : null,
              !txnOk ? `Gateway transaction ${st.transactionId} vs record ${order.transactionId}` : null,
            ]
              .filter(Boolean)
              .join('; ');
        order.reconciledBy = userId;
        order.reconciledAt = new Date();
        await this.paymentOrderRepo.save(order);
        if (isMatch) matched++;
        else unmatched++;
      } catch (e) {
        errors++;
        order.reconciliationNotes = `Gateway check failed: ${(e as Error).message}`.slice(0, 500);
        order.gatewayCheckedAt = new Date();
        await this.paymentOrderRepo.save(order);
      }
    }
    return { checked: orders.length, matched, unmatched, recovered, errors };
  }

  async updateReconciliation(orgId: string | undefined, id: string, dto: UpdateReconciliationDto, userId: string) {
    const order = await this.orderForOrg(orgId, id);
    if (dto.reconciliationStatus) {
      order.reconciliationStatus = dto.reconciliationStatus;
      order.reconciledBy = userId;
      order.reconciledAt = new Date();
    }
    if (dto.financeRemarks !== undefined) order.financeRemarks = dto.financeRemarks || null;
    await this.paymentOrderRepo.save(order);
    return this.adminView(order.id);
  }

  /** Daily / weekly reconciliation report as CSV or Excel. */
  async exportReport(orgId: string | undefined, q: { period?: string; date?: string; dateFrom?: string; dateTo?: string; format?: string; gateway?: string }) {
    let from: Date;
    let to: Date;
    if (q.dateFrom || q.dateTo) {
      const r = this.range(q.dateFrom, q.dateTo);
      from = r.from || new Date(0);
      to = r.to || new Date();
    } else {
      const base = q.date ? new Date(q.date) : new Date();
      to = new Date(base);
      to.setHours(23, 59, 59, 999);
      from = new Date(base);
      from.setHours(0, 0, 0, 0);
      if (q.period === 'weekly') from.setDate(from.getDate() - 6);
    }
    const qb = this.orgOrdersQuery(orgId).andWhere('po.created_at BETWEEN :from AND :to', { from, to });
    if (q.gateway && q.gateway !== 'all') qb.andWhere('po.gateway = :gateway', { gateway: q.gateway });
    const rows = (await qb.orderBy('po.created_at', 'ASC').getMany()).map((po) => this.adminRow(po));

    const header = [
      'Payment_ID', 'Application_ID', 'Applicant', 'Payment_Status', 'Payment_Amount', 'Currency', 'Payment_Gateway',
      'Gateway_Order_ID', 'Transaction_ID', 'Payment_Method', 'Payment_Date', 'Reconciliation_Status', 'Gateway_Status',
      'Gateway_Amount', 'Refund_Status', 'Refund_Amount', 'Finance_Remarks', 'Reconciliation_Notes', 'Created_At',
    ];
    const data = rows.map((r) => [
      r.paymentId, r.applicationNo, r.applicantName, r.paymentStatus, r.amount.toFixed(2), r.currency, r.gatewayLabel,
      r.gatewayOrderId || '', r.transactionId || '', r.method || '', r.paidAt ? new Date(r.paidAt).toISOString() : '',
      r.reconciliationStatus, r.gatewayStatus || '', r.gatewayAmount != null ? r.gatewayAmount.toFixed(2) : '', r.refundStatus,
      r.refundAmount.toFixed(2), r.financeRemarks || '', r.reconciliationNotes || '', new Date(r.createdAt).toISOString(),
    ]);
    const stamp = `${from.toISOString().slice(0, 10)}_to_${to.toISOString().slice(0, 10)}`;

    if (q.format === 'xlsx' || q.format === 'excel' || q.format === 'xls') {
      const esc = (v: any) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const cell = (v: any, i: number) => {
        const numeric = [4, 13, 15].includes(i) && v !== '';
        return `<Cell><Data ss:Type="${numeric ? 'Number' : 'String'}">${esc(v)}</Data></Cell>`;
      };
      const xml =
        `<?xml version="1.0" encoding="UTF-8"?>\n<?mso-application progid="Excel.Sheet"?>\n` +
        `<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">` +
        `<Styles><Style ss:ID="h"><Font ss:Bold="1"/></Style></Styles>` +
        `<Worksheet ss:Name="Reconciliation"><Table>` +
        `<Row>${header.map((h) => `<Cell ss:StyleID="h"><Data ss:Type="String">${esc(h)}</Data></Cell>`).join('')}</Row>` +
        data.map((r) => `<Row>${r.map(cell).join('')}</Row>`).join('') +
        `</Table></Worksheet></Workbook>`;
      return { filename: `payment-reconciliation_${stamp}.xls`, contentType: 'application/vnd.ms-excel', content: xml };
    }
    const csvCell = (v: any) => {
      const s = String(v ?? '');
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [header, ...data].map((r) => r.map(csvCell).join(',')).join('\n');
    return { filename: `payment-reconciliation_${stamp}.csv`, contentType: 'text/csv; charset=utf-8', content: '﻿' + csv };
  }

  // ===========================================================================
  // LIST / STATS (payments page)
  // ===========================================================================

  async findAll(
    orgId: string,
    paginationDto: PaginationDto,
    search?: string,
    status?: string,
    purpose?: string,
    dateFrom?: string,
    dateTo?: string,
    gateway?: string,
    reconciliationStatus?: string,
  ) {
    const orgOrders = await this.orgOrdersQuery(orgId).orderBy('po.created_at', 'DESC').getMany();
    const mapped = orgOrders.map((po) => this.adminRow(po));

    // Applications that never started an online payment (e.g. offline / legacy rows).
    const existingAppIds = new Set(orgOrders.map((po) => po.applicationId).filter(Boolean));
    const allApps = await this.applicationRepo.find({
      where: orgId ? { organizationId: orgId } : {},
      relations: ['student', 'preference1Branch'],
      order: { createdAt: 'DESC' },
    });
    const org = orgId ? await this.organizationRepo.findOne({ where: { id: orgId } }) : null;
    const defaultFee = this.applicationFee(org);
    const orphan = allApps
      .filter((app) => !existingAppIds.has(app.id))
      .map((app) => {
        const ps = toPaymentStatus(app.paymentStatus);
        return {
          id: `app_pay_${app.id}`,
          paymentNo: 0,
          paymentId: '—',
          applicationId: app.id,
          applicationNo: app.applicationNo || '—',
          applicantName: app.name || app.student?.name || '—',
          applicantEmail: app.email || app.student?.email || '—',
          applicantPhone: app.primaryMobile || app.student?.phone || '—',
          program: app.program || '—',
          campus: app.confirmedCampus || app.preference1Branch?.name || '—',
          amount: Number(app.paymentAmount || defaultFee),
          currency: 'INR',
          status: ps === 'Success' ? 'paid' : ps.toLowerCase(),
          paymentStatus: ps,
          purpose: 'application_fee',
          gateway: 'offline',
          gatewayLabel: app.paymentMode || 'Not started',
          gatewayOrderId: null,
          transactionId: app.paymentReference || null,
          method: app.paymentMode || null,
          isInternational: false,
          reconciliationStatus: 'Unmatched',
          reconciliationNotes: null,
          reconciledAt: null,
          gatewayStatus: null,
          gatewayAmount: null,
          gatewayCheckedAt: null,
          refundStatus: 'Not Initiated',
          refundAmount: 0,
          financeRemarks: null,
          failureReason: null,
          razorpayOrderId: '—',
          razorpayPaymentId: app.paymentReference || '—',
          createdAt: app.createdAt,
          paidAt: ps === 'Success' ? app.paymentDate || app.createdAt : null,
        };
      });

    let combined: any[] = [...mapped, ...orphan];
    if (search && search.trim()) {
      const s = search.trim().toLowerCase();
      combined = combined.filter((p) =>
        [p.applicantName, p.applicantEmail, p.applicantPhone, p.applicationNo, p.gatewayOrderId, p.transactionId, p.paymentId]
          .some((v) => String(v || '').toLowerCase().includes(s)),
      );
    }
    if (status && status !== 'all') {
      const s = status.toLowerCase();
      combined = combined.filter((p) =>
        s === 'pending' || s === 'created' ? p.status === 'pending' : s === 'success' || s === 'paid' ? p.status === 'paid' : p.status === s,
      );
    }
    if (purpose && purpose !== 'all') combined = combined.filter((p) => p.purpose === purpose);
    if (gateway && gateway !== 'all') combined = combined.filter((p) => p.gateway === gateway);
    if (reconciliationStatus && reconciliationStatus !== 'all') combined = combined.filter((p) => p.reconciliationStatus === reconciliationStatus);
    const { from, to } = this.range(dateFrom, dateTo);
    if (from) combined = combined.filter((p) => new Date(p.createdAt) >= from);
    if (to) combined = combined.filter((p) => new Date(p.createdAt) <= to);
    combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = combined.length;
    const page = paginationDto.page || 1;
    const limit = paginationDto.limit || 10;
    return { data: combined.slice((page - 1) * limit, page * limit), total, totalPages: Math.ceil(total / limit), page, limit };
  }

  async getStats(orgId: string) {
    const orders = await this.orgOrdersQuery(orgId).getMany();
    const existingAppIds = new Set(orders.map((po) => po.applicationId).filter(Boolean));
    const apps = await this.applicationRepo.find({ where: orgId ? { organizationId: orgId } : {} });
    const orphan = apps.filter((a) => !existingAppIds.has(a.id));
    const paid = orders.filter((o) => o.status === PaymentOrderStatus.PAID || o.status === PaymentOrderStatus.REFUNDED);
    const orphanPaid = orphan.filter((a) => toPaymentStatus(a.paymentStatus) === 'Success');
    const totalCollected =
      paid.filter((o) => (o.currency || 'INR') === 'INR').reduce((s, o) => s + Number(o.amount) - Number(o.refundAmount || 0), 0) +
      orphanPaid.reduce((s, a) => s + Number(a.paymentAmount || 0), 0);
    const successfulOrders = paid.length + orphanPaid.length;
    return {
      totalCollected,
      totalOrders: orders.length + orphan.length,
      successfulOrders,
      pendingCount:
        orders.filter((o) => o.status === PaymentOrderStatus.CREATED).length +
        orphan.filter((a) => toPaymentStatus(a.paymentStatus) === 'Pending').length,
      failedCount:
        orders.filter((o) => o.status === PaymentOrderStatus.FAILED).length +
        orphan.filter((a) => toPaymentStatus(a.paymentStatus) === 'Failed').length,
      refundedCount: orders.filter((o) => o.status === PaymentOrderStatus.REFUNDED || Number(o.refundAmount) > 0).length,
      refundedAmount: orders.reduce((s, o) => s + Number(o.refundAmount || 0), 0),
      unmatchedCount: orders.filter((o) => o.reconciliationStatus !== 'Matched' && o.status !== PaymentOrderStatus.CREATED).length,
      avgPayment: successfulOrders > 0 ? Math.round(totalCollected / successfulOrders) : 0,
    };
  }

  /** Student's own payment history for an application. */
  async forApplication(applicationIdOrNo: string, user?: RequestUser) {
    const app = await this.findApplication(applicationIdOrNo);
    this.assertOwner(app, user);
    const rows = await this.paymentOrderRepo.find({ where: { applicationId: app.id }, order: { createdAt: 'DESC' } });
    return rows.map((r) => ({ ...this.publicView(r), refundStatus: r.refundStatus, refundAmount: Number(r.refundAmount || 0) }));
  }

  /** Marks stale "created" orders as failed after 24h so reports stay accurate. */
  @Cron(CronExpression.EVERY_6_HOURS)
  async expireStaleOrders() {
    const cutoff = new Date(Date.now() - 24 * 3600 * 1000);
    const stale = await this.paymentOrderRepo.find({
      where: { status: PaymentOrderStatus.CREATED, createdAt: Between(new Date(0), cutoff), gatewayOrderId: Not(IsNull()) },
      take: 200,
    });
    for (const order of stale) {
      try {
        const st = await this.fetchGatewayStatus(order, await this.configFor(order));
        if (st.status === 'success') await this.applyStatus(order, st);
        else await this.markFailed(order, st.failureReason || 'Checkout abandoned (expired after 24 hours)');
      } catch (e) {
        await this.markFailed(order, 'Checkout abandoned (expired after 24 hours)').catch((err: Error) =>
          this.logger.warn(`Could not expire payment ${order.id}: ${err.message}`),
        );
      }
    }
  }
}
