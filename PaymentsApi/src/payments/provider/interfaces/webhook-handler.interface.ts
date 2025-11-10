import { PaymentResult } from '../payment-provider.interface';

export interface WebhookData {
  id?: string;
  live_mode?: boolean;
  type?: string;
  date_created?: string;
  application_id?: string;
  user_id?: string;
  version?: string;
  api_version?: string;
  action?: string;
  data?: {
    id?: string;
  };
}

export interface IWebhookHandler {
  handleWebhook(webhookData: WebhookData): Promise<PaymentResult | null>;
  verifyWebhookSignature(
    payload: string,
    signature: string,
    secret: string,
  ): boolean;
}

export const WEBHOOK_HANDLER_TOKEN = Symbol('IWebhookHandler');
