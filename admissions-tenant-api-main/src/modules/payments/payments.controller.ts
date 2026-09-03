import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PaymentsService } from './payments.service.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { CreateSeatBookingOrderDto } from './dto/create-seat-booking-order.dto.js';
import { VerifyPaymentDto } from './dto/verify-payment.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { ResponseMessage } from '../../common/decorators/response-message.decorator.js';

@Controller('payments/razorpay')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('order')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Payment order created successfully')
  createOrder(@Body() dto: CreateOrderDto) {
    return this.paymentsService.createOrder(dto);
  }

  // Phase 6b — creates a Razorpay order for the seat-booking fee. Same auth
  // pattern as 'order' above; verify/webhook below already work generically
  // since they look up PaymentOrder by razorpayOrderId regardless of purpose.
  @Post('seat-booking-order')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Seat booking payment order created successfully')
  createSeatBookingOrder(@Body() dto: CreateSeatBookingOrderDto) {
    return this.paymentsService.createSeatBookingOrder(dto);
  }

  @Post('verify')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Payment verified successfully')
  verify(@Body() dto: VerifyPaymentDto) {
    return this.paymentsService.verifyPayment(dto);
  }

  // Public route — Razorpay calls this directly, no JWT available.
  // Authenticity is established via the x-razorpay-signature HMAC check below.
  @Post('webhook')
  @HttpCode(200)
  async webhook(
    @Req() req: any,
    @Headers('x-razorpay-signature') signature: string,
  ) {
    const rawBody: Buffer | undefined = req.rawBody;
    if (!rawBody || !signature) {
      throw new BadRequestException('Missing signature or raw body');
    }

    const isValid = this.paymentsService.verifyWebhookSignature(
      rawBody,
      signature,
    );
    if (!isValid) {
      throw new BadRequestException('Invalid webhook signature');
    }

    await this.paymentsService.handleWebhookEvent(req.body);
    return { received: true };
  }
}
