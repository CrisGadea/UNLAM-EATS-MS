import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MercadoPagoConfig, Payment, Preference } from 'mercadopago';
import {
  MercadoPagoPaymentResponse,
  PaymentProviderService,
  PaymentResult,
} from './payment-provider.interface';
import {
  STATUS_MAPPER_TOKEN,
  type IStatusMapper,
} from './interfaces/status-mapper.interface';
import {
  WEBHOOK_HANDLER_TOKEN,
  type IWebhookHandler,
} from './interfaces/webhook-handler.interface';
import {
  PreferenceRequest,
  PreferenceResponse,
} from 'mercadopago/dist/clients/preference/commonTypes';

// type MpPayment = {
//   id: number | string;
//   status: string;
//   status_detail?: string;
// };

type MpPaymentLite = { id?: number | string; status?: string };
type MpPaymentSearchResp = { results?: MpPaymentLite[] };
type MpMerchantOrder = {
  id: string | number;
  external_reference?: string;
  payments?: MpPaymentLite[];
};

// Helpers de tipado seguro para el SDK y para errores
type MpPaymentGet = {
  id?: string | number;
  status?: string;
  status_detail?: string;
  external_reference?: string;
  preference_id?: string;
  order?: { id?: string | number };
  merchant_order_id?: string | number;
};

function isMpPaymentGet(x: unknown): x is MpPaymentGet {
  return typeof x === 'object' && x !== null;
}

type MpSdkError = {
  status?: number;
  message?: string;
  error?: string;
  cause?: unknown;
};
function isMpSdkError(e: unknown): e is MpSdkError {
  return (
    typeof e === 'object' &&
    e !== null &&
    ('status' in e || 'message' in e || 'error' in e)
  );
}

@Injectable()
export class MercadoPagoProvider extends PaymentProviderService {
  private readonly logger = new Logger(MercadoPagoProvider.name);
  private mercadopago: MercadoPagoConfig;
  private payment: Payment;

  constructor(
    private readonly configService: ConfigService,
    @Inject(STATUS_MAPPER_TOKEN)
    private readonly statusMapper: IStatusMapper,
    @Inject(WEBHOOK_HANDLER_TOKEN)
    private readonly webhookHandler: IWebhookHandler,
  ) {
    super();

    const accessToken = this.configService.get<string>(
      'MERCADOPAGO_ACCESS_TOKEN',
    );
    if (!accessToken)
      throw new Error(
        'MERCADOPAGO_ACCESS_TOKEN is required but not configured',
      );

    this.mercadopago = new MercadoPagoConfig({
      accessToken,
      options: { timeout: 5000 },
    });
    this.payment = new Payment(this.mercadopago);
  }

  private get accessToken(): string {
    return this.configService.get<string>('MERCADOPAGO_ACCESS_TOKEN')!;
  }

  // 2) Implementación sin any/unsafe
  async getPaymentStatus(externalId: string): Promise<PaymentResult> {
    try {
      const respUnknown = await this.payment.get({ id: externalId });
      if (!isMpPaymentGet(respUnknown)) {
        // Respuesta inesperada del SDK
        this.logger.warn('Unexpected MP response shape', { resp: respUnknown });
        return {
          success: false,
          providerTransactionId: externalId,
          status: this.statusMapper.mapToInternalStatus('in_process'),
          error: 'unexpected_mp_response',
        };
      }

      const statusStr = respUnknown.status ?? 'in_process';
      // Resp has been checked with isMpPaymentGet -> cast to our safe type
      const payment = respUnknown as MpPaymentGet;

      return {
        success: this.statusMapper.isSuccessStatus(statusStr),
        providerTransactionId: String(payment.id ?? externalId),
        status: this.statusMapper.mapToInternalStatus(statusStr),
        error:
          statusStr === 'rejected'
            ? payment.status_detail || 'Payment rejected'
            : undefined,
        preferenceId: payment.preference_id ?? undefined,
        externalReference: payment.external_reference ?? undefined,
        merchantOrderId:
          payment.order?.id ?? payment.merchant_order_id ?? undefined,
      };
    } catch (err: unknown) {
      if (isMpSdkError(err) && err.status === 404) {
        this.logger.warn(
          `Payment ${externalId} not found for current token (404)`,
        );
        return {
          success: false,
          providerTransactionId: externalId,
          status: this.statusMapper.mapToInternalStatus('in_process'),
          error: 'payment_not_found_for_token',
        };
      }
      const details = isMpSdkError(err)
        ? JSON.stringify({
            status: err.status,
            message: err.message,
            error: err.error,
            cause: err.cause,
          })
        : String(err);
      this.logger.error(
        `Failed to get payment status for ${externalId}: ${details}`,
      );
      throw new Error(`Failed to get payment status: ${details}`);
    }
  }

  async handleWebhook(webhookData: {
    id?: string;
    live_mode?: boolean;
    type?: string;
    date_created?: string;
    application_id?: string;
    user_id?: string;
    version?: string;
    api_version?: string;
    action?: string;
    data?: { id?: string };
  }): Promise<PaymentResult | null> {
    return this.webhookHandler.handleWebhook(webhookData);
  }

  verifyWebhookSignature(
    payload: string,
    signature: string,
    secret: string,
  ): boolean {
    return this.webhookHandler.verifyWebhookSignature(
      payload,
      signature,
      secret,
    );
  }

  async createPreference(
    items: {
      title: string;
      unit_price: number;
      quantity?: number;
      currency?: string;
    }[],
    externalReference: string,
  ): Promise<MercadoPagoPaymentResponse> {
    const baseUrl =
      this.configService.get<string>('APP_URL') || 'http://localhost:3000';
    const pref = new Preference(this.mercadopago);

    const sdkItems = items.map((it, idx) => ({
      id: `${externalReference}-${idx + 1}`,
      title: it.title,
      quantity: it.quantity ?? 1,
      unit_price: it.unit_price,
      currency_id: it.currency ?? 'ARS',
    }));

    const body: PreferenceRequest = {
      items: sdkItems,
      external_reference: externalReference,
      back_urls: {
        success: `${baseUrl}/payments/return/success`,
        failure: `${baseUrl}/payments/return/failure`,
        pending: `${baseUrl}/payments/return/pending`,
      },
      notification_url: `${baseUrl}/webhook/mercadopago`,
      auto_return: 'approved',
    };

    try {
      const response = await pref.create({ body });
      return {
        id: String(response.id ?? ''),
        initPoint: response.init_point,
        sandboxInitPoint: response.sandbox_init_point,
        raw: response,
      };
    } catch (error: unknown) {
      const details = isMpSdkError(error)
        ? JSON.stringify({
            status: error.status,
            message: error.message,
            error: error.error,
            cause: error.cause,
          })
        : String(error);
      this.logger.error('createPreference failed', { error: details });
      return {
        id: '',
        initPoint: undefined,
        sandboxInitPoint: undefined,
        raw: {} as PreferenceResponse,
      };
    }
  }

  async getMerchantOrder(merchantOrderId: string): Promise<MpMerchantOrder> {
    // Endpoint oficial de merchant orders (dominio mercadolibre)
    const url = `https://api.mercadolibre.com/merchant_orders/${encodeURIComponent(merchantOrderId)}`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`MP GET ${url} failed: ${res.status} ${body}`);
    }

    const mo = (await res.json()) as unknown;
    // Narrowing básico
    const isValid =
      mo !== null &&
      typeof mo === 'object' &&
      'id' in mo &&
      (('payments' in mo &&
        Array.isArray((mo as { payments?: unknown }).payments)) ||
        !('payments' in mo));

    if (!isValid) {
      throw new Error('Invalid merchant order shape');
    }

    const typed: MpMerchantOrder = {
      id: String((mo as { id: string | number }).id),
      external_reference: (mo as { external_reference?: string })
        .external_reference,
      payments: Array.isArray((mo as { payments?: MpPaymentLite[] }).payments)
        ? (mo as { payments?: MpPaymentLite[] }).payments
        : [],
    };

    return typed;
  }

  async getPaymentStatusByMerchantOrder(
    merchantOrderId: string,
  ): Promise<PaymentResult | null> {
    const mo = await this.getMerchantOrder(merchantOrderId);
    const payments = Array.isArray(mo.payments) ? mo.payments : [];

    // (a) Si la MO ya trae pagos: usar aprobado si existe; si no, el último
    if (payments.length > 0) {
      const approved = payments.find((p) => p?.status === 'approved');
      const selected = approved ?? payments[payments.length - 1];

      const paymentId =
        selected?.id !== undefined && selected?.id !== null
          ? String(selected.id)
          : '';

      if (paymentId) {
        return this.getPaymentStatus(paymentId);
      }
    }

    // (b) Fallback: buscar el pago por external_reference (setéalo al crear la preference)
    if (mo.external_reference) {
      const qs = new URLSearchParams({
        external_reference: mo.external_reference,
        sort: 'date_created',
        criteria: 'desc',
      });
      const url = `https://api.mercadopago.com/v1/payments/search?${qs.toString()}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${this.accessToken}` },
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`MP GET ${url} failed: ${res.status} ${body}`);
      }

      const search = (await res.json()) as unknown;
      const first: MpPaymentLite | undefined =
        search &&
        typeof search === 'object' &&
        Array.isArray((search as { results?: unknown[] }).results)
          ? (search as MpPaymentSearchResp).results![0]
          : undefined;

      const paymentId = first?.id ? String(first.id) : '';
      if (paymentId) {
        return this.getPaymentStatus(paymentId);
      }
    }

    // (c) No hay pago todavía (rechazado o aún no generado)
    this.logger.warn(
      `Merchant order ${merchantOrderId} without resolvable payments (ext_ref=${mo.external_reference ?? 'n/a'})`,
    );
    return null;
  }
}
