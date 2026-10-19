import { Controller, Get, Query } from '@nestjs/common';
import { PromotionsService } from './promotions.service.js';

@Controller('promotions')
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Get('validate')
  validate(@Query('code') code: string) {
    return this.promotionsService.validateCode(code);
  }

  @Get()
  findAll() {
    return this.promotionsService.findAll();
  }
}
