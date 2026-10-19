import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class PromotionsService {
  constructor(private readonly prisma: PrismaService) {}

  async validateCode(code: string) {
    if (!code) {
      throw new BadRequestException('Mã khuyến mãi không được để trống');
    }

    const promo = await this.prisma.promotion.findUnique({
      where: { code: code.trim().toUpperCase() },
    });

    if (!promo || !promo.isActive) {
      throw new BadRequestException('Mã khuyến mãi không tồn tại hoặc đã hết hiệu lực');
    }

    return {
      valid: true,
      code: promo.code,
      discountPct: promo.discountPct,
    };
  }

  async findAll() {
    return this.prisma.promotion.findMany({
      where: { isActive: true },
    });
  }
}
