import { Module } from '@nestjs/common';
import { PromotionsService } from './promotions.service.js';
import { PromotionsController } from './promotions.controller.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [PromotionsController],
  providers: [PromotionsService],
  exports: [PromotionsService],
})
export class PromotionsModule {}
