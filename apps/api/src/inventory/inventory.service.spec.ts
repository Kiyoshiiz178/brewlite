import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InventoryService } from './inventory.service.js';
import { BadRequestException } from '@nestjs/common';

describe('InventoryService', () => {
  let service: InventoryService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      $transaction: vi.fn().mockImplementation((cb) => cb(mockPrisma)),
      ingredient: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      product: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      recipeItem: {
        findMany: vi.fn(),
        deleteMany: vi.fn(),
        create: vi.fn(),
      },
      order: {
        findUnique: vi.fn(),
      },
    };

    service = new InventoryService(mockPrisma);
  });

  describe('findAllIngredients', () => {
    it('gán đúng trạng thái IN_STOCK, LOW_STOCK và OUT_OF_STOCK theo mức cảnh báo', async () => {
      mockPrisma.ingredient.findMany.mockResolvedValue([
        { id: 1, name: 'Cà phê', unit: 'g', stock: 1000, minStockAlert: 200 },
        { id: 2, name: 'Sữa tươi', unit: 'ml', stock: 150, minStockAlert: 200 },
        { id: 3, name: 'Syrup đào', unit: 'ml', stock: 0, minStockAlert: 100 },
      ]);

      const result = await service.findAllIngredients();
      expect(result).toHaveLength(3);
      expect(result[0].status).toBe('IN_STOCK');
      expect(result[1].status).toBe('LOW_STOCK');
      expect(result[2].status).toBe('OUT_OF_STOCK');
    });
  });

  describe('findAllRecipes & calculateProductMaxCups', () => {
    it('tính đúng số ly tối đa theo công thức và chỉ ra nguyên liệu bottleneck', async () => {
      // Cà phê sữa: 25g cà phê + 30ml sữa đặc
      // Kho: 500g cà phê (làm được 20 ly), 300ml sữa đặc (làm được 10 ly)
      // => Số ly tối đa = 10 ly, bottleneck là Sữa đặc
      mockPrisma.product.findMany.mockResolvedValue([
        {
          id: 1,
          name: 'Cà phê sữa đá',
          price: 35000,
          stock: 10,
          recipes: [
            {
              id: 101,
              amount: 25,
              ingredient: { id: 1, name: 'Hạt cà phê', unit: 'g', stock: 500 },
            },
            {
              id: 102,
              amount: 30,
              ingredient: { id: 2, name: 'Sữa đặc', unit: 'ml', stock: 300 },
            },
          ],
        },
      ]);

      const result = await service.findAllRecipes();
      expect(result).toHaveLength(1);
      expect(result[0].maxCups).toBe(10);
      expect(result[0].bottleneck?.ingredientName).toBe('Sữa đặc');
      expect(result[0].bottleneck?.limitingCups).toBe(10);
    });
  });

  describe('restockIngredient', () => {
    it('tăng số lượng nguyên liệu và tự động cập nhật lại số ly các món liên quan', async () => {
      mockPrisma.ingredient.findUnique.mockResolvedValue({
        id: 1,
        name: 'Hạt cà phê',
        stock: 500,
      });
      mockPrisma.ingredient.update.mockResolvedValue({
        id: 1,
        name: 'Hạt cà phê',
        stock: 1500,
      });

      // Món ID 1 dùng nguyên liệu này
      mockPrisma.recipeItem.findMany.mockResolvedValue([
        {
          productId: 1,
          amount: 25,
          ingredient: { id: 1, name: 'Hạt cà phê', stock: 1500 },
        },
      ]);

      const restockRes = await service.restockIngredient(1, 1000);
      expect(mockPrisma.ingredient.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { stock: { increment: 1000 } },
      });
      expect(restockRes.affectedProducts).toBeDefined();
    });

    it('báo lỗi nếu số lượng nhập nhỏ hơn hoặc bằng 0', async () => {
      await expect(service.restockIngredient(1, 0)).rejects.toThrow(BadRequestException);
    });
  });

  describe('deductIngredientsForOrder', () => {
    it('báo lỗi nếu kho không đủ nguyên liệu theo công thức', async () => {
      mockPrisma.recipeItem.findMany.mockResolvedValue([
        {
          productId: 1,
          ingredientId: 2,
          amount: 50,
          product: { name: 'Matcha đá xay' },
          ingredient: { id: 2, name: 'Bột matcha', unit: 'g', stock: 40 },
        },
      ]);
      mockPrisma.ingredient.findUnique.mockResolvedValue({
        id: 2,
        name: 'Bột matcha',
        unit: 'g',
        stock: 40,
      });

      await expect(
        service.deductIngredientsForOrder([{ productId: 1, qty: 1 }], mockPrisma),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
