import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { InventoryService } from './inventory.service.js';
import { CreateIngredientDto } from './dto/create-ingredient.dto.js';
import { RestockIngredientDto } from './dto/restock-ingredient.dto.js';
import { SaveRecipeDto } from './dto/save-recipe.dto.js';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('ingredients')
  findAllIngredients() {
    return this.inventoryService.findAllIngredients();
  }

  @Post('ingredients')
  createIngredient(@Body() dto: CreateIngredientDto) {
    return this.inventoryService.createIngredient(dto);
  }

  @Patch('ingredients/:id')
  updateIngredient(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<CreateIngredientDto>,
  ) {
    return this.inventoryService.updateIngredient(id, dto);
  }

  @Patch('ingredients/:id/restock')
  restockIngredient(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RestockIngredientDto,
  ) {
    return this.inventoryService.restockIngredient(id, dto.amount);
  }

  @Get('recipes')
  findAllRecipes() {
    return this.inventoryService.findAllRecipes();
  }

  @Post('recipes/:productId')
  setProductRecipe(
    @Param('productId', ParseIntPipe) productId: number,
    @Body() dto: SaveRecipeDto,
  ) {
    return this.inventoryService.setProductRecipe(productId, dto);
  }

  @Post('recalculate-all')
  recalculateAll() {
    return this.inventoryService.recalculateAllProductsStock();
  }
}
