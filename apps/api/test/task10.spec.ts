import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { assertTransition, OrderStatus } from '../src/orders/order-state-machine.js';
import { OrdersService } from '../src/orders/orders.service.js';
import { PaymentsService } from '../src/payments/payments.service.js';
import { BadRequestException } from '@nestjs/common';

describe('Task 10: Backend Business Logic Verification', () => {
  const connectionString =
    process.env.DATABASE_URL || 'postgresql://brewlite:brewlite@localhost:5432/brewlite';
  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter }) as any;

  let ordersService: OrdersService;
  let paymentsService: PaymentsService;
  let testUserId: number;

  beforeAll(async () => {
    await prisma.$connect();
    ordersService = new OrdersService(prisma);
    paymentsService = new PaymentsService(prisma);

    // Tạo test user nếu chưa có
    const testUser = await prisma.user.upsert({
      where: { email: 'task10_tester@brewlite.vn' },
      update: { loyaltyPoints: 0 },
      create: {
        email: 'task10_tester@brewlite.vn',
        passwordHash: 'dummy_hash',
        loyaltyPoints: 0,
      },
    });
    testUserId = testUser.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // =========================================================================
  // (a) Order State Machine: PENDING -> PAID -> PREPARING -> READY -> COMPLETED
  // Chặn mọi chuyển trạng thái sai.
  // =========================================================================
  describe('(a) Order State Machine & assertTransition', () => {
    it('cho phép chuyển tiếp hợp lệ theo sơ đồ Mục 9.1', () => {
      // Happy path
      expect(() => assertTransition(OrderStatus.PENDING, OrderStatus.PAID)).not.toThrow();
      expect(() => assertTransition(OrderStatus.PAID, OrderStatus.PREPARING)).not.toThrow();
      expect(() => assertTransition(OrderStatus.PREPARING, OrderStatus.READY)).not.toThrow();
      expect(() => assertTransition(OrderStatus.READY, OrderStatus.COMPLETED)).not.toThrow();

      // Branch ngoại lệ: thanh toán lỗi và thử lại
      expect(() =>
        assertTransition(OrderStatus.PENDING, OrderStatus.PAYMENT_FAILED),
      ).not.toThrow();
      expect(() =>
        assertTransition(OrderStatus.PAYMENT_FAILED, OrderStatus.PAID),
      ).not.toThrow();

      // Branch hủy đơn
      expect(() =>
        assertTransition(OrderStatus.PENDING, OrderStatus.CANCELLED),
      ).not.toThrow();
      expect(() =>
        assertTransition(OrderStatus.PAID, OrderStatus.CANCELLED),
      ).not.toThrow();
      expect(() =>
        assertTransition(OrderStatus.PAYMENT_FAILED, OrderStatus.CANCELLED),
      ).not.toThrow();
    });

    it('chặn các chuyển tiếp không hợp lệ bằng BadRequestException', () => {
      // Nhảy cóc trạng thái
      expect(() =>
        assertTransition(OrderStatus.PENDING, OrderStatus.READY),
      ).toThrow(BadRequestException);
      expect(() =>
        assertTransition(OrderStatus.PENDING, OrderStatus.COMPLETED),
      ).toThrow(BadRequestException);

      // Quay lui trạng thái
      expect(() =>
        assertTransition(OrderStatus.PAID, OrderStatus.PENDING),
      ).toThrow(BadRequestException);
      expect(() =>
        assertTransition(OrderStatus.READY, OrderStatus.PREPARING),
      ).toThrow(BadRequestException);

      // Rời khỏi trạng thái kết thúc (Terminal states)
      expect(() =>
        assertTransition(OrderStatus.COMPLETED, OrderStatus.PAID),
      ).toThrow(BadRequestException);
      expect(() =>
        assertTransition(OrderStatus.CANCELLED, OrderStatus.PAID),
      ).toThrow(BadRequestException);
      expect(() =>
        assertTransition(OrderStatus.COMPLETED, OrderStatus.CANCELLED),
      ).toThrow(BadRequestException);
    });
  });

  // =========================================================================
  // (b) Thanh toán Idempotent: cùng một Idempotency-Key không bị trừ tiền/đặt 2 lần
  // =========================================================================
  describe('(b) Idempotent Payments', () => {
    it('gửi 2 lần cùng Idempotency-Key chỉ tạo 1 payment và không cộng điểm loyalty 2 lần', async () => {
      // 1. Tạo 1 sản phẩm có sẵn
      const product = await prisma.product.create({
        data: {
          name: `Test Product Idempotency ${Date.now()}`,
          price: 40000,
          stock: 10,
          version: 0,
        },
      });

      // 2. Tạo đơn hàng mới
      const order = await ordersService.create(testUserId, {
        items: [{ productId: product.id, size: 'S', qty: 1 }],
      });

      const uniqueKey = `idemp-test-${Date.now()}-${Math.random()}`;

      // 3. Thanh toán lần 1
      const res1 = await paymentsService.processPayment({
        orderId: order.orderId,
        idempotencyKey: uniqueKey,
        amount: order.total,
        method: 'WALLET',
      });

      expect(res1.success).toBe(true);
      expect(res1.isIdempotentReplay).toBe(false);
      expect(res1.status).toBe(OrderStatus.PAID);
      expect(res1.pointsEarned).toBeGreaterThan(0);

      // Lưu lại số điểm sau lần 1
      const userAfterFirstPay = await prisma.user.findUnique({
        where: { id: testUserId },
      });
      const pointsAfterFirst = userAfterFirstPay?.loyaltyPoints ?? 0;

      // 4. Thanh toán lần 2 với cùng idempotencyKey
      const res2 = await paymentsService.processPayment({
        orderId: order.orderId,
        idempotencyKey: uniqueKey,
        amount: order.total,
        method: 'WALLET',
      });

      // Kiểm tra lần 2 là replay, không thực hiện trừ tiền hay tạo bản ghi mới
      expect(res2.isIdempotentReplay).toBe(true);
      expect(res2.paymentId).toBe(res1.paymentId);

      // Điểm loyalty không bị cộng thêm lần 2
      const userAfterSecondPay = await prisma.user.findUnique({
        where: { id: testUserId },
      });
      expect(userAfterSecondPay?.loyaltyPoints).toBe(pointsAfterFirst);

      // Kiểm tra trong DB chỉ có duy nhất 1 Payment record cho key này
      const paymentRecords = await prisma.payment.findMany({
        where: { idempotencyKey: uniqueKey },
      });
      expect(paymentRecords.length).toBe(1);
    });
  });

  // =========================================================================
  // (c) Kiểm soát tồn kho khi đặt đồng thời: Transaction + Optimistic Locking
  // =========================================================================
  describe('(c) Concurrent Stock Control with Optimistic Locking', () => {
    it('khi nhiều khách đặt cùng lúc, không bán vượt quá số lượng tồn kho', async () => {
      // 1. Tạo 1 sản phẩm chỉ có 2 ly trong kho
      const limitedProduct = await prisma.product.create({
        data: {
          name: `Limited Drink ${Date.now()}`,
          price: 35000,
          stock: 2, // Chỉ có 2 ly
          version: 0,
        },
      });

      // 2. Mô phỏng 5 khách hàng gửi yêu cầu mua 1 ly đồng thời (Concurrent requests)
      const concurrentOrders = Array.from({ length: 5 }).map(() =>
        ordersService.create(testUserId, {
          items: [{ productId: limitedProduct.id, size: 'S', qty: 1 }],
        }),
      );

      const results = await Promise.allSettled(concurrentOrders);

      // 3. Đếm số đơn đặt thành công và số đơn bị từ chối
      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      // Vì chỉ có 2 ly trong kho, nên chính xác 2 đơn thành công, 3 đơn bị từ chối
      expect(fulfilled.length).toBe(2);
      expect(rejected.length).toBe(3);

      // 4. Kiểm tra số lượng tồn kho cuối cùng trong DB phải bằng 0 (không âm)
      const finalProduct = await prisma.product.findUnique({
        where: { id: limitedProduct.id },
      });

      expect(finalProduct?.stock).toBe(0);
      expect(finalProduct?.version).toBe(2); // Đã tăng version 2 lần do optimistic locking
    });
  });

  // =========================================================================
  // (d) Khuyến mãi & Tích điểm Loyalty
  // =========================================================================
  describe('(d) Promotions & Loyalty Points', () => {
    it('áp mã giảm giá thành công và cộng điểm loyalty sau khi đơn PAID', async () => {
      // Tạo mã giảm giá 50%
      const promoCode = `PROMO50_${Date.now()}`;
      await prisma.promotion.create({
        data: {
          code: promoCode,
          discountPct: 50,
          isActive: true,
        },
      });

      const product = await prisma.product.create({
        data: {
          name: `Promo Product ${Date.now()}`,
          price: 50000,
          stock: 10,
          version: 0,
        },
      });

      // Đặt đơn áp mã giảm giá
      const order = await ordersService.create(testUserId, {
        items: [{ productId: product.id, size: 'S', qty: 1 }],
        promoCode,
      });

      // Giá gốc 50.000đ, giảm 50% còn 25.000đ
      expect(order.subtotal).toBe(50000);
      expect(order.discountAmount).toBe(25000);
      expect(order.total).toBe(25000);

      // Thanh toán đơn
      const userBefore = await prisma.user.findUnique({ where: { id: testUserId } });
      const pointsBefore = userBefore?.loyaltyPoints ?? 0;

      const payRes = await paymentsService.processPayment({
        orderId: order.orderId,
        idempotencyKey: `pay-promo-${Date.now()}`,
        amount: order.total,
        method: 'CARD',
      });

      expect(payRes.status).toBe(OrderStatus.PAID);
      // 25.000 VNĐ / 10.000 => được 2 điểm
      expect(payRes.pointsEarned).toBe(2);

      const userAfter = await prisma.user.findUnique({ where: { id: testUserId } });
      expect(userAfter?.loyaltyPoints).toBe(pointsBefore + 2);
    });
  });
});
