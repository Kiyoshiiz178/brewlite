import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateIngredientDto } from './dto/create-ingredient.dto.js';
import { SaveRecipeDto } from './dto/save-recipe.dto.js';

export interface IngredientStatusItem {
  id: number;
  name: string;
  unit: string;
  stock: number;
  minStockAlert: number;
  status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
}

export interface BottleneckInfo {
  ingredientId: number;
  ingredientName: string;
  unit: string;
  currentStock: number;
  requiredAmount: number;
  limitingCups: number;
}

export interface ProductRecipeDetail {
  productId: number;
  productName: string;
  price: number;
  stock: number;
  maxCups: number;
  bottleneck: BottleneckInfo | null;
  recipes: Array<{
    id: number;
    ingredientId: number;
    ingredientName: string;
    unit: string;
    amount: number;
    currentStock: number;
  }>;
}

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lấy danh sách tất cả nguyên liệu trong kho kèm trạng thái cảnh báo.
   */
  async findAllIngredients(): Promise<IngredientStatusItem[]> {
    const ingredients = await this.prisma.ingredient.findMany({
      orderBy: { name: 'asc' },
    });

    return ingredients.map((item) => {
      let status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' = 'IN_STOCK';
      if (item.stock <= 0) {
        status = 'OUT_OF_STOCK';
      } else if (item.stock <= item.minStockAlert) {
        status = 'LOW_STOCK';
      }

      return {
        id: item.id,
        name: item.name,
        unit: item.unit,
        stock: item.stock,
        minStockAlert: item.minStockAlert,
        status,
      };
    });
  }

  /**
   * Thêm nguyên liệu mới vào kho.
   */
  async createIngredient(dto: CreateIngredientDto) {
    const existing = await this.prisma.ingredient.findUnique({
      where: { name: dto.name.trim() },
    });
    if (existing) {
      throw new BadRequestException(`Nguyên liệu '${dto.name}' đã tồn tại trong kho`);
    }

    return this.prisma.ingredient.create({
      data: {
        name: dto.name.trim(),
        unit: dto.unit.trim(),
        stock: dto.stock ?? 0,
        minStockAlert: dto.minStockAlert ?? 100,
      },
    });
  }

  /**
   * Cập nhật thông tin nguyên liệu.
   */
  async updateIngredient(id: number, dto: Partial<CreateIngredientDto>) {
    const existing = await this.prisma.ingredient.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Không tìm thấy nguyên liệu #${id}`);
    }

    const updated = await this.prisma.ingredient.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name.trim() }),
        ...(dto.unit && { unit: dto.unit.trim() }),
        ...(dto.stock !== undefined && { stock: dto.stock }),
        ...(dto.minStockAlert !== undefined && { minStockAlert: dto.minStockAlert }),
      },
    });

    // Cập nhật lại số ly các món liên quan nếu stock thay đổi
    if (dto.stock !== undefined) {
      await this.recalculateProductsByIngredient(id);
    }

    return updated;
  }

  /**
   * Nhập hàng vào kho (Restock): tăng số lượng nguyên liệu và tự động tính lại số ly của menu.
   */
  async restockIngredient(id: number, amount: number) {
    if (amount <= 0) {
      throw new BadRequestException('Số lượng nhập kho phải lớn hơn 0');
    }

    const existing = await this.prisma.ingredient.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Không tìm thấy nguyên liệu #${id}`);
    }

    const updatedIngredient = await this.prisma.ingredient.update({
      where: { id },
      data: {
        stock: { increment: amount },
      },
    });

    // Tính lại số ly có thể làm của tất cả các món dùng nguyên liệu này
    const affectedProducts = await this.recalculateProductsByIngredient(id);

    return {
      ingredient: updatedIngredient,
      affectedProducts,
    };
  }

  /**
   * Lấy danh sách công thức của các món và số ly tối đa có thể làm từ kho hiện tại.
   */
  async findAllRecipes(): Promise<ProductRecipeDetail[]> {
    const products = await this.prisma.product.findMany({
      include: {
        recipes: {
          include: {
            ingredient: true,
          },
        },
      },
      orderBy: { id: 'asc' },
    });

    return products.map((product) => {
      if (!product.recipes || product.recipes.length === 0) {
        return {
          productId: product.id,
          productName: product.name,
          price: product.price,
          stock: product.stock,
          maxCups: product.stock,
          bottleneck: null,
          recipes: [],
        };
      }

      let maxCups = Number.MAX_SAFE_INTEGER;
      let bottleneck: BottleneckInfo | null = null;

      for (const r of product.recipes) {
        const limitingCups = Math.floor(r.ingredient.stock / r.amount);
        if (limitingCups < maxCups) {
          maxCups = limitingCups;
          bottleneck = {
            ingredientId: r.ingredient.id,
            ingredientName: r.ingredient.name,
            unit: r.ingredient.unit,
            currentStock: r.ingredient.stock,
            requiredAmount: r.amount,
            limitingCups,
          };
        }
      }

      const calculatedMaxCups = Math.max(0, maxCups === Number.MAX_SAFE_INTEGER ? product.stock : maxCups);

      return {
        productId: product.id,
        productName: product.name,
        price: product.price,
        stock: product.stock,
        maxCups: calculatedMaxCups,
        bottleneck,
        recipes: product.recipes.map((r) => ({
          id: r.id,
          ingredientId: r.ingredient.id,
          ingredientName: r.ingredient.name,
          unit: r.ingredient.unit,
          amount: r.amount,
          currentStock: r.ingredient.stock,
        })),
      };
    });
  }

  /**
   * Thiết lập / Sửa công thức pha chế cho một món.
   */
  async setProductRecipe(productId: number, dto: SaveRecipeDto) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      throw new NotFoundException(`Không tìm thấy sản phẩm #${productId}`);
    }

    return this.prisma.$transaction(async (tx) => {
      // Xóa công thức cũ
      await tx.recipeItem.deleteMany({
        where: { productId },
      });

      // Tạo công thức mới
      if (dto.items && dto.items.length > 0) {
        for (const item of dto.items) {
          const ing = await tx.ingredient.findUnique({ where: { id: item.ingredientId } });
          if (!ing) {
            throw new NotFoundException(`Không tìm thấy nguyên liệu #${item.ingredientId}`);
          }
          await tx.recipeItem.create({
            data: {
              productId,
              ingredientId: item.ingredientId,
              amount: item.amount,
            },
          });
        }
      }

      // Tính lại số ly cho món này
      const newStock = await this.calculateAndSetProductStock(productId, tx);

      return {
        productId,
        productName: product.name,
        newStock,
      };
    });
  }

  /**
   * Tính số ly tối đa của 1 sản phẩm dựa trên công thức và kho hiện tại, đồng thời cập nhật product.stock.
   */
  async calculateAndSetProductStock(productId: number, tx: any = this.prisma): Promise<number> {
    const recipes = await tx.recipeItem.findMany({
      where: { productId },
      include: { ingredient: true },
    });

    if (!recipes || recipes.length === 0) {
      const p = await tx.product.findUnique({ where: { id: productId } });
      return p?.stock ?? 0;
    }

    let minCups = Number.MAX_SAFE_INTEGER;
    for (const r of recipes) {
      const cups = Math.floor(r.ingredient.stock / r.amount);
      if (cups < minCups) {
        minCups = cups;
      }
    }

    const calculatedStock = Math.max(0, minCups === Number.MAX_SAFE_INTEGER ? 0 : minCups);

    await tx.product.update({
      where: { id: productId },
      data: {
        stock: calculatedStock,
      },
    });

    return calculatedStock;
  }

  /**
   * Cập nhật lại số ly của tất cả các món dùng chung nguyên liệu này.
   */
  async recalculateProductsByIngredient(ingredientId: number, tx: any = this.prisma) {
    const recipeItems = await tx.recipeItem.findMany({
      where: { ingredientId },
      select: { productId: true },
    });

    const productIds = Array.from(new Set(recipeItems.map((r: { productId: number }) => r.productId)));
    const updatedProducts: Array<{ productId: number; stock: number }> = [];

    for (const pid of productIds) {
      const stock = await this.calculateAndSetProductStock(pid as number, tx);
      updatedProducts.push({ productId: pid as number, stock });
    }

    return updatedProducts;
  }

  /**
   * Tính lại số ly của TOÀN BỘ sản phẩm có công thức.
   */
  async recalculateAllProductsStock(tx: any = this.prisma) {
    const productsWithRecipes = await tx.product.findMany({
      where: {
        recipes: {
          some: {},
        },
      },
      select: { id: true },
    });

    const results = [];
    for (const p of productsWithRecipes) {
      const stock = await this.calculateAndSetProductStock(p.id, tx);
      results.push({ productId: p.id, stock });
    }
    return results;
  }

  /**
   * Trừ kho nguyên liệu khi bán đơn hàng theo công thức, sau đó cập nhật lại số ly của tất cả các món liên quan.
   */
  async deductIngredientsForOrder(
    items: Array<{ productId: number; qty: number }>,
    tx: any,
  ) {
    // 1. Thu thập toàn bộ công thức cho các món trong đơn
    const productIds = Array.from(new Set(items.map((i) => i.productId)));
    const recipes = await tx.recipeItem.findMany({
      where: { productId: { in: productIds } },
      include: { ingredient: true, product: true },
    });

    // Nếu không món nào có công thức (ví dụ trong test case đơn giản), giữ nguyên flow cũ
    if (recipes.length === 0) {
      return;
    }

    // Nhóm công thức theo productId
    const recipeMap = new Map<number, typeof recipes>();
    for (const r of recipes) {
      if (!recipeMap.has(r.productId)) {
        recipeMap.set(r.productId, []);
      }
      recipeMap.get(r.productId)!.push(r);
    }

    // 2. Tính tổng lượng tiêu hao của từng nguyên liệu
    const ingredientDeductions = new Map<
      number,
      { ingredient: any; totalRequired: number; productName: string }
    >();

    for (const item of items) {
      const itemRecipes = recipeMap.get(item.productId);
      if (!itemRecipes || itemRecipes.length === 0) continue;

      for (const r of itemRecipes) {
        const required = r.amount * item.qty;
        if (!ingredientDeductions.has(r.ingredientId)) {
          ingredientDeductions.set(r.ingredientId, {
            ingredient: r.ingredient,
            totalRequired: 0,
            productName: r.product.name,
          });
        }
        ingredientDeductions.get(r.ingredientId)!.totalRequired += required;
      }
    }

    // 3. Kiểm tra xem kho có đủ từng nguyên liệu không
    for (const [ingredientId, deduction] of ingredientDeductions.entries()) {
      // Đọc số lượng kho mới nhất trong transaction
      const currentIng = await tx.ingredient.findUnique({
        where: { id: ingredientId },
      });

      if (!currentIng || currentIng.stock < deduction.totalRequired) {
        const currentStock = currentIng ? currentIng.stock : 0;
        const ingName = currentIng ? currentIng.name : deduction.ingredient.name;
        const unit = currentIng ? currentIng.unit : deduction.ingredient.unit;

        throw new BadRequestException(
          `Kho không đủ nguyên liệu '${ingName}'. Cần ${deduction.totalRequired}${unit}, nhưng kho chỉ còn ${currentStock}${unit}.`,
        );
      }
    }

    // 4. Trừ số lượng nguyên liệu trong kho
    const affectedIngredientIds: number[] = [];
    for (const [ingredientId, deduction] of ingredientDeductions.entries()) {
      await tx.ingredient.update({
        where: { id: ingredientId },
        data: {
          stock: { decrement: deduction.totalRequired },
        },
      });
      affectedIngredientIds.push(ingredientId);
    }

    // 5. Cập nhật lại số ly (product.stock) cho tất cả các món dùng các nguyên liệu vừa bị trừ
    const relatedRecipeItems = await tx.recipeItem.findMany({
      where: { ingredientId: { in: affectedIngredientIds } },
      select: { productId: true },
    });

    const affectedProductIds = Array.from(
      new Set(relatedRecipeItems.map((r: { productId: number }) => r.productId)),
    );

    for (const pid of affectedProductIds) {
      await this.calculateAndSetProductStock(pid as number, tx);
    }
  }

  /**
   * Hoàn lại nguyên liệu vào kho khi hủy đơn hàng.
   */
  async restoreIngredientsForOrder(orderId: number, tx: any) {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
      },
    });

    if (!order || !order.items || order.items.length === 0) return;

    const productIds = Array.from(new Set(order.items.map((i: any) => i.productId)));
    const recipes = await tx.recipeItem.findMany({
      where: { productId: { in: productIds } },
      include: { ingredient: true },
    });

    if (recipes.length === 0) return;

    const recipeMap = new Map<number, typeof recipes>();
    for (const r of recipes) {
      if (!recipeMap.has(r.productId)) recipeMap.set(r.productId, []);
      recipeMap.get(r.productId)!.push(r);
    }

    const restoredIngredientIds: number[] = [];

    for (const item of order.items) {
      const itemRecipes = recipeMap.get(item.productId);
      if (!itemRecipes) continue;

      for (const r of itemRecipes) {
        const restoreAmount = r.amount * item.qty;
        await tx.ingredient.update({
          where: { id: r.ingredientId },
          data: {
            stock: { increment: restoreAmount },
          },
        });
        restoredIngredientIds.push(r.ingredientId);
      }
    }

    // Cập nhật lại số ly cho các món liên quan
    const relatedRecipeItems = await tx.recipeItem.findMany({
      where: { ingredientId: { in: restoredIngredientIds } },
      select: { productId: true },
    });

    const affectedProductIds = Array.from(
      new Set(relatedRecipeItems.map((r: { productId: number }) => r.productId)),
    );

    for (const pid of affectedProductIds) {
      await this.calculateAndSetProductStock(pid as number, tx);
    }
  }
}
