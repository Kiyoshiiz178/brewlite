import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOrderItemDto {
  @IsInt({ message: 'productId phải là số nguyên' })
  @Min(1, { message: 'productId không hợp lệ' })
  productId!: number;

  @IsString({ message: 'size phải là chuỗi' })
  @IsNotEmpty({ message: 'size không được để trống' })
  size!: string; // 'S' | 'M' | 'L'

  @IsInt({ message: 'qty phải là số nguyên' })
  @Min(1, { message: 'qty phải ít nhất là 1' })
  qty!: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  toppings?: string[];
}

export class CreateOrderDto {
  @IsArray({ message: 'items phải là danh sách' })
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];

  @IsOptional()
  @IsString({ message: 'promoCode phải là chuỗi' })
  promoCode?: string;
}

export class UpdateOrderStatusDto {
  @IsString({ message: 'status phải là chuỗi' })
  @IsNotEmpty({ message: 'status không được để trống' })
  status!: string;
}
