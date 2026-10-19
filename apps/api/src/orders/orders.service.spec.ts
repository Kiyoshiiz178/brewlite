import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { OrdersService } from './orders.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { OrderStatus } from './order-state-machine.js';

describe('OrdersService', () => {
  let service: OrdersService;
  let mockPrismaService: any;

  const mockProduct = {
    id: 1,
    name: 'Cà phê sữa đá',
    price: 35000,
    stock: 10,
    version: 0,
  };

  const mockPromotion = {
    id: 1,
    code: 'BREW10',
    discountPct: 10,
    isActive: true,
  };

  beforeEach(async () => {
    mockPrismaService = {
      $transaction: vi.fn().mockImplementation((cb) => cb(mockPrismaService)),
      product: {
        findUnique: vi.fn().mockImplementation(({ where }) => {
          if (where.id === 1) return Promise.resolve(mockProduct);
          return Promise.resolve(null);
        }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      promotion: {
        findUnique: vi.fn().mockImplementation(({ where }) => {
          if (where.code === 'BREW10') return Promise.resolve(mockPromotion);
          return Promise.resolve(null);
        }),
      },
      order: {
        create: vi.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: 101,
            userId: data.userId,
            status: data.status,
            total: data.total,
            createdAt: new Date(),
            items: data.items.create,
          }),
        ),
        findMany: vi.fn().mockResolvedValue([
          { id: 101, userId: 1, status: OrderStatus.PENDING, total: 40000 },
        ]),
        findUnique: vi.fn().mockImplementation(({ where }) => {
          if (where.id === 101) {
            return Promise.resolve({
              id: 101,
              status: OrderStatus.PENDING,
              total: 40000,
            });
          }
          return Promise.resolve(null);
        }),
        update: vi.fn().mockImplementation(({ where, data }) =>
          Promise.resolve({
            id: where.id,
            status: data.status,
          }),
        ),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('ném BadRequestException nếu danh sách món rỗng', async () => {
      await expect(service.create(1, { items: [] })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('ném NotFoundException nếu sản phẩm không tồn tại', async () => {
      await expect(
        service.create(1, {
          items: [{ productId: 999, size: 'M', qty: 1 }],
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('ném BadRequestException nếu số lượng đặt vượt quá tồn kho', async () => {
      await expect(
        service.create(1, {
          items: [{ productId: 1, size: 'M', qty: 999 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('ném BadRequestException nếu xung đột tồn kho (Optimistic Locking thất bại)', async () => {
      mockPrismaService.product.updateMany.mockResolvedValueOnce({ count: 0 });
      await expect(
        service.create(1, {
          items: [{ productId: 1, size: 'M', qty: 1 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('tạo đơn thành công với trạng thái PENDING và tính giá đúng theo size, topping', async () => {
      // base price: 35.000đ, size M: +5.000đ, 2 toppings: +10.000đ => 50.000đ * 2 qty = 100.000đ
      const result = await service.create(1, {
        items: [
          {
            productId: 1,
            size: 'M',
            qty: 2,
            toppings: ['tranchau', 'thach'],
          },
        ],
      });

      expect(result.status).toBe(OrderStatus.PENDING);
      expect(result.subtotal).toBe(100000);
      expect(result.total).toBe(100000);
      expect(result.discountAmount).toBe(0);
      expect(mockPrismaService.order.create).toHaveBeenCalled();
    });

    it('áp dụng mã giảm giá hợp lệ chính xác', async () => {
      // base 35k, size S (+0) * 1 = 35k. Giảm 10% = 3.500đ => total = 31.500đ
      const result = await service.create(1, {
        items: [{ productId: 1, size: 'S', qty: 1 }],
        promoCode: 'BREW10',
      });

      expect(result.subtotal).toBe(35000);
      expect(result.discountAmount).toBe(3500);
      expect(result.total).toBe(31500);
    });

    it('ném BadRequestException nếu mã giảm giá không hợp lệ', async () => {
      await expect(
        service.create(1, {
          items: [{ productId: 1, size: 'S', qty: 1 }],
          promoCode: 'INVALID_CODE',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findMyOrders', () => {
    it('trả về danh sách đơn của user', async () => {
      const orders = await service.findMyOrders(1);
      expect(orders).toHaveLength(1);
      expect(orders[0].userId).toBe(1);
      expect(mockPrismaService.order.findMany).toHaveBeenCalledWith({
        where: { userId: 1 },
        orderBy: { createdAt: 'desc' },
        include: {
          items: {
            include: {
              product: true,
            },
          },
          payments: true,
        },
      });
    });
  });

  describe('findOne', () => {
    it('trả về thông tin đơn hàng nếu tồn tại', async () => {
      const order = await service.findOne(101);
      expect(order.id).toBe(101);
    });

    it('ném NotFoundException nếu đơn hàng không tồn tại', async () => {
      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateStatus', () => {
    it('chuyển trạng thái hợp lệ thành công (PENDING -> PAID)', async () => {
      const updated = await service.updateStatus(101, OrderStatus.PAID);
      expect(updated.status).toBe(OrderStatus.PAID);
    });

    it('chặn chuyển trạng thái không hợp lệ (PENDING -> READY) bằng BadRequestException', async () => {
      await expect(
        service.updateStatus(101, OrderStatus.READY),
      ).rejects.toThrow(BadRequestException);
    });

    it('ném NotFoundException nếu đơn hàng không tồn tại khi update', async () => {
      await expect(
        service.updateStatus(999, OrderStatus.PAID),
      ).rejects.toThrow(NotFoundException);
    });
  });
});

