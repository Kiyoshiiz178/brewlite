import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreatePaymentDto {
  @IsInt({ message: 'orderId phải là số nguyên' })
  orderId!: number;

  @IsString({ message: 'idempotencyKey phải là chuỗi' })
  @IsNotEmpty({ message: 'idempotencyKey không được để trống' })
  idempotencyKey!: string;

  @IsInt({ message: 'amount phải là số nguyên' })
  @Min(0, { message: 'amount không được nhỏ hơn 0' })
  amount!: number;

  @IsString({ message: 'method phải là chuỗi' })
  @IsIn(['WALLET', 'CARD'], {
    message: 'method phải là WALLET (Ví điện tử) hoặc CARD (Thẻ ngân hàng)',
  })
  method!: string;

  @IsOptional()
  @IsBoolean()
  mockFailed?: boolean;
}

export class MockWebhookDto {
  @IsInt({ message: 'orderId phải là số nguyên' })
  orderId!: number;

  @IsString({ message: 'idempotencyKey phải là chuỗi' })
  @IsNotEmpty({ message: 'idempotencyKey không được để trống' })
  idempotencyKey!: string;

  @IsInt({ message: 'amount phải là số nguyên' })
  @Min(0, { message: 'amount không được nhỏ hơn 0' })
  amount!: number;

  @IsString({ message: 'method phải là chuỗi' })
  @IsIn(['WALLET', 'CARD'], {
    message: 'method phải là WALLET hoặc CARD',
  })
  method!: string;

  @IsString({ message: 'status phải là chuỗi' })
  @IsIn(['SUCCESS', 'FAILED'], {
    message: 'status phải là SUCCESS hoặc FAILED',
  })
  status!: 'SUCCESS' | 'FAILED';

  @IsOptional()
  @IsString()
  gatewayRef?: string;
}

