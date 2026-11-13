import { IsNotEmpty, IsNumber, Min } from 'class-validator';

export class RestockIngredientDto {
  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  amount: number;
}
