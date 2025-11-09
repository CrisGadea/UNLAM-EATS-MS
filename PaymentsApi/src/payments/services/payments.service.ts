import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { PaginationDto } from '../dto/pagination.dto';
import {
  PAYMENTS_REPOSITORY,
  type IPaymentsRepository,
} from '../repositories/payments.repository.interface';
import {
  PaymentProviderService,
  PaymentResult,
} from '../provider/payment-provider.interface';
import { MercadoPagoWebhookHandler } from '../provider/services/mercadopago-webhook-handler.service';
import {
  WEBHOOK_HANDLER_TOKEN,
  WebhookData,
} from '../provider/interfaces/webhook-handler.interface';
import { Payment, Prisma } from '@prisma/client';

type UnknownRec = Record<string, unknown>;

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  constructor(
    @Inject(PAYMENTS_REPOSITORY)
    private readonly paymentsRepository: IPaymentsRepository,
    private readonly paymentProvider: PaymentProviderService,
    @Inject(WEBHOOK_HANDLER_TOKEN)
    private readonly webhookHandler: MercadoPagoWebhookHandler,
  ) {}

  async createPayment(createDto: CreatePaymentDto, idempotencyKey?: string) {
    if (idempotencyKey) {
      const existing =
        await this.paymentsRepository.findByIdempotencyKey(idempotencyKey);
      if (existing) {
        return existing;
      }
    }

    try {
      const created = await this.paymentsRepository.create(
        createDto,
        idempotencyKey,
      );
      return created;
    } catch (err: any) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        const existing = await this.paymentsRepository.findByIdempotencyKey(
          idempotencyKey!,
        );
        if (existing) return existing;
        throw new ConflictException('Idempotency key conflict');
      }
      throw err;
    }
  }

  async initiateCheckout(paymentId: number) {
    const payment = await this.paymentsRepository.findById(paymentId);
    if (!payment)
      throw new NotFoundException(`Payment with ID ${paymentId} not found`);

    if (payment.status !== 'pending')
      throw new BadRequestException('Payment not in pending state');

    const items = [
      {
        title: payment.description ?? `Order ${payment.orderId}`,
        unit_price: payment.amountCents / 100,
        quantity: 1,
        currency: payment.currency,
      },
    ];

    const pref = await this.paymentProvider.createPreference(
      items,
      payment.orderId.toString(),
    );

    // Guardar correctamente el preference_id y NO tocar providerRef acá
    await this.paymentsRepository.updatePaymentData(payment.id, {
      providerPreferenceId: pref.id, // ✅ preference_id
      externalReference: pref.raw.external_reference ?? '',
      status: 'processing',
    });

    return {
      preferenceId: pref.id,
      initPoint: pref.initPoint,
      sandboxInitPoint: pref.sandboxInitPoint,
    };
  }

  async handleProviderWebhook(webhookData: WebhookData) {
    const rawId =
      webhookData?.data?.id ??
      (webhookData as unknown as { id?: string })?.id ??
      '';
    this.logger.log(
      `Processing webhook for payment/merchant_order id: ${rawId}`,
    );

    const result = await this.webhookHandler.handleWebhook(webhookData);
    if (!result) return null;

    this.logger.log('Webhook resolved to:', {
      paymentId: result.providerTransactionId,
      status: result.status,
      preferenceId: result.preferenceId,
      externalReference: result.externalReference,
      merchantOrderId: result.merchantOrderId,
    });

    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const withRepoRetry = async <T>(
      fn: () => Promise<T | null>,
      tries = 3,
      delays = [400, 800, 1600],
    ): Promise<T | null> => {
      for (let i = 0; i < tries; i++) {
        const hit = await fn();
        if (hit) return hit;
        if (i < delays.length) await sleep(delays[i]);
      }
      return null;
    };

    // Normalizamos pistas provenientes del provider
    const mpPaymentId = result.providerTransactionId ?? ''; // payment_id
    const preferenceId = result.preferenceId; // preference_id
    const externalReference = result.externalReference; // tu orderId en string

    let payment: Payment | null = null;

    // 1) Buscar por payment_id (providerRef) si ya lo teníamos seteado
    if (mpPaymentId) {
      payment = await withRepoRetry(async () => {
        const byRef =
          await this.paymentsRepository.findByProviderRef(mpPaymentId);
        if (Array.isArray(byRef)) return byRef[0] ?? null;
        return byRef ?? null;
      });
      if (payment) {
        this.logger.log('Matched by providerRef (payment_id).', {
          id: payment.id,
          providerRef: payment.providerRef,
        });
      }
    }

    // 2) Buscar por preference_id (providerPreferenceId)
    if (!payment && preferenceId) {
      payment = await withRepoRetry(async () => {
        const raw =
          await this.paymentsRepository.findByPreferenceId(preferenceId);
        const byPref = raw as Payment | Payment[] | null | undefined;
        if (Array.isArray(byPref)) return byPref[0] ?? null;
        return (byPref as Payment) ?? null;
      });
      if (payment) {
        this.logger.log('Matched by providerPreferenceId (preference_id).', {
          id: payment.id,
          providerPreferenceId: payment.providerPreferenceId,
        });
      }
    }

    // 3) Fallback por external_reference (orderId): primero 'processing', luego cualquier estado
    if (!payment && externalReference !== undefined) {
      const orderId = Number(externalReference);
      if (!Number.isNaN(orderId)) {
        payment = await withRepoRetry<Payment>(async () => {
          const rawProc =
            (await this.paymentsRepository.findProcessingByOrderId(orderId)) as
              | Payment
              | Payment[]
              | null
              | undefined;
          if (Array.isArray(rawProc)) return rawProc[0] ?? null;
          if (rawProc) return rawProc;

          const rawAny = (await this.paymentsRepository.findByOrderId(
            orderId,
          )) as Payment | Payment[] | null | undefined;
          if (Array.isArray(rawAny)) return rawAny[0] ?? null;
          return (rawAny as Payment) ?? null;
        });

        if (payment) {
          this.logger.log('Matched by orderId (external_reference).', {
            id: payment.id,
            orderId,
          });
        }
      }
    }

    if (!payment) {
      // Último log con pistas para depurar
      this.logger.warn('Payment not matched with any key.', {
        paymentId: mpPaymentId,
        preferenceId,
        externalReference,
      });
      throw new NotFoundException('Payment not found for webhook processing');
    }

    // Evitar updates innecesarios
    const alreadyHasPaymentId =
      payment.providerRef && /^\d+$/.test(payment.providerRef); // payment_id numérico
    const sameStatus = payment.status === result.status;

    if (sameStatus && alreadyHasPaymentId) {
      this.logger.log('No update needed (status & payment_id already set).', {
        id: payment.id,
        status: payment.status,
        providerRef: payment.providerRef,
      });
      return payment;
    }

    // Actualizar status y setear el payment_id definitivo en providerRef (si vino)
    const newProviderRef =
      mpPaymentId && /^\d+$/.test(mpPaymentId)
        ? mpPaymentId
        : (payment.providerRef ?? undefined);

    const updated = await this.paymentsRepository.updatePaymentData(
      payment.id,
      {
        // No tocar providerPreferenceId aquí
        status: result.status,
        providerRef: newProviderRef, // ✅ ahora sí es el payment_id
        externalReference: this.getExternalReference(result) ?? '',
      },
    );

    this.logger.log('Payment updated from webhook.', {
      id: updated.id,
      status: updated.status,
      providerRef: updated.providerRef,
    });

    return updated;
  }

  async getPaymentsByProviderRef(providerRef: string) {
    return await this.paymentsRepository.findByProviderRef(providerRef);
  }

  async getPaymentById(id: number) {
    return await this.paymentsRepository.findById(id);
  }

  async getPaymentsByUserId(userId: number, pagination: PaginationDto) {
    return await this.paymentsRepository.findByUserId(userId, pagination);
  }

  async getPaymentsByOrderId(orderId: number) {
    return await this.paymentsRepository.findByOrderId(orderId);
  }

  async getPaymentsByStatus(status: string, pagination: PaginationDto) {
    return await this.paymentsRepository.findByStatus(status, pagination);
  }

  private getExternalReference(r: PaymentResult): string | undefined {
    const v = (r as unknown as UnknownRec)['externalReference'];
    return typeof v === 'string' ? v : undefined;
  }

  private getPreferenceId(r: PaymentResult): string | undefined {
    const v = (r as unknown as UnknownRec)['preferenceId'];
    return typeof v === 'string' ? v : undefined;
  }
}
