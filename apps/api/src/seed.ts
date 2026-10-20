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

  console.log('--- Hoàn tất seeding dữ liệu mẫu! ---');
  await prisma.$disconnect();
}

seed().catch((err) => {
  console.error('Lỗi khi seed:', err);
  process.exit(1);
});
