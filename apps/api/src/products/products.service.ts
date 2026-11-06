import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';

export function normalizeDrinkName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function areNamesConfusinglySimilar(name1: string, name2: string): boolean {
  const n1 = normalizeDrinkName(name1);
  const n2 = normalizeDrinkName(name2);
  if (n1 === n2) return true;

  const words1 = n1.split(' ').filter(Boolean);
  const words2 = n2.split(' ').filter(Boolean);
  const set1 = new Set(words1);
  const set2 = new Set(words2);
  const intersection = [...set1].filter((w) => set2.has(w));
  const minWords = Math.min(set1.size, set2.size);

  // Nếu một tên là tập con từ ngữ của tên kia và tên ngắn có từ 2 từ trở lên
  // ví dụ: "cà phê sữa" vs "cà phê sữa đá", hoặc "trà đào" vs "trà đào cam sả"
  if (minWords >= 2 && intersection.length === minWords) {
    return true;
  }

  return false;
}

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  private async validateStrictMenu(name: string, excludeId?: number) {
    const trimmed = name.trim();
    if (!trimmed) {
      throw new BadRequestException('Tên thức uống không được để trống');
    }

    const allProducts = await this.prisma.product.findMany({
      where: excludeId ? { id: { not: excludeId } } : undefined,
    });

    for (const p of allProducts) {
      if (areNamesConfusinglySimilar(trimmed, p.name)) {
        throw new BadRequestException(
          `Tên thức uống "${trimmed}" bị trùng hoặc quá tương tự với món "${p.name}" đã có trong thực đơn. Vui lòng kiểm tra lại!`,
        );
      }
    }
  }

  async create(createProductDto: CreateProductDto) {
    await this.validateStrictMenu(createProductDto.name);

    return this.prisma.product.create({
      data: {
        name: createProductDto.name.trim(),
        price: createProductDto.price,
        imageUrl: createProductDto.imageUrl,
        stock: createProductDto.stock ?? 0,
        version: 0,
      },
    });
  }

  findAll() {
    return this.prisma.product.findMany();
  }

  async findOne(id: number) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException(`Không tìm thấy sản phẩm #${id}`);
    }
    return product;
  }

  async update(id: number, updateProductDto: UpdateProductDto) {
    await this.findOne(id);

    if (updateProductDto.name) {
      await this.validateStrictMenu(updateProductDto.name, id);
    }

    return this.prisma.product.update({
      where: { id },
      data: {
        ...updateProductDto,
        ...(updateProductDto.name ? { name: updateProductDto.name.trim() } : {}),
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.product.delete({
      where: { id },
    });
  }
}