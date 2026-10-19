import { Test, TestingModule } from '@nestjs/testing';
import { OrdersController } from './orders.controller.js';
import { OrdersService } from './orders.service.js';
import { OrderStatus } from './order-state-machine.js';

import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';

describe('OrdersController', () => {
  let controller: OrdersController;
  let mockOrdersService: any;

  const mockUser = {
    id: 1,
    email: 'user@brewlite.vn',
  };

  const mockOrder = {
    orderId: 101,
    id: 101,
    status: OrderStatus.PENDING,
    subtotal: 35000,
    total: 35000,
  };

  beforeEach(async () => {
    mockOrdersService = {
      create: vi.fn().mockResolvedValue(mockOrder),
      findMyOrders: vi.fn().mockResolvedValue([mockOrder]),
      findOne: vi.fn().mockResolvedValue(mockOrder),
      updateStatus: vi.fn().mockResolvedValue({ ...mockOrder, status: OrderStatus.PAID }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        {
          provide: OrdersService,
          useValue: mockOrdersService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<OrdersController>(OrdersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('create gọi ordersService.create với userId và dto', async () => {
    const dto = {
      items: [{ productId: 1, size: 'M', qty: 1 }],
    };
    const result = await controller.create(mockUser, dto);
    expect(result).toEqual(mockOrder);
    expect(mockOrdersService.create).toHaveBeenCalledWith(mockUser.id, dto);
  });

  it('findMyOrders gọi ordersService.findMyOrders với userId', async () => {
    const result = await controller.findMyOrders(mockUser);
    expect(result).toEqual([mockOrder]);
    expect(mockOrdersService.findMyOrders).toHaveBeenCalledWith(mockUser.id);
  });

  it('findOne gọi ordersService.findOne với orderId', async () => {
    const result = await controller.findOne(101);
    expect(result).toEqual(mockOrder);
    expect(mockOrdersService.findOne).toHaveBeenCalledWith(101);
  });

  it('updateStatus gọi ordersService.updateStatus với orderId và status mới', async () => {
    const result = await controller.updateStatus(101, { status: OrderStatus.PAID });
    expect(result.status).toBe(OrderStatus.PAID);
    expect(mockOrdersService.updateStatus).toHaveBeenCalledWith(101, OrderStatus.PAID);
  });
});
