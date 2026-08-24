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
  ) {
    this.razorpay = new Razorpay({
      key_id: this.configService.get<string>('RAZORPAY_KEY_ID') || '',
      key_secret: this.configService.get<string>('RAZORPAY_KEY_SECRET') || '',
    });
  }

  async createOrder(dto: CreateOrderDto) {
    const application = await this.applicationRepo.findOne({
      where: { id: dto.applicationId },
    });
    if (!application) {
      throw new NotFoundException(
        `Application with ID "${dto.applicationId}" not found`,
      );
    }

    const organization = await this.organizationRepo.findOne({
      where: { id: application.organizationId },
    });
    const applicationFee =
      organization?.settings?.applicationFee ?? DEFAULT_APPLICATION_FEE;

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
}
