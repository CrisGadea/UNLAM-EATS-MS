import { Injectable, Logger } from '@nestjs/common';
import { IStatusMapper } from '../interfaces/status-mapper.interface';
import { PaymentStatus } from '../../../common/enums/payment-status.enum';

@Injectable()
export class MercadoPagoStatusMapper implements IStatusMapper {
  private readonly logger = new Logger(MercadoPagoStatusMapper.name);

  mapToInternalStatus(externalStatus: string | undefined): PaymentStatus {
    switch (externalStatus) {
      case 'approved':
        return PaymentStatus.SUCCEEDED;
      case 'pending':
        return PaymentStatus.PENDING;
      case 'rejected':
      case 'cancelled':
        return PaymentStatus.FAILED;
      default:
        this.logger.warn(`Unknown MercadoPago status: ${externalStatus}`);
        return PaymentStatus.FAILED;
    }
  }

  mapPaymentMethod(internalMethod: string): string {
    const methodMap: Record<string, string> = {
      credit_card: 'visa',
      debit_card: 'visa_debit',
      cash: 'rapipago',
      bank_transfer: 'pix',
    };

    return methodMap[internalMethod] || 'visa';
  }

  isSuccessStatus(status: string | null | undefined): boolean {
    return status === 'approved';
  }
}
