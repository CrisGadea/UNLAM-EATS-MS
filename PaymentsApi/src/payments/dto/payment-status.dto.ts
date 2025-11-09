import { IsEnum } from 'class-validator';
import { PaymentStatus } from 'src/common/enums/payment-status.enum';

export class PaymentStatusDto {
  @IsEnum(PaymentStatus)
  status: string;
}
