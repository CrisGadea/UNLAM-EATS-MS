import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  IsPositive,
  IsString,
  IsNotEmpty,
  IsIn,
  IsOptional,
  IsInt,
} from 'class-validator';

export class CreatePaymentDto {
  @ApiProperty({
    description: 'ID of the order associated with the payment',
    example: 1,
  })
  @IsNumber()
  @IsNotEmpty()
  orderId: number;

  @IsNumber()
  @IsNotEmpty()
  userId: number;

  @IsNumber()
  @IsPositive()
  @IsInt()
  amountCents: number;

  @IsIn(['ARS', 'EUR', 'USD'])
  currency: 'ARS' | 'EUR' | 'USD';

  @IsString()
  @IsIn(['card', 'cash', 'transfer', 'pix'])
  method: 'card' | 'cash' | 'transfer' | 'pix';

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  provider: string;
}
