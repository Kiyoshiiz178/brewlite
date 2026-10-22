import { Controller, Post, Body, Get, Param, ParseIntPipe } from '@nestjs/common';
import { PaymentsService } from './payments.service.js';
import { CreatePaymentDto, MockWebhookDto } from './dto/create-payment.dto.js';

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

  @Get()
  getAllPayments() {
    return this.paymentsService.findAllPayments();
  }

  @Get('order/:orderId')
  getByOrder(@Param('orderId', ParseIntPipe) orderId: number) {
    return this.paymentsService.getPaymentByOrderId(orderId);
  }
}
