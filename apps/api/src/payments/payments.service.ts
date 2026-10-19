import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreatePaymentDto } from './dto/create-payment.dto.js';
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
}
