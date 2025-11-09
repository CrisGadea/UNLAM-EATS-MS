import { Module, forwardRef } from '@nestjs/common';
import { MercadoPagoWebhookHandler } from '../payments/provider/services/mercadopago-webhook-handler.service';
import { PaymentsModule } from '../payments/payments.module';
import { WebhooksController } from './controllers/webhooks.controller';

@Module({
  imports: [forwardRef(() => PaymentsModule)],
  controllers: [WebhooksController],
  providers: [MercadoPagoWebhookHandler],
  exports: [MercadoPagoWebhookHandler],
})
export class WebhooksModule {}
