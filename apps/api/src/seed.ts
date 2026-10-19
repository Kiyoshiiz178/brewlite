import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client.js';

const connectionString = process.env.DATABASE_URL || 'postgresql://brewlite:brewlite@localhost:5432/brewlite';
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function seed() {
  console.log('--- Đang khởi tạo dữ liệu mẫu (Seeding)... ---');

  // 1. Seed Products
  const products = [
    {
      name: 'Cà phê sữa đá',
      price: 35000,
      imageUrl: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=600&auto=format&fit=crop&q=80',
      stock: 50,
      version: 0,
    },
    {
      name: 'Americano',
      price: 40000,
      imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80',
      stock: 50,
      version: 0,
    },
    {
      name: 'Cappuccino',
      price: 45000,
      imageUrl: 'https://images.unsplash.com/photo-1534778101976-62847782c213?w=600&auto=format&fit=crop&q=80',
      stock: 50,
      version: 0,
    },
    {
      name: 'Trà đào cam sả',
      price: 39000,
      imageUrl: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&auto=format&fit=crop&q=80',
      stock: 50,
      version: 0,
    },
    {
      name: 'Bạc xỉu Sài Gòn',
      price: 38000,
      imageUrl: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=600&auto=format&fit=crop&q=80',
      stock: 50,
      version: 0,
    },
    {
      name: 'Trà sen vàng macchiato',
      price: 48000,
      imageUrl: 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?w=600&auto=format&fit=crop&q=80',
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
