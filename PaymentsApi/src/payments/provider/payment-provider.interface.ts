import { PaymentStatus } from 'src/common/enums/payment-status.enum';
import { PreferenceResponse } from 'mercadopago/dist/clients/preference/commonTypes';

export type MercadoPagoPaymentResponse = {
  id: string;
  initPoint?: string;
  sandboxInitPoint: string | undefined;
  raw: PreferenceResponse;
};

export interface PaymentRequest {
  id: string;
  amountCents: number;
  currency: string;
  method: string;
  orderId: string;
  description?: string;
}

export interface PaymentResult {
  success: boolean;
  providerTransactionId: string;
  status: PaymentStatus;
  error?: string;
  preferenceId?: string;
  externalReference?: string;
  merchantOrderId?: string | number;
}

export abstract class PaymentProviderService {
  abstract getPaymentStatus(providerRef: string): Promise<PaymentResult>;
  abstract createPreference(
    items: {
      title: string;
      unit_price: number;
      quantity?: number;
      currency?: string;
    }[],
    externalReference: string,
  ): Promise<MercadoPagoPaymentResponse>;

  getMerchantOrder(_merchantOrderId: string): Promise<unknown> {
    console.log(_merchantOrderId);
    return Promise.reject(
      new Error('getMerchantOrder not implemented for this provider'),
    );
  }

  getPaymentStatusByMerchantOrder(
    _merchantOrderId: string,
  ): Promise<PaymentResult | null> {
    console.log(_merchantOrderId);
    return Promise.resolve(null);
  }
}
