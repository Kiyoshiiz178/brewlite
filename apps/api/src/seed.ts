import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client.js';

const connectionString = process.env.DATABASE_URL || 'postgresql://brewlite:brewlite@localhost:5432/brewlite';
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function seed() {
  console.log('--- Đang khởi tạo dữ liệu mẫu (Seeding)... ---');

  // Dọn dẹp các sản phẩm test nếu có
  await prisma.orderItem.deleteMany({
    where: {
      OR: [
        { product: { name: { startsWith: 'Test Product' } } },
        { product: { name: { startsWith: 'Limited Drink' } } },
        { product: { name: { startsWith: 'Promo Product' } } },
      ],
    },
  });

  await prisma.product.deleteMany({
    where: {
      OR: [
        { name: { startsWith: 'Test Product' } },
        { name: { startsWith: 'Limited Drink' } },
        { name: { startsWith: 'Promo Product' } },
      ],
    },
  });

  // 1. Seed Products (Hình ảnh chuẩn đẹp từ /drinks/ nội bộ)
  const products = [
    {
      name: 'Cà phê sữa đá',
      price: 35000,
      imageUrl: '/drinks/ca-phe-sua-da.jpg',
      stock: 50,
      version: 0,
    },
    {
      name: 'Cà phê sữa',
      price: 35000,
      imageUrl: '/drinks/ca-phe-sua-da.jpg',
      stock: 50,
      version: 0,
    },
    {
      name: 'Americano',
      price: 40000,
      imageUrl: '/drinks/americano.jpg',
      stock: 50,
      version: 0,
    },
    {
      name: 'Cappuccino',
      price: 45000,
      imageUrl: '/drinks/cappuccino.jpg',
      stock: 50,
      version: 0,
    },
    {
      name: 'Trà đào cam sả',
      price: 39000,
      imageUrl: '/drinks/tra-dao-cam-sa.jpg',
      stock: 50,
      version: 0,
    },
    {
      name: 'Trà đào',
      price: 39000,
      imageUrl: '/drinks/tra-dao-cam-sa.jpg',
      stock: 50,
      version: 0,
    },
    {
      name: 'Bạc xỉu Sài Gòn',
      price: 38000,
      imageUrl: '/drinks/bac-xiu.jpg',
      stock: 50,
      version: 0,
    },
    {
      name: 'Trà sen vàng macchiato',
      price: 48000,
      imageUrl: '/drinks/tra-sen-vang.jpg',
      stock: 50,
      version: 0,
    },
  ];

  for (const p of products) {
    const existing = await prisma.product.findFirst({ where: { name: p.name } });
    if (!existing) {
      await prisma.product.create({ data: p });
      console.log(`Đã tạo sản phẩm: ${p.name}`);
    } else {
      await prisma.product.update({
        where: { id: existing.id },
        data: { price: p.price, imageUrl: p.imageUrl, stock: p.stock },
      });
      console.log(`Đã cập nhật sản phẩm: ${p.name}`);
    }
  }

  // 2. Seed Promotions
  const promotions = [
    { code: 'BREW10', discountPct: 10, isActive: true },
    { code: 'WELCOME20', discountPct: 20, isActive: true },
  ];

  for (const promo of promotions) {
    const existing = await prisma.promotion.findUnique({ where: { code: promo.code } });
    if (!existing) {
      await prisma.promotion.create({ data: promo });
      console.log(`Đã tạo mã khuyến mãi: ${promo.code} (-${promo.discountPct}%)`);
    }
  }

  // 3. Seed Kho Nguyên Liệu (Ingredients)
  const ingredients = [
    { name: 'Hạt cà phê Robusta', unit: 'g', stock: 2000, minStockAlert: 200 },
    { name: 'Sữa đặc Ông Thọ', unit: 'ml', stock: 2500, minStockAlert: 250 },
    { name: 'Sữa tươi tiệt trùng', unit: 'ml', stock: 5000, minStockAlert: 500 },
    { name: 'Trà đen hảo hạng', unit: 'g', stock: 1500, minStockAlert: 150 },
    { name: 'Syrup đào', unit: 'ml', stock: 1200, minStockAlert: 120 },
    { name: 'Syrup đường', unit: 'ml', stock: 2000, minStockAlert: 200 },
    { name: 'Hạt sen ngâm', unit: 'g', stock: 1000, minStockAlert: 100 },
    { name: 'Kem béo Macchiato', unit: 'ml', stock: 1000, minStockAlert: 100 },
  ];

  const ingredientMap = new Map<string, number>();

  for (const ing of ingredients) {
    const existing = await prisma.ingredient.findUnique({ where: { name: ing.name } });
    if (!existing) {
      const created = await prisma.ingredient.create({ data: ing });
      ingredientMap.set(ing.name, created.id);
      console.log(`Đã tạo nguyên liệu kho: ${ing.name} (${ing.stock} ${ing.unit})`);
    } else {
      const updated = await prisma.ingredient.update({
        where: { id: existing.id },
        data: { unit: ing.unit, stock: ing.stock, minStockAlert: ing.minStockAlert },
      });
      ingredientMap.set(ing.name, updated.id);
      console.log(`Đã cập nhật nguyên liệu kho: ${ing.name} (${ing.stock} ${ing.unit})`);
    }
  }

  // 4. Seed Công thức pha chế (Recipes)
  const recipeDefinitions: Record<string, Array<{ ingredientName: string; amount: number }>> = {
    'Cà phê sữa đá': [
      { ingredientName: 'Hạt cà phê Robusta', amount: 25 },
      { ingredientName: 'Sữa đặc Ông Thọ', amount: 30 },
      { ingredientName: 'Syrup đường', amount: 10 },
    ],
    'Cà phê sữa': [
      { ingredientName: 'Hạt cà phê Robusta', amount: 25 },
      { ingredientName: 'Sữa đặc Ông Thọ', amount: 30 },
      { ingredientName: 'Syrup đường', amount: 10 },
    ],
    'Americano': [
      { ingredientName: 'Hạt cà phê Robusta', amount: 25 },
      { ingredientName: 'Syrup đường', amount: 10 },
    ],
    'Cappuccino': [
      { ingredientName: 'Hạt cà phê Robusta', amount: 20 },
      { ingredientName: 'Sữa tươi tiệt trùng', amount: 120 },
    ],
    'Trà đào cam sả': [
      { ingredientName: 'Trà đen hảo hạng', amount: 15 },
      { ingredientName: 'Syrup đào', amount: 30 },
      { ingredientName: 'Syrup đường', amount: 20 },
    ],
    'Trà đào': [
      { ingredientName: 'Trà đen hảo hạng', amount: 15 },
      { ingredientName: 'Syrup đào', amount: 30 },
      { ingredientName: 'Syrup đường', amount: 20 },
    ],
    'Bạc xỉu Sài Gòn': [
      { ingredientName: 'Hạt cà phê Robusta', amount: 15 },
      { ingredientName: 'Sữa tươi tiệt trùng', amount: 60 },
      { ingredientName: 'Sữa đặc Ông Thọ', amount: 40 },
    ],
    'Trà sen vàng macchiato': [
      { ingredientName: 'Trà đen hảo hạng', amount: 15 },
      { ingredientName: 'Hạt sen ngâm', amount: 40 },
      { ingredientName: 'Kem béo Macchiato', amount: 30 },
    ],
  };

  for (const [prodName, reqs] of Object.entries(recipeDefinitions)) {
    const prod = await prisma.product.findFirst({ where: { name: prodName } });
    if (!prod) continue;

    // Xóa công thức cũ
    await prisma.recipeItem.deleteMany({ where: { productId: prod.id } });

    let minCups = Number.MAX_SAFE_INTEGER;
    for (const req of reqs) {
      const ingId = ingredientMap.get(req.ingredientName);
      if (!ingId) continue;

      await prisma.recipeItem.create({
        data: {
          productId: prod.id,
          ingredientId: ingId,
          amount: req.amount,
        },
      });

      const ing = ingredients.find((i) => i.name === req.ingredientName);
      if (ing) {
        const cups = Math.floor(ing.stock / req.amount);
        if (cups < minCups) minCups = cups;
      }
    }

    const calculatedStock = minCups === Number.MAX_SAFE_INTEGER ? 50 : Math.max(0, minCups);
    await prisma.product.update({
      where: { id: prod.id },
      data: { stock: calculatedStock },
    });
    console.log(`Đã cấu hình công thức cho '${prodName}': số ly có thể làm từ kho = ${calculatedStock}`);
  }

  console.log('--- Hoàn tất seeding dữ liệu mẫu! ---');
  await prisma.$disconnect();
}

seed().catch((err) => {
  console.error('Lỗi khi seed:', err);
  process.exit(1);
});
