import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { PaymentsService } from './payments.service.js';
import { PaymentGatewaysService } from './payment-gateways.service.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { CreateSeatBookingOrderDto } from './dto/create-seat-booking-order.dto.js';
import { VerifyPaymentDto } from './dto/verify-payment.dto.js';
import {
  CheckoutDto,
  RefundDto,
  RunReconciliationDto,
  UpdateGatewaySettingDto,
  UpdateReconciliationDto,
} from './dto/payment-admin.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { TenantGuard } from '../../common/guards/tenant.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Role } from '../../common/enums/roles.enum.js';
import { ResponseMessage } from '../../common/decorators/response-message.decorator.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';

const FINANCE_ROLES = [Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER];

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
    @Query('gateway') gateway?: string,
    @Query('reconciliationStatus') reconciliationStatus?: string,
  ) {
    const orgId = req.user.organizationId;
    const paginationDto = new PaginationDto();
    paginationDto.page = page ? Math.max(1, parseInt(page, 10) || 1) : 1;
    paginationDto.limit = limit ? Math.min(1000, Math.max(1, parseInt(limit, 10) || 10)) : 10;
    return this.paymentsService.findAll(orgId, paginationDto, search, status, purpose, dateFrom, dateTo, gateway, reconciliationStatus);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER, Role.COUNSELOR)
  @ResponseMessage('Payment statistics fetched successfully')
  getStats(@Req() req: any) {
    return this.paymentsService.getStats(req.user.organizationId);
  }

  // ---------------------------------------------------------------------------
  // Student checkout (any enabled gateway)
  // ---------------------------------------------------------------------------

  @Get('gateways/:applicationId')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Payment options fetched successfully')
  gateways(
    @Param('applicationId') applicationId: string,
    @Query('purpose') purpose: string | undefined,
    @Query('offerAcceptanceId') offerAcceptanceId: string | undefined,
    @Req() req: any,
  ) {
    return this.paymentsService.availableGateways(applicationId, purpose, offerAcceptanceId, req.user);
  }

  @Get('application/:applicationId')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Payments fetched successfully')
  forApplication(@Param('applicationId') applicationId: string, @Req() req: any) {
    return this.paymentsService.forApplication(applicationId, req.user);
  }

  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Checkout started')
  checkout(@Body() dto: CheckoutDto, @Req() req: any) {
    return this.paymentsService.checkout(dto, req.user);
  }

  @Post(':paymentId/confirm')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Payment status checked')
  confirm(@Param('paymentId', ParseUUIDPipe) paymentId: string, @Req() req: any) {
    return this.paymentsService.confirm(paymentId, req.user);
  }

  @Post('razorpay/order')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Payment order created successfully')
  createOrder(@Body() dto: CreateOrderDto, @Req() req: any) {
    return this.paymentsService.createOrder(dto, req.user);
  }

  @Post('razorpay/seat-booking-order')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Seat booking payment order created successfully')
  createSeatBookingOrder(@Body() dto: CreateSeatBookingOrderDto, @Req() req: any) {
    return this.paymentsService.createSeatBookingOrder(dto, req.user);
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
  recordFailure(@Body() body: { orderId: string; reason?: string }, @Req() req: any) {
    return this.paymentsService.recordFailure(body?.orderId, body?.reason, req.user);
  }

  // ---------------------------------------------------------------------------
  // Public gateway endpoints (authenticity = signature / hash / checksum)
  // ---------------------------------------------------------------------------

  /** PayU (surl/furl) and Paytm (callbackUrl) post the browser back here. */
  @Post('callback/:gateway/:paymentId')
  async callback(@Param('gateway') gateway: string, @Param('paymentId') paymentId: string, @Body() body: any, @Res() res: any) {
    const url = await this.paymentsService.handleCallback(gateway, paymentId, body || {});
    return res.redirect(303, url);
  }

  /** Legacy Razorpay webhook URL (org found from the order). */
  @Post('razorpay/webhook')
  @HttpCode(200)
  razorpayWebhook(@Req() req: any, @Headers() headers: Record<string, any>) {
    return this.paymentsService.handleWebhook('razorpay', null, req.rawBody, headers, req.body);
  }

  /** Real-time confirmation webhooks: /payments/webhook/{razorpay|stripe|payu|paytm}/{orgId} */
  @Post('webhook/:gateway/:orgId')
  @HttpCode(200)
  webhook(
    @Param('gateway') gateway: string,
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Req() req: any,
    @Headers() headers: Record<string, any>,
  ) {
    return this.paymentsService.handleWebhook(gateway, orgId, req.rawBody, headers, req.body);
  }
}

/** Finance / admin: refunds, reconciliation, exports, gateway settings. */
@Controller('organizations/:orgId/payments')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class PaymentsAdminController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly gatewaysService: PaymentGatewaysService,
  ) {}

  @Get('gateways')
  @Roles(...FINANCE_ROLES)
  @ResponseMessage('Payment gateways fetched successfully')
  listGateways(@Param('orgId', ParseUUIDPipe) orgId: string) {
    return this.gatewaysService.list(orgId);
  }

  @Put('gateways/:gateway')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN)
  @ResponseMessage('Payment gateway updated successfully')
  updateGateway(@Param('orgId', ParseUUIDPipe) orgId: string, @Param('gateway') gateway: string, @Body() dto: UpdateGatewaySettingDto) {
    return this.gatewaysService.update(orgId, gateway, dto);
  }

  @Post('gateways/:gateway/test')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN)
  @ResponseMessage('Gateway connection tested')
  testGateway(@Param('orgId', ParseUUIDPipe) orgId: string, @Param('gateway') gateway: string) {
    return this.gatewaysService.test(orgId, gateway);
  }

  @Get('reconciliation')
  @Roles(...FINANCE_ROLES)
  @ResponseMessage('Reconciliation fetched successfully')
  reconciliation(@Param('orgId', ParseUUIDPipe) orgId: string, @Query() q: any) {
    return this.paymentsService.reconciliation(orgId, q);
  }

  @Post('reconciliation/run')
  @Roles(...FINANCE_ROLES)
  @ResponseMessage('Reconciliation completed')
  runReconciliation(@Param('orgId', ParseUUIDPipe) orgId: string, @Body() dto: RunReconciliationDto, @Req() req: any) {
    return this.paymentsService.runReconciliation(orgId, dto, req.user.sub);
  }

  @Get('reconciliation/export')
  @Roles(...FINANCE_ROLES)
  async exportReport(@Param('orgId', ParseUUIDPipe) orgId: string, @Query() q: any, @Res() res: any) {
    const file = await this.paymentsService.exportReport(orgId, q);
    res.setHeader('Content-Type', file.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    return res.send(file.content);
  }

  @Get(':paymentId')
  @Roles(...FINANCE_ROLES, Role.COUNSELOR)
  @ResponseMessage('Payment fetched successfully')
  detail(@Param('orgId', ParseUUIDPipe) orgId: string, @Param('paymentId', ParseUUIDPipe) paymentId: string) {
    return this.paymentsService.detail(orgId, paymentId);
  }

  @Patch(':paymentId/reconciliation')
  @Roles(...FINANCE_ROLES)
  @ResponseMessage('Reconciliation updated')
  updateReconciliation(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('paymentId', ParseUUIDPipe) paymentId: string,
    @Body() dto: UpdateReconciliationDto,
    @Req() req: any,
  ) {
    return this.paymentsService.updateReconciliation(orgId, paymentId, dto, req.user.sub);
  }

  @Get(':paymentId/refunds')
  @Roles(...FINANCE_ROLES)
  @ResponseMessage('Refunds fetched successfully')
  refunds(@Param('orgId', ParseUUIDPipe) orgId: string, @Param('paymentId', ParseUUIDPipe) paymentId: string) {
    return this.paymentsService.refunds(orgId, paymentId);
  }

  @Post(':paymentId/refund')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER)
  @ResponseMessage('Refund initiated')
  refund(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('paymentId', ParseUUIDPipe) paymentId: string,
    @Body() dto: RefundDto,
    @Req() req: any,
  ) {
    return this.paymentsService.refund(orgId, paymentId, dto, req.user.sub);
  }
}
