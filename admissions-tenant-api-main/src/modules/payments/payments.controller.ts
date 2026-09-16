import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PaymentsService } from './payments.service.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { CreateSeatBookingOrderDto } from './dto/create-seat-booking-order.dto.js';
import { VerifyPaymentDto } from './dto/verify-payment.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { TenantGuard } from '../../common/guards/tenant.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Role } from '../../common/enums/roles.enum.js';
import { ResponseMessage } from '../../common/decorators/response-message.decorator.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  @UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER, Role.COUNSELOR)
  @ResponseMessage('Payments fetched successfully')
  findAll(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('purpose') purpose?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const orgId = req.user.organizationId;
    const paginationDto = new PaginationDto();
    paginationDto.page = page ? Math.max(1, parseInt(page, 10) || 1) : 1;
    paginationDto.limit = limit ? Math.min(1000, Math.max(1, parseInt(limit, 10) || 10)) : 10;
    return this.paymentsService.findAll(orgId, paginationDto, search, status, purpose, dateFrom, dateTo);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER, Role.COUNSELOR)
  @ResponseMessage('Payment statistics fetched successfully')
  getStats(@Req() req: any) {
    const orgId = req.user.organizationId;
    return this.paymentsService.getStats(orgId);
  }

  @Post('razorpay/order')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Payment order created successfully')
  createOrder(@Body() dto: CreateOrderDto) {
    return this.paymentsService.createOrder(dto);
  }

  // Phase 6b — creates a Razorpay order for the seat-booking fee. Same auth
  // pattern as 'order' above; verify/webhook below already work generically
  // since they look up PaymentOrder by razorpayOrderId regardless of purpose.
  @Post('razorpay/seat-booking-order')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Seat booking payment order created successfully')
  createSeatBookingOrder(@Body() dto: CreateSeatBookingOrderDto) {
    return this.paymentsService.createSeatBookingOrder(dto);
  }

  @Post('razorpay/verify')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Payment verified successfully')
  verify(@Body() dto: VerifyPaymentDto) {
    return this.paymentsService.verifyPayment(dto);
  }

  @Post('razorpay/fail')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Payment failure recorded')
  recordFailure(@Body() body: { orderId: string; reason?: string }) {
    return this.paymentsService.recordFailure(body.orderId, body.reason);
  }

  // Public route — Razorpay calls this directly, no JWT available.
  // Authenticity is established via the x-razorpay-signature HMAC check below.
  @Post('razorpay/webhook')
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
