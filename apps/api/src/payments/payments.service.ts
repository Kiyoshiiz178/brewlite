import * as crypto from 'crypto';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreatePaymentDto, MockWebhookDto } from './dto/create-payment.dto.js';
import { OrderStatus, assertTransition } from '../orders/order-state-machine.js';

export interface ProcessPaymentResult {
  success: boolean;
  message: string;
  orderId: number;
  status: string;
  isIdempotentReplay?: boolean;
  paymentId?: number;
  amount?: number;
  method?: string;
  pointsEarned?: number;
}

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async processPayment(dto: CreatePaymentDto): Promise<ProcessPaymentResult> {
    // 1. Kiểm tra Idempotency (Task 10.2)
    // Nếu idempotencyKey đã tồn tại -> trả lại kết quả cũ, không trừ tiền hay tích điểm lần 2
    const existingPayment = await this.prisma.payment.findUnique({
      where: { idempotencyKey: dto.idempotencyKey },
      include: { order: true },
    });

    if (existingPayment) {
      return {
        isIdempotentReplay: true,
        success: existingPayment.order.status === OrderStatus.PAID,
        message: 'Yêu cầu lặp lại (Idempotent): Giao dịch đã được ghi nhận trước đó',
        paymentId: existingPayment.id,
        orderId: existingPayment.orderId,
        status: existingPayment.order.status,
        amount: existingPayment.amount,
        method: existingPayment.method,
      };
    }

    // 2. Tìm đơn hàng
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: { user: true },
    });

    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng #${dto.orderId}`);
    }

    // 3. Xử lý trường hợp thanh toán thất bại (giả lập mock error)
    if (dto.mockFailed) {
      // Kiểm tra chuyển trạng thái sang PAYMENT_FAILED (Task 10.1)
      assertTransition(order.status, OrderStatus.PAYMENT_FAILED);

      await this.prisma.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.PAYMENT_FAILED },
      });

      return {
        success: false,
        orderId: order.id,
        status: OrderStatus.PAYMENT_FAILED,
        message: 'Thanh toán thất bại (Mô phỏng lỗi từ cổng thanh toán)',
      };
    }

    // 4. Thanh toán thành công (Happy path)
    // Kiểm tra hợp lệ chuyển trạng thái sang PAID (Task 10.1)
    assertTransition(order.status, OrderStatus.PAID);

    return await this.prisma.$transaction(async (tx) => {
      // Lưu giao dịch thanh toán
      const payment = await tx.payment.create({
        data: {
          orderId: order.id,
          idempotencyKey: dto.idempotencyKey,
          amount: dto.amount,
          method: dto.method,
        },
      });

      // Cập nhật trạng thái đơn hàng sang PAID
      await tx.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.PAID },
      });

      // Cộng điểm tích lũy Loyalty Points (Task 10.4)
      let pointsEarned = 0;
      if (order.userId) {
        // Quy đổi: mỗi 10.000 VNĐ được cộng 1 điểm loyalty
        pointsEarned = Math.floor(order.total / 10000);
        if (pointsEarned > 0) {
          await tx.user.update({
            where: { id: order.userId },
            data: {
              loyaltyPoints: { increment: pointsEarned },
            },
          });

          await tx.loyaltyTransaction.create({
            data: {
              userId: order.userId,
              points: pointsEarned,
              reason: `Tích điểm đơn hàng #${order.id}`,
            },
          });
        }
      }

      return {
        success: true,
        isIdempotentReplay: false,
        paymentId: payment.id,
        orderId: order.id,
        status: OrderStatus.PAID,
        amount: payment.amount,
        method: payment.method,
        pointsEarned,
        message: 'Thanh toán thành công',
      };
    });
  }

  async getPaymentByOrderId(orderId: number) {
    return this.prisma.payment.findMany({
      where: { orderId },
    });
  }

  async findAllPayments() {
    return this.prisma.payment.findMany({
      orderBy: { id: 'desc' },
      include: {
        order: {
          include: {
            user: { select: { id: true, email: true } },
          },
        },
      },
    });
  }

  async handleWebhook(dto: MockWebhookDto) {
    const result = await this.processPayment({
      orderId: dto.orderId,
      idempotencyKey: dto.idempotencyKey,
      amount: dto.amount,
      method: dto.method,
      mockFailed: dto.status === 'FAILED',
    });

    return {
      received: true,
      gatewayRef: dto.gatewayRef || `GW-${Date.now()}`,
      ...result,
    };
  }

  private formatVnpayDate(date: Date = new Date()): string {
    const vnTime = new Date(date.getTime() + 7 * 60 * 60 * 1000);
    const year = vnTime.getUTCFullYear();
    const month = String(vnTime.getUTCMonth() + 1).padStart(2, '0');
    const day = String(vnTime.getUTCDate()).padStart(2, '0');
    const hour = String(vnTime.getUTCHours()).padStart(2, '0');
    const minute = String(vnTime.getUTCMinutes()).padStart(2, '0');
    const second = String(vnTime.getUTCSeconds()).padStart(2, '0');
    return `${year}${month}${day}${hour}${minute}${second}`;
  }

  private sortObject(obj: Record<string, any>) {
    const sorted: Record<string, any> = {};
    const str: string[] = [];
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        str.push(encodeURIComponent(key));
      }
    }
    str.sort();
    for (let key = 0; key < str.length; key++) {
      sorted[str[key]] = encodeURIComponent(String(obj[str[key]])).replace(/%20/g, '+');
    }
    return sorted;
  }

  async createVnpayUrl(orderId: number, ipAddr: string = '127.0.0.1', bankCode?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng #${orderId}`);
    }

    const tmnCode = process.env.VNP_TMN_CODE || 'CGXZLS0Z';
    const secretKey = process.env.VNP_HASH_SECRET || 'XNBCJFAKAZQSGTARRLGCHVZWCIOIGSHN';
    const vnpUrl = process.env.VNP_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
    const returnUrl = process.env.VNP_RETURN_URL || 'http://localhost:3000/vnpay-return';

    const createDate = this.formatVnpayDate(new Date());

    let vnp_Params: Record<string, any> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: tmnCode,
      vnp_Locale: 'vn',
      vnp_CurrCode: 'VND',
      vnp_TxnRef: String(orderId),
      vnp_OrderInfo: `Thanh toan don hang #${orderId}`,
      vnp_OrderType: 'other',
      vnp_Amount: String(order.total * 100),
      vnp_ReturnUrl: returnUrl,
      vnp_IpAddr: ipAddr.includes('::') ? '127.0.0.1' : ipAddr,
      vnp_CreateDate: createDate,
    };

    if (bankCode && bankCode.trim().length > 0) {
      vnp_Params['vnp_BankCode'] = bankCode.trim();
    }

    vnp_Params = this.sortObject(vnp_Params);

    const signData = Object.keys(vnp_Params)
      .map((k) => `${k}=${vnp_Params[k]}`)
      .join('&');

    const hmac = crypto.createHmac('sha512', secretKey);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    const paymentUrl = `${vnpUrl}?${signData}&vnp_SecureHash=${signed}`;

    return {
      paymentUrl,
      orderId,
      amount: order.total,
    };
  }

  async verifyVnpayReturn(queryParams: Record<string, any>) {
    const vnp_Params: Record<string, any> = {};
    const secureHash = queryParams['vnp_SecureHash'];

    for (const key of Object.keys(queryParams)) {
      if (key.startsWith('vnp_') && key !== 'vnp_SecureHash' && key !== 'vnp_SecureHashType') {
        vnp_Params[key] = queryParams[key];
      }
    }

    const sortedParams = this.sortObject(vnp_Params);
    const signData = Object.keys(sortedParams)
      .map((k) => `${k}=${sortedParams[k]}`)
      .join('&');

    const secretKey = process.env.VNP_HASH_SECRET || 'XNBCJFAKAZQSGTARRLGCHVZWCIOIGSHN';
    const hmac = crypto.createHmac('sha512', secretKey);
    const checkHash = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    if (!secureHash || String(secureHash).toLowerCase() !== checkHash.toLowerCase()) {
      throw new BadRequestException('Chữ ký số VNPay không hợp lệ (Checksum failed)');
    }

    const orderId = parseInt(queryParams['vnp_TxnRef'], 10);
    const responseCode = queryParams['vnp_ResponseCode'];
    const amount = parseInt(queryParams['vnp_Amount'], 10) / 100;
    const transactionNo = queryParams['vnp_TransactionNo'] || `TXN-${Date.now()}`;
    const bankCode = queryParams['vnp_BankCode'];

    if (responseCode === '00') {
      const paymentResult = await this.processPayment({
        orderId,
        idempotencyKey: `vnpay_${transactionNo}_${orderId}`,
        amount,
        method: 'VNPAY',
      });

      return {
        success: true,
        orderId,
        amount,
        transactionNo,
        bankCode,
        message: 'Thanh toán VNPay thành công',
        status: paymentResult.status,
      };
    } else {
      const currentOrder = await this.prisma.order.findUnique({ where: { id: orderId } });
      if (currentOrder && currentOrder.status === OrderStatus.PENDING) {
        await this.prisma.order.update({
          where: { id: orderId },
          data: { status: OrderStatus.PAYMENT_FAILED },
        });
      }

      return {
        success: false,
        orderId,
        amount,
        responseCode,
        message: 'Giao dịch VNPay không thành công hoặc người dùng đã hủy',
      };
    }
  }

  async handleVnpayIpn(queryParams: Record<string, any>) {
    try {
      const result = await this.verifyVnpayReturn(queryParams);
      if (result.success) {
        return { RspCode: '00', Message: 'Confirm Success' };
      }
      return { RspCode: '01', Message: 'Order not found or payment failed' };
    } catch {
      return { RspCode: '97', Message: 'Invalid Checksum' };
    }
  }

  async handleSepayWebhook(data: Record<string, any>) {
    console.log('[SePay Webhook Received]:', JSON.stringify(data));

    // 1. Chỉ nhận tiền vào
    if (data.transferType && data.transferType !== 'in') {
      return { success: true, message: 'Bỏ qua giao dịch không phải tiền vào' };
    }

    const content = String(data.content || data.description || '').toUpperCase();
    const amount = Number(data.transferAmount || data.amountIn || data.amount || 0);
    const referenceCode = String(data.referenceCode || `SEPAY-${data.id || Date.now()}`);

    // 2. Tìm mã đơn hàng từ nội dung chuyển khoản
    // Khớp: BREWLITE56, BREWLITE 56, BREW56, DH56, DON56 hoặc #56 hoặc số đơn
    const match =
      content.match(/BREWLITE\s*#?(\d+)/i) ||
      content.match(/BREW\s*#?(\d+)/i) ||
      content.match(/DH\s*#?(\d+)/i) ||
      content.match(/DON\s*#?(\d+)/i) ||
      content.match(/#(\d+)/) ||
      content.match(/(\d+)/);

    if (!match) {
      console.warn(`[SePay Webhook] Không tìm thấy mã đơn hàng trong nội dung: "${content}"`);
      return { success: false, message: `Không tìm thấy mã đơn hàng trong nội dung: "${content}"` };
    }

    const orderId = parseInt(match[1], 10);
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });

    if (!order) {
      console.warn(`[SePay Webhook] Không tìm thấy đơn hàng #${orderId}`);
      return { success: false, message: `Không tìm thấy đơn hàng #${orderId}` };
    }

    if (order.status === OrderStatus.PAID) {
      return { success: true, message: `Đơn hàng #${orderId} đã được thanh toán trước đó` };
    }

    // 3. Tiến hành xử lý thanh toán (chấp nhận nếu amount > 0 để thuận tiện demo)
    const idempotencyKey = `sepay_${referenceCode}_${orderId}`;
    const paymentResult = await this.processPayment({
      orderId,
      idempotencyKey,
      amount: order.total,
      method: 'VIETQR',
    });

    console.log(`[SePay Webhook] Đơn #${orderId} đã được xác nhận thanh toán thành công (PAID)`);

    return {
      success: true,
      orderId,
      amount,
      message: `Xác nhận thanh toán SePay thành công cho đơn #${orderId}`,
      status: paymentResult.status,
    };
  }
}

