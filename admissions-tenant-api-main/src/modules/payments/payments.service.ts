import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import Razorpay from 'razorpay';
import { PaymentOrder, PaymentOrderStatus, PaymentOrderPurpose } from './entities/payment-order.entity.js';
import { Application } from '../applications/entities/application.entity.js';
import { Organization } from '../organizations/entities/organization.entity.js';
import { OfferAcceptance } from '../admissions-decisions/entities/offer-acceptance.entity.js';
import { OfferLetter } from '../admissions-decisions/entities/offer-letter.entity.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { CreateSeatBookingOrderDto } from './dto/create-seat-booking-order.dto.js';
import { VerifyPaymentDto } from './dto/verify-payment.dto.js';
import { EmailTemplatesService } from '../email-templates/email-templates.service.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';

const DEFAULT_APPLICATION_FEE = 2000;
// Phase 6b — default seat-booking fee, same fallback pattern as
// DEFAULT_APPLICATION_FEE (mirrors OrganizationsService's own default).
const DEFAULT_SEAT_BOOKING_FEE = 5000;

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly razorpay: Razorpay;

  constructor(
    @InjectRepository(PaymentOrder)
    private readonly paymentOrderRepo: Repository<PaymentOrder>,
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
  ) {
    this.razorpay = new Razorpay({
      key_id: this.configService.get<string>('RAZORPAY_KEY_ID') || '',
      key_secret: this.configService.get<string>('RAZORPAY_KEY_SECRET') || '',
    });
  }

  async createOrder(dto: CreateOrderDto) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(dto.applicationId);
    let application = isUuid
      ? await this.applicationRepo.findOne({ where: { id: dto.applicationId } })
      : await this.applicationRepo.findOne({ where: { applicationNo: dto.applicationId } });

    if (!application) {
      throw new NotFoundException(
        `Application with ID "${dto.applicationId}" not found`,
      );
    }

    let organization = application.organizationId
      ? await this.organizationRepo.findOne({ where: { id: application.organizationId } })
      : null;
    if (!organization) {
      organization = await this.organizationRepo.findOne({ order: { createdAt: 'ASC' } });
    }

    let applicationFee = Number(
      organization?.settings?.applicationFee ?? DEFAULT_APPLICATION_FEE,
    );

    const s = organization?.settings;
    if (s?.discountEnabled) {
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const isStarted = !s.discountStartDate || todayStr >= s.discountStartDate;
      const isNotExpired = !s.discountEndDate || todayStr <= s.discountEndDate;

      if (isStarted && isNotExpired && s.discountValue) {
        if (s.discountType === 'percentage') {
          const pct = Math.min(100, Math.max(0, Number(s.discountValue)));
          const discountAmt = (applicationFee * pct) / 100;
          applicationFee = Math.max(0, applicationFee - discountAmt);
        } else {
          applicationFee = Math.max(0, applicationFee - Number(s.discountValue));
        }
      }
    }

    const amountInPaise = Math.round(applicationFee * 100);

    const razorpayOrder = await this.razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: `app_${application.applicationNo}`,
      notes: { applicationId: application.id },
    });

    const paymentOrder = this.paymentOrderRepo.create({
      applicationId: application.id,
      razorpayOrderId: razorpayOrder.id,
      amount: applicationFee,
      currency: 'INR',
      status: PaymentOrderStatus.CREATED,
      purpose: PaymentOrderPurpose.APPLICATION_FEE,
    });
    await this.paymentOrderRepo.save(paymentOrder);

    return {
      orderId: razorpayOrder.id,
      amount: amountInPaise,
      currency: 'INR',
      keyId: this.configService.get<string>('RAZORPAY_KEY_ID'),
    };
  }

  // Phase 6b — creates a Razorpay order for the seat-booking fee (a second,
  // later payment in the funnel, distinct from the application fee). Amount
  // comes from OfferAcceptance.seatBookingFee (set when the acceptance
  // record was auto-created — see AcceptanceService.createAcceptanceRecord),
  // NOT from the org's applicationFee setting. Reuses the same Razorpay
  // client instance configured in the constructor.
  async createSeatBookingOrder(dto: CreateSeatBookingOrderDto) {
    const offerAcceptance = await this.offerAcceptanceRepo.findOne({
      where: { id: dto.offerAcceptanceId },
    });
    if (!offerAcceptance) {
      throw new NotFoundException(
        `Offer acceptance with ID "${dto.offerAcceptanceId}" not found`,
      );
    }

    const offerLetter = await this.offerLetterRepo.findOne({
      where: { id: offerAcceptance.offerLetterId },
    });
    if (!offerLetter) {
      throw new NotFoundException(
        `Offer letter for acceptance "${dto.offerAcceptanceId}" not found`,
      );
    }

    const application = await this.applicationRepo.findOne({
      where: { id: offerLetter.applicationId },
    });
    if (!application) {
      throw new NotFoundException(
        `Application for offer letter "${offerLetter.id}" not found`,
      );
    }

    const seatBookingFee = offerAcceptance.seatBookingFee ?? DEFAULT_SEAT_BOOKING_FEE;
    const amountInPaise = Math.round(seatBookingFee * 100);

    const razorpayOrder = await this.razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: `seat_${application.applicationNo}`,
      notes: { applicationId: application.id, offerAcceptanceId: offerAcceptance.id },
    });

    const paymentOrder = this.paymentOrderRepo.create({
      applicationId: application.id,
      razorpayOrderId: razorpayOrder.id,
      amount: seatBookingFee,
      currency: 'INR',
      status: PaymentOrderStatus.CREATED,
      purpose: PaymentOrderPurpose.SEAT_BOOKING_FEE,
      offerAcceptanceId: offerAcceptance.id,
    });
    await this.paymentOrderRepo.save(paymentOrder);

    return {
      orderId: razorpayOrder.id,
      amount: amountInPaise,
      currency: 'INR',
      keyId: this.configService.get<string>('RAZORPAY_KEY_ID'),
    };
  }

  private verifySignature(
    orderId: string,
    paymentId: string,
    signature: string,
  ): boolean {
    const secret = this.configService.get<string>('RAZORPAY_KEY_SECRET') || '';
    const expected = crypto
      .createHmac('sha256', secret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');
    return expected === signature;
  }

  async verifyPayment(dto: VerifyPaymentDto) {
    const isValid = this.verifySignature(
      dto.razorpay_order_id,
      dto.razorpay_payment_id,
      dto.razorpay_signature,
    );

    if (!isValid) {
      throw new BadRequestException('Invalid payment signature');
    }

    const paymentOrder = await this.paymentOrderRepo.findOne({
      where: { razorpayOrderId: dto.razorpay_order_id },
    });
    if (!paymentOrder) {
      throw new NotFoundException('Payment order not found');
    }

    await this.markPaid(
      paymentOrder,
      dto.razorpay_payment_id,
      dto.razorpay_signature,
    );

    return { success: true };
  }

  private async markPaid(
    paymentOrder: PaymentOrder,
    paymentId: string,
    signature: string | null,
  ) {
    if (paymentOrder.status === PaymentOrderStatus.PAID) {
      return; // idempotent — already processed
    }

    paymentOrder.status = PaymentOrderStatus.PAID;
    paymentOrder.razorpayPaymentId = paymentId;
    if (signature) paymentOrder.razorpaySignature = signature;
    paymentOrder.paidAt = new Date();
    await this.paymentOrderRepo.save(paymentOrder);

    // Phase 6b — branch on purpose. Unset/'application_fee' rows (including
    // every pre-existing row from before this column existed, thanks to the
    // column default) keep EXACTLY the original behavior below. Only
    // 'seat_booking_fee' rows take the new branch, which updates the linked
    // OfferAcceptance instead of Application.
    if (paymentOrder.purpose === PaymentOrderPurpose.SEAT_BOOKING_FEE) {
      if (paymentOrder.offerAcceptanceId) {
        const offerAcceptance = await this.offerAcceptanceRepo.findOne({
          where: { id: paymentOrder.offerAcceptanceId },
        });
        if (offerAcceptance) {
          offerAcceptance.feePaymentStatus = 'paid';
          offerAcceptance.paymentReferenceId = paymentId;
          await this.offerAcceptanceRepo.save(offerAcceptance);
        }
      }
      return;
    }

    const application = await this.applicationRepo.findOne({
      where: { id: paymentOrder.applicationId },
    });
    if (application) {
      application.paymentStatus = 'success';
      application.paymentAmount = paymentOrder.amount;
      application.paymentDate = new Date();
      application.paymentReference = paymentId;
      await this.applicationRepo.save(application);

      await this.emailTemplatesService.sendTransactional({
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
          amount: String(paymentOrder.amount),
          currency: paymentOrder.currency,
          payment_method: paymentOrder.method,
          transaction_id: paymentId,
          paid_at: paymentOrder.paidAt?.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          }),
        },
      });
    }
  }

  private async markFailed(paymentOrder: PaymentOrder) {
    if (
      paymentOrder.status === PaymentOrderStatus.PAID ||
      paymentOrder.status === PaymentOrderStatus.FAILED
    ) {
      return; // idempotent — don't downgrade a paid order or double-process
    }
    paymentOrder.status = PaymentOrderStatus.FAILED;
    await this.paymentOrderRepo.save(paymentOrder);
  }

  verifyWebhookSignature(rawBody: Buffer, signature: string): boolean {
    const secret =
      this.configService.get<string>('RAZORPAY_WEBHOOK_SECRET') || '';
    const expected = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');
    return expected === signature;
  }

  async handleWebhookEvent(payload: any): Promise<void> {
    const event = payload?.event;
    const paymentEntity = payload?.payload?.payment?.entity;
    if (!paymentEntity) {
      return;
    }

    const orderId = paymentEntity.order_id;
    const paymentId = paymentEntity.id;

    const paymentOrder = await this.paymentOrderRepo.findOne({
      where: { razorpayOrderId: orderId },
    });
    if (!paymentOrder) {
      this.logger.warn(`Webhook received for unknown order ${orderId}`);
      return;
    }

    if (event === 'payment.captured') {
      await this.markPaid(paymentOrder, paymentId, null);
    } else if (event === 'payment.failed') {
      await this.markFailed(paymentOrder);
    }
  }

  async recordFailure(orderId: string, _reason?: string) {
    const paymentOrder = await this.paymentOrderRepo.findOne({
      where: { razorpayOrderId: orderId },
      relations: ['application'],
    });
    if (!paymentOrder) return { success: false };

    await this.markFailed(paymentOrder);

    if (paymentOrder.applicationId) {
      await this.applicationRepo.update(
        { id: paymentOrder.applicationId },
        { paymentStatus: 'failed' },
      );
    }
    return { success: true };
  }

  async findAll(
    orgId: string,
    paginationDto: PaginationDto,
    search?: string,
    status?: string,
    purpose?: string,
    dateFrom?: string,
    dateTo?: string,
  ) {
    // 1. Fetch payment orders
    const paymentOrders = await this.paymentOrderRepo.find({
      relations: ['application', 'application.student', 'application.preference1Branch'],
      order: { createdAt: 'DESC' },
    });

    const orgPaymentOrders = orgId
      ? paymentOrders.filter(
          (po) => !po.application || !po.application.organizationId || po.application.organizationId === orgId,
        )
      : paymentOrders;

    const mappedPaymentOrders = orgPaymentOrders.map((po) => {
      const pStatus = (po.status || '').toLowerCase();
      const normalizedStatus =
        pStatus === 'paid' || pStatus === 'success'
          ? 'paid'
          : pStatus === 'failed'
          ? 'failed'
          : pStatus === 'refunded'
          ? 'refunded'
          : 'pending';

      return {
        id: po.id,
        applicationId: po.applicationId,
        applicationNo: po.application?.applicationNo || '—',
        applicantName: po.application?.name || po.application?.student?.name || '—',
        applicantEmail: po.application?.email || po.application?.student?.email || '—',
        applicantPhone: po.application?.primaryMobile || po.application?.student?.phone || '—',
        program: po.application?.program || '—',
        campus: po.application?.confirmedCampus || po.application?.preference1Branch?.name || '—',
        amount: Number(po.amount),
        currency: po.currency || 'INR',
        status: normalizedStatus,
        purpose: po.purpose || 'application_fee',
        method: po.method || 'Razorpay Gateway',
        razorpayOrderId: po.razorpayOrderId,
        razorpayPaymentId: po.razorpayPaymentId || '—',
        razorpaySignature: po.razorpaySignature,
        createdAt: po.createdAt,
        paidAt: po.paidAt,
      };
    });

    // 2. Fetch applications without payment orders
    const existingAppIds = new Set(orgPaymentOrders.map((po) => po.applicationId).filter(Boolean));
    const allApps = await this.applicationRepo.find({
      where: orgId ? { organizationId: orgId } : {},
      relations: ['student', 'preference1Branch'],
      order: { createdAt: 'DESC' },
    });

    const org = orgId ? await this.organizationRepo.findOne({ where: { id: orgId } }) : null;
    let defaultFee = Number(org?.settings?.applicationFee ?? DEFAULT_APPLICATION_FEE);
    if (org?.settings?.discountEnabled) {
      const s = org.settings;
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const isStarted = !s.discountStartDate || todayStr >= s.discountStartDate;
      const isNotExpired = !s.discountEndDate || todayStr <= s.discountEndDate;

      if (isStarted && isNotExpired && s.discountValue) {
        if (s.discountType === 'percentage') {
          const pct = Math.min(100, Math.max(0, Number(s.discountValue)));
          defaultFee = Math.max(0, defaultFee - (defaultFee * pct) / 100);
        } else {
          defaultFee = Math.max(0, defaultFee - Number(s.discountValue));
        }
      }
    }

    const orphanApps = allApps.filter((app) => !existingAppIds.has(app.id));
    const mappedOrphanApps = orphanApps.map((app) => {
      const pStatus = (app.paymentStatus || 'pending').toLowerCase();
      const normalizedStatus =
        pStatus === 'paid' || pStatus === 'success'
          ? 'paid'
          : pStatus === 'failed'
          ? 'failed'
          : pStatus === 'refunded'
          ? 'refunded'
          : 'pending';

      return {
        id: `app_pay_${app.id}`,
        applicationId: app.id,
        applicationNo: app.applicationNo || '—',
        applicantName: app.name || app.student?.name || '—',
        applicantEmail: app.email || app.student?.email || '—',
        applicantPhone: app.primaryMobile || app.student?.phone || '—',
        program: app.program || '—',
        campus: app.confirmedCampus || app.preference1Branch?.name || '—',
        amount: Number(app.paymentAmount || defaultFee),
        currency: 'INR',
        status: normalizedStatus,
        purpose: 'application_fee',
        method: app.paymentMode || 'Razorpay Gateway',
        razorpayOrderId: app.paymentReference || '—',
        razorpayPaymentId: app.paymentReference || '—',
        razorpaySignature: null,
        createdAt: app.createdAt,
        paidAt: normalizedStatus === 'paid' ? app.createdAt : null,
      };
    });

    let combined = [...mappedPaymentOrders, ...mappedOrphanApps];

    // Apply search filter
    if (search && search.trim() !== '') {
      const s = search.trim().toLowerCase();
      combined = combined.filter(
        (p) =>
          p.applicantName.toLowerCase().includes(s) ||
          p.applicantEmail.toLowerCase().includes(s) ||
          p.applicantPhone.toLowerCase().includes(s) ||
          p.applicationNo.toLowerCase().includes(s) ||
          p.razorpayOrderId.toLowerCase().includes(s) ||
          p.razorpayPaymentId.toLowerCase().includes(s),
      );
    }

    // Apply status filter
    if (status && status !== 'all') {
      const s = status.toLowerCase();
      if (s === 'pending' || s === 'created') {
        combined = combined.filter((p) => p.status === 'pending' || p.status === 'created');
      } else {
        combined = combined.filter((p) => p.status.toLowerCase() === s);
      }
    }

    // Apply purpose filter
    if (purpose && purpose !== 'all') {
      combined = combined.filter((p) => p.purpose === purpose);
    }

    // Apply dateFrom filter
    if (dateFrom && dateFrom.trim() !== '') {
      const fromDate = new Date(dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      combined = combined.filter((p) => new Date(p.createdAt) >= fromDate);
    }

    // Apply dateTo filter
    if (dateTo && dateTo.trim() !== '') {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      combined = combined.filter((p) => new Date(p.createdAt) <= toDate);
    }

    // Sort by createdAt DESC
    combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = combined.length;
    const page = paginationDto.page || 1;
    const limit = paginationDto.limit || 10;
    const skip = (page - 1) * limit;
    const data = combined.slice(skip, skip + limit);

    return {
      data,
      total,
      totalPages: Math.ceil(total / limit),
      page,
      limit,
    };
  }

  async getStats(orgId: string) {
    const paymentOrders = await this.paymentOrderRepo.find({
      relations: ['application'],
    });
    const orgPaymentOrders = orgId
      ? paymentOrders.filter(
          (po) => !po.application || !po.application.organizationId || po.application.organizationId === orgId,
        )
      : paymentOrders;

    const existingAppIds = new Set(orgPaymentOrders.map((po) => po.applicationId).filter(Boolean));
    const allApps = await this.applicationRepo.find({
      where: orgId ? { organizationId: orgId } : {},
    });

    const org = orgId ? await this.organizationRepo.findOne({ where: { id: orgId } }) : null;
    let defaultFee = Number(org?.settings?.applicationFee ?? DEFAULT_APPLICATION_FEE);
    if (org?.settings?.discountEnabled) {
      const s = org.settings;
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const isStarted = !s.discountStartDate || todayStr >= s.discountStartDate;
      const isNotExpired = !s.discountEndDate || todayStr <= s.discountEndDate;

      if (isStarted && isNotExpired && s.discountValue) {
        if (s.discountType === 'percentage') {
          const pct = Math.min(100, Math.max(0, Number(s.discountValue)));
          defaultFee = Math.max(0, defaultFee - (defaultFee * pct) / 100);
        } else {
          defaultFee = Math.max(0, defaultFee - Number(s.discountValue));
        }
      }
    }

    const orphanApps = allApps.filter((app) => !existingAppIds.has(app.id));

    const totalOrders = orgPaymentOrders.length + orphanApps.length;

    const paidOrders = [
      ...orgPaymentOrders.filter(
        (o) => (o.status || '').toLowerCase() === 'paid' || (o.status || '').toLowerCase() === 'success',
      ),
      ...orphanApps.filter(
        (a) =>
          (a.paymentStatus || '').toLowerCase() === 'paid' ||
          (a.paymentStatus || '').toLowerCase() === 'success',
      ),
    ];

    const totalCollected = paidOrders.reduce((sum, o: any) => {
      const amt = o.amount !== undefined ? Number(o.amount) : Number(o.paymentAmount || defaultFee);
      return sum + (amt || 0);
    }, 0);

    const pendingCount =
      orgPaymentOrders.filter(
        (o) => (o.status || '').toLowerCase() === 'created' || (o.status || '').toLowerCase() === 'pending',
      ).length +
      orphanApps.filter(
        (a) =>
          (a.paymentStatus || '').toLowerCase() === 'pending' ||
          (a.paymentStatus || '').toLowerCase() === 'created' ||
          !a.paymentStatus,
      ).length;

    const failedCount =
      orgPaymentOrders.filter((o) => (o.status || '').toLowerCase() === 'failed').length +
      orphanApps.filter((a) => (a.paymentStatus || '').toLowerCase() === 'failed').length;

    const avgPayment =
      paidOrders.length > 0 ? Math.round(totalCollected / paidOrders.length) : 0;

    return {
      totalCollected,
      totalOrders,
      successfulOrders: paidOrders.length,
      pendingCount,
      failedCount,
      avgPayment,
    };
  }
}
