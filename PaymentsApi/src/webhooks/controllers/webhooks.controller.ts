import {
  Controller,
  Post,
  Req,
  Headers,
  HttpCode,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { type Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { PaymentsService } from 'src/payments/services/payments.service';
import * as crypto from 'crypto';
import { WebhookData } from 'src/payments/provider/interfaces/webhook-handler.interface';
import {
  extractIdFromResource,
  getQueryParamString,
  isMpBasicPayload,
  isMpFeedV2Payload,
  safeJsonParse,
} from '../utils';

@Controller('webhook')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly config: ConfigService,
  ) {}

  @Post('mercadopago')
  @HttpCode(200)
  async handle(
    @Req() req: Request & { rawBody?: Buffer | string },
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    this.logger.debug('Webhook headers:', JSON.stringify(headers));

    const signatureHeader = headers['x-signature'] as string | undefined;
    const requestId =
      typeof headers['x-request-id'] === 'string'
        ? headers['x-request-id']
        : '';

    const secret = this.config
      .get<string>('MERCADOPAGO_WEBHOOK_SECRET')
      ?.trim();

    const ua =
      typeof headers['user-agent'] === 'string' ? headers['user-agent'] : '';

    // raw -> string
    const rawBuf: Buffer = Buffer.isBuffer(req.rawBody)
      ? req.rawBody
      : Buffer.from(String(req.rawBody ?? ''), 'utf8');
    const rawString = rawBuf.toString('utf8');

    // 1) Parseo seguro
    const parsedResult = rawString
      ? safeJsonParse<unknown>(rawString)
      : ({ ok: true, value: req.body as unknown } as const);
    if (!parsedResult.ok) {
      this.logger.error('Failed to parse webhook JSON');
      throw new BadRequestException('Invalid payload');
    }
    const parsedUnknown: unknown = parsedResult.value;

    // 2) Extraer dataId
    const query = req.query as Record<string, unknown>;
    const qId =
      getQueryParamString(query, 'data.id') ?? getQueryParamString(query, 'id');

    let dataId: string | undefined;
    if (isMpBasicPayload(parsedUnknown)) {
      const bodyId = parsedUnknown.data?.id;
      dataId = bodyId !== undefined ? String(bodyId) : undefined;
    }
    if (!dataId && isMpFeedV2Payload(parsedUnknown)) {
      dataId = extractIdFromResource(parsedUnknown.resource);
    }
    if (!dataId && qId) dataId = qId;

    // --- Detectar tipo de evento y esquema ---
    const isPaymentV1 =
      ua.includes('WebHook v1.0 payment') ||
      (isMpBasicPayload(parsedUnknown) &&
        (parsedUnknown.type === 'payment' ||
          (parsedUnknown.action?.startsWith('payment.') ?? false)));

    const isFeedV2 =
      ua.includes('Feed v2.0') ||
      (isMpFeedV2Payload(parsedUnknown) &&
        parsedUnknown.topic === 'merchant_order');

    // 3) Validar firma
    if (signatureHeader && secret) {
      const m = signatureHeader.match(/ts=([^,]+),\s*v1=([0-9a-fA-F]+)/);
      if (!m) {
        this.logger.warn('Signature header malformed', { signatureHeader });
        if (process.env.NODE_ENV === 'production') {
          throw new BadRequestException('Invalid signature');
        }
      } else {
        const [, ts, v1] = m;
        let expected = '';
        let scheme: 'payment-v1' | 'feed-v2' | 'unknown' = 'unknown';

        if (isPaymentV1) {
          const payloadToSign = `${ts}.${rawString}`;
          expected = crypto
            .createHmac('sha256', secret)
            .update(payloadToSign)
            .digest('hex');
          scheme = 'payment-v1';
        } else if (isFeedV2 && requestId && dataId) {
          const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
          expected = crypto
            .createHmac('sha256', secret)
            .update(manifest)
            .digest('hex');
          scheme = 'feed-v2';
          this.logger.debug({ scheme, manifest });
        }

        let valid = false;
        try {
          const a = Buffer.from(v1, 'hex');
          const b = Buffer.from(expected, 'hex');
          valid = a.length === b.length && crypto.timingSafeEqual(a, b);
        } catch {
          valid = false;
        }

        this.logger.debug({ scheme, incoming: v1, expected, valid });

        if (!valid) {
          this.logger.warn('Invalid webhook signature', {
            scheme,
            incoming: v1,
            expected,
          });
          if (process.env.NODE_ENV === 'production') {
            throw new BadRequestException('Invalid signature');
          }
          this.logger.warn(
            'Continuing despite invalid signature because not in production',
          );
        }
      }
    } else {
      this.logger.warn('Missing x-signature or secret to validate');
      if (process.env.NODE_ENV === 'production') {
        throw new BadRequestException('Invalid signature');
      }
    }

    // 4) Normalizar -> WebhookData
    const normalized = this.normalizeToWebhookData(parsedUnknown, req);
    if (!normalized) {
      this.logger.warn('Webhook payload invalid shape', {
        payload: parsedUnknown,
      });
      throw new BadRequestException('Invalid webhook payload');
    }

    await this.paymentsService.handleProviderWebhook(normalized);
    return { ok: true };
  }

  // ------- Normalización -------
  private normalizeToWebhookData(p: unknown, req: Request): WebhookData | null {
    if (isMpBasicPayload(p)) {
      const id = p.data?.id;
      const event = p.action ?? p.type ?? undefined;
      if (event && (typeof id === 'string' || typeof id === 'number')) {
        return { action: event, data: { id } } as WebhookData;
      }
    }

    if (isMpFeedV2Payload(p)) {
      const query = req.query as Record<string, unknown>;
      const idFromQuery =
        getQueryParamString(query, 'data.id') ??
        getQueryParamString(query, 'id');
      const id = idFromQuery ?? extractIdFromResource(p.resource);
      if (!id) return null;
      const action = p.topic ?? 'merchant_order';
      return { action, data: { id } } as WebhookData;
    }

    return null;
  }
}
