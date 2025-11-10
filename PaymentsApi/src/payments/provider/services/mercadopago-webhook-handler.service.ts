import { Injectable, Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import {
  IWebhookHandler,
  WebhookData,
} from '../interfaces/webhook-handler.interface';
import { PaymentResult } from '../payment-provider.interface';
import { PaymentProviderService } from '../payment-provider.interface';

@Injectable()
export class MercadoPagoWebhookHandler implements IWebhookHandler {
  private readonly logger = new Logger(MercadoPagoWebhookHandler.name);
  private paymentProvider!: PaymentProviderService;

  constructor(private readonly moduleRef: ModuleRef) {}

  onModuleInit() {
    this.paymentProvider = this.moduleRef.get(PaymentProviderService, {
      strict: false,
    });
  }

  async handleWebhook(webhookData: WebhookData): Promise<PaymentResult | null> {
    const rawEvent = String(
      webhookData.action ?? webhookData.type ?? '',
    ).toLowerCase();
    const id = (webhookData?.data?.id ?? webhookData?.id)?.toString();

    // 👇 pruebas del dashboard o simulaciones
    if (webhookData.live_mode === false) {
      this.logger.warn(`Ignoring test webhook ${rawEvent} id=${id}`);
      return null; // el controller responde 200
    }

    if (rawEvent === 'payment' || rawEvent.startsWith('payment.')) {
      if (!id) return null;
      return this.paymentProvider.getPaymentStatus(id);
    }

    if (rawEvent === 'merchant_order') {
      if (!id) return null;
      return this.paymentProvider.getPaymentStatusByMerchantOrder?.(id) ?? null;
    }

    this.logger.warn(`Webhook event ${rawEvent} no soportado`);
    return null;
  }

  verifyWebhookSignature(): boolean {
    return true;
  }
}
