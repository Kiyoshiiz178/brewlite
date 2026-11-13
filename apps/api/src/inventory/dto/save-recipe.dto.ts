import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsNumber, Min, ValidateNested } from 'class-validator';

export class RecipeItemInputDto {
  @IsNumber()
  @IsNotEmpty()
  ingredientId: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  amount: number;
}

export class SaveRecipeDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecipeItemInputDto)
  items: RecipeItemInputDto[];
}
