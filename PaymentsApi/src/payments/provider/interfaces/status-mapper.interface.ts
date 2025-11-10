import { PaymentStatus } from '../../../common/enums/payment-status.enum';

export interface IStatusMapper {
  mapToInternalStatus(externalStatus: string | undefined): PaymentStatus;
  mapPaymentMethod(internalMethod: string): string;
  isSuccessStatus(status: string | null | undefined): boolean;
}

export const STATUS_MAPPER_TOKEN = Symbol('IStatusMapper');
