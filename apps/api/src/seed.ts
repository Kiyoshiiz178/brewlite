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

  // DỌN DẸP TRIỆT ĐỂ CÁC MÓN BỊ TRÙNG LẶP DO LỊCH SỬ CŨ:
  // 1. Gộp 'Cà phê sữa' vào 'Cà phê sữa đá'
  const caPheSuaDa = await prisma.product.findFirst({ where: { name: 'Cà phê sữa đá' } });
  const caPheSua = await prisma.product.findFirst({ where: { name: 'Cà phê sữa' } });
  if (caPheSua && caPheSuaDa) {
    await prisma.orderItem.updateMany({
      where: { productId: caPheSua.id },
      data: { productId: caPheSuaDa.id },
    });
    await prisma.recipeItem.deleteMany({ where: { productId: caPheSua.id } });
    await prisma.product.delete({ where: { id: caPheSua.id } });
    console.log('✓ Đã dọn dẹp món trùng lặp: "Cà phê sữa" -> hợp nhất vào "Cà phê sữa đá"');
  }

  // 2. Gộp 'Trà đào' vào 'Trà đào cam sả'
  const traDaoCamSa = await prisma.product.findFirst({ where: { name: 'Trà đào cam sả' } });
  const traDao = await prisma.product.findFirst({ where: { name: 'Trà đào' } });
  if (traDao && traDaoCamSa) {
    await prisma.orderItem.updateMany({
      where: { productId: traDao.id },
      data: { productId: traDaoCamSa.id },
    });
    await prisma.recipeItem.deleteMany({ where: { productId: traDao.id } });
    await prisma.product.delete({ where: { id: traDao.id } });
    console.log('✓ Đã dọn dẹp món trùng lặp: "Trà đào" -> hợp nhất vào "Trà đào cam sả"');
  }

  // 1. Seed Products: 12 món thực đơn tuyển chọn, rõ ràng, không trùng lặp
  const products = [
    // NHÓM 1: CÀ PHÊ & ESPRESSO
    {
      name: 'Cà phê sữa đá',
      price: 35000,
      imageUrl: '/drinks/ca-phe-sua-da.jpg',
      stock: 50,
      version: 0,
    },
    {
      name: 'Cà phê đen đá',
      price: 30000,
      imageUrl: '/drinks/ca-phe-den-da.jpg',
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
      name: 'Cà phê muối kem béo',
      price: 42000,
      imageUrl: '/drinks/ca-phe-muoi.jpg',
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

    // NHÓM 2: TRÀ TRÁI CÂY TƯƠI
    {
      name: 'Trà đào cam sả',
      price: 39000,
      imageUrl: '/drinks/tra-dao-cam-sa.jpg',
      stock: 50,
      version: 0,
    },
    {
      name: 'Trà vải hoa hồng',
      price: 42000,
      imageUrl: '/drinks/tra-vai-hoa-hong.jpg',
      stock: 50,
      version: 0,
    },
    {
      name: 'Trà dâu tây ổi hồng',
      price: 42000,
      imageUrl: '/drinks/tra-dau-oi-hong.jpg',
      stock: 50,
      version: 0,
    },

    // NHÓM 3: TRÀ SỮA & MACCHIATO ĐẶC BIỆT
    {
      name: 'Trà sen vàng macchiato',
      price: 48000,
      imageUrl: '/drinks/tra-sen-vang.jpg',
      stock: 50,
      version: 0,
    },
    {
      name: 'Matcha latte Nhật Bản',
      price: 48000,
      imageUrl: '/drinks/matcha-latte.jpg',
      stock: 50,
      version: 0,
    },
    {
      name: 'Trà sữa Oolong nướng',
      price: 45000,
      imageUrl: '/drinks/tra-sua-oolong.jpg',
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
    { name: 'Hạt cà phê Robusta', unit: 'g', stock: 3500, minStockAlert: 200 },
    { name: 'Sữa đặc Ông Thọ', unit: 'ml', stock: 4000, minStockAlert: 250 },
    { name: 'Sữa tươi tiệt trùng', unit: 'ml', stock: 7000, minStockAlert: 500 },
    { name: 'Trà đen hảo hạng', unit: 'g', stock: 2500, minStockAlert: 150 },
    { name: 'Trà Oolong nướng', unit: 'g', stock: 2000, minStockAlert: 150 },
    { name: 'Bột Matcha Uji', unit: 'g', stock: 1200, minStockAlert: 100 },
    { name: 'Syrup đào', unit: 'ml', stock: 1500, minStockAlert: 120 },
    { name: 'Syrup vải & hoa hồng', unit: 'ml', stock: 1500, minStockAlert: 120 },
    { name: 'Mứt dâu tây & ổi', unit: 'ml', stock: 1500, minStockAlert: 120 },
    { name: 'Syrup đường', unit: 'ml', stock: 3000, minStockAlert: 200 },
    { name: 'Hạt sen ngâm', unit: 'g', stock: 1200, minStockAlert: 100 },
    { name: 'Kem béo Macchiato', unit: 'ml', stock: 1500, minStockAlert: 100 },
    { name: 'Kem muối biển', unit: 'ml', stock: 1200, minStockAlert: 100 },
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

  // 4. Seed Công thức pha chế (Recipes) cho toàn bộ 12 món
  const recipeDefinitions: Record<string, Array<{ ingredientName: string; amount: number }>> = {
    'Cà phê sữa đá': [
      { ingredientName: 'Hạt cà phê Robusta', amount: 25 },
      { ingredientName: 'Sữa đặc Ông Thọ', amount: 30 },
      { ingredientName: 'Syrup đường', amount: 10 },
    ],
    'Cà phê đen đá': [
      { ingredientName: 'Hạt cà phê Robusta', amount: 25 },
      { ingredientName: 'Syrup đường', amount: 15 },
    ],
    'Bạc xỉu Sài Gòn': [
      { ingredientName: 'Hạt cà phê Robusta', amount: 15 },
      { ingredientName: 'Sữa tươi tiệt trùng', amount: 60 },
      { ingredientName: 'Sữa đặc Ông Thọ', amount: 40 },
    ],
    'Cà phê muối kem béo': [
      { ingredientName: 'Hạt cà phê Robusta', amount: 25 },
      { ingredientName: 'Sữa đặc Ông Thọ', amount: 20 },
      { ingredientName: 'Kem muối biển', amount: 35 },
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
    'Trà vải hoa hồng': [
      { ingredientName: 'Trà đen hảo hạng', amount: 15 },
      { ingredientName: 'Syrup vải & hoa hồng', amount: 35 },
      { ingredientName: 'Syrup đường', amount: 15 },
    ],
    'Trà dâu tây ổi hồng': [
      { ingredientName: 'Trà đen hảo hạng', amount: 15 },
      { ingredientName: 'Mứt dâu tây & ổi', amount: 40 },
      { ingredientName: 'Syrup đường', amount: 15 },
    ],
    'Trà sen vàng macchiato': [
      { ingredientName: 'Trà đen hảo hạng', amount: 15 },
      { ingredientName: 'Hạt sen ngâm', amount: 40 },
      { ingredientName: 'Kem béo Macchiato', amount: 30 },
    ],
    'Matcha latte Nhật Bản': [
      { ingredientName: 'Bột Matcha Uji', amount: 15 },
      { ingredientName: 'Sữa tươi tiệt trùng', amount: 120 },
      { ingredientName: 'Syrup đường', amount: 20 },
    ],
    'Trà sữa Oolong nướng': [
      { ingredientName: 'Trà Oolong nướng', amount: 20 },
      { ingredientName: 'Sữa tươi tiệt trùng', amount: 80 },
      { ingredientName: 'Sữa đặc Ông Thọ', amount: 30 },
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
