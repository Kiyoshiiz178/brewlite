import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { OrderStatus, assertTransition } from './order-state-machine.js';
import { InventoryService } from '../inventory/inventory.service.js';

@Injectable()
export class OrdersService {
  private readonly inventoryService: InventoryService;

  constructor(private readonly prisma: PrismaService) {
    this.inventoryService = new InventoryService(this.prisma);
  }

  async create(userId: number | undefined, dto: CreateOrderDto) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Giỏ hàng không được để trống');
    }

    return await this.prisma.$transaction(async (tx) => {
      let subtotal = 0;
      const lineItemsToCreate: Array<{
        productId: number;
        size: string;
        qty: number;
        lineTotal: number;
      }> = [];

      for (const item of dto.items) {
        // Lấy thông tin sản phẩm
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (!product) {
          throw new NotFoundException(`Không tìm thấy sản phẩm #${item.productId}`);
        }

        // Kiểm tra tồn kho
        if (product.stock < item.qty) {
          throw new BadRequestException(
            `Sản phẩm '${product.name}' chỉ còn ${product.stock} sản phẩm, không đủ đáp ứng số lượng yêu cầu (${item.qty})`,
          );
        }

        // Kiểm soát tồn kho đồng thời với Optimistic Locking
        const updateResult = await tx.product.updateMany({
          where: {
            id: product.id,
            version: product.version,
            stock: { gte: item.qty },
          },
          data: {
            stock: { decrement: item.qty },
            version: { increment: 1 },
          },
        });

        if (updateResult.count === 0) {
          throw new BadRequestException(
            `Xung đột tồn kho khi đặt sản phẩm '${product.name}'. Vui lòng thử lại!`,
          );
        }

        // Tính giá theo size và topping
        let unitPrice = product.price;
        const normalizedSize = (item.size || 'M').toUpperCase();
        if (normalizedSize === 'M') {
          unitPrice += 5000;
        } else if (normalizedSize === 'L') {
          unitPrice += 10000;
        }

        const toppingCount = item.toppings ? item.toppings.length : 0;
        unitPrice += toppingCount * 5000;

        const lineTotal = unitPrice * item.qty;
        subtotal += lineTotal;

        lineItemsToCreate.push({
          productId: product.id,
          size: normalizedSize,
          qty: item.qty,
          lineTotal,
        });
      }

      // Trừ kho nguyên liệu theo công thức nếu có bảng recipeItem
      if ((tx as any).recipeItem && typeof (tx as any).recipeItem.findMany === 'function') {
        await this.inventoryService.deductIngredientsForOrder(dto.items, tx);
      }

      // Xử lý mã khuyến mãi
      let discountAmount = 0;
      if (dto.promoCode && dto.promoCode.trim().length > 0) {
        const promo = await tx.promotion.findUnique({
          where: {
            code: dto.promoCode.trim().toUpperCase(),
          },
        });

        if (!promo || !promo.isActive) {
          throw new BadRequestException('Mã khuyến mãi không hợp lệ hoặc đã hết hạn');
        }

        discountAmount = Math.round((subtotal * promo.discountPct) / 100);
      }

      const total = Math.max(0, subtotal - discountAmount);

      // Tạo Order ở trạng thái PENDING
      const order = await tx.order.create({
        data: {
          userId: userId ?? null,
          status: OrderStatus.PENDING,
          total,
          items: {
            create: lineItemsToCreate,
          },
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      return {
        orderId: order.id,
        id: order.id,
        status: order.status,
        subtotal,
        discountAmount,
        total: order.total,
        createdAt: order.createdAt,
        items: order.items,
      };
    });
  }

  async findMyOrders(userId: number) {
    return this.prisma.order.findMany({
      where: { userId },
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
  }

  async findAll() {
    return this.prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        payments: true,
        user: {
          select: {
            id: true,
            email: true,
            loyaltyPoints: true,
          },
        },
      },
    });
  }

  async findOne(id: number) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        payments: true,
        user: {
          select: {
            id: true,
            email: true,
            loyaltyPoints: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng #${id}`);
    }

    return order;
  }

  async updateStatus(id: number, nextStatus: string) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng #${id}`);
    }

    // State machine check
    assertTransition(order.status, nextStatus);

    // Hoàn kho nguyên liệu nếu hủy đơn hàng
    if (nextStatus === OrderStatus.CANCELLED && order.status !== OrderStatus.CANCELLED) {
      if ((this.prisma as any).recipeItem && typeof (this.prisma as any).recipeItem.findMany === 'function') {
        await this.inventoryService.restoreIngredientsForOrder(id, this.prisma);
      }
    }

    return this.prisma.order.update({
      where: { id },
      data: { status: nextStatus },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });
  }
}
