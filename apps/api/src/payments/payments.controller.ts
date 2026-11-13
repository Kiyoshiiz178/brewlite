import { Controller, Post, Body, Get, Param, ParseIntPipe, Query, Req } from '@nestjs/common';
import { PaymentsService } from './payments.service.js';
import { CreatePaymentDto, MockWebhookDto } from './dto/create-payment.dto.js';
import type { Request } from 'express';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  processPayment(@Body() createPaymentDto: CreatePaymentDto) {
    return this.paymentsService.processPayment(createPaymentDto);
  }

  @Post('webhook')
  handleWebhook(@Body() mockWebhookDto: MockWebhookDto) {
    return this.paymentsService.handleWebhook(mockWebhookDto);
  }

  @Post('vnpay-url')
  createVnpayUrl(
    @Body() body: { orderId: number; bankCode?: string },
    @Req() req: Request,
  ) {
    const ipAddr =
      (req.headers['x-forwarded-for'] as string) ||
      req.socket.remoteAddress ||
      '127.0.0.1';
    return this.paymentsService.createVnpayUrl(body.orderId, String(ipAddr), body.bankCode);
  }

  @Get('vnpay-verify')
  verifyVnpayReturn(@Query() query: Record<string, any>) {
    return this.paymentsService.verifyVnpayReturn(query);
  }

  @Get('vnpay-ipn')
  handleVnpayIpn(@Query() query: Record<string, any>) {
    return this.paymentsService.handleVnpayIpn(query);
  }

  @Post('sepay-webhook')
  handleSepayWebhook(@Body() body: Record<string, any>) {
    return this.paymentsService.handleSepayWebhook(body);
  }

  @Get()
  getAllPayments() {
    return this.paymentsService.findAllPayments();
  }

  @Get('order/:orderId')
  getByOrder(@Param('orderId', ParseIntPipe) orderId: number) {
    return this.paymentsService.getPaymentByOrderId(orderId);
  }
}
