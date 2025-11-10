import { Injectable } from '@nestjs/common';
import { IPaymentsRepository } from './payments.repository.interface';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { Payment, PaymentStatus } from '@prisma/client';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { PaginationDto } from '../dto/pagination.dto';

@Injectable()
export class PrismaPaymentsRepository implements IPaymentsRepository {
  constructor(private readonly prismaService: PrismaService) {}

  private getPaginationParams(pagination: PaginationDto) {
    const page = pagination.page || 1;
    const limit = pagination.limit || 10;
    const skip = (page - 1) * limit;
    const take = limit;
    return { skip, take };
  }

  create(data: CreatePaymentDto, idempotencyKey?: string): Promise<Payment> {
    return this.prismaService.payment.create({
      data: {
        userId: data.userId,
        orderId: data.orderId,
        amountCents: data.amountCents,
        currency: data.currency,
        method: data.method,
        description: data.description,
        status: PaymentStatus.pending,
        provider: data.provider,
        idempotencyKey,
      },
    });
  }

  findById(id: number): Promise<Payment | null> {
    return this.prismaService.payment.findUnique({ where: { id } });
  }

  findByOrderId(orderId: number): Promise<Payment[]> {
    return this.prismaService.payment.findMany({ where: { orderId } });
  }

  findByPreferenceId(preferenceId: string): Promise<Payment | null> {
    return this.prismaService.payment.findFirst({
      where: { providerPreferenceId: preferenceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  findProcessingByOrderId(orderId: number): Promise<Payment | null> {
    return this.prismaService.payment.findFirst({
      where: { orderId, status: PaymentStatus.processing },
      orderBy: { createdAt: 'desc' },
    });
  }

  findByUserId(userId: number, pagination: PaginationDto): Promise<Payment[]> {
    const { skip, take } = this.getPaginationParams(pagination);
    return this.prismaService.payment.findMany({
      where: { userId },
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });
  }

  updateStatus(
    id: number,
    status: PaymentStatus,
    providerRef?: string | null,
  ): Promise<Payment> {
    const data: Record<string, unknown> = { status };
    if (typeof providerRef !== 'undefined') data.providerRef = providerRef;
    return this.prismaService.payment.update({ where: { id }, data });
  }

  findByStatus(
    status: PaymentStatus,
    pagination: PaginationDto,
  ): Promise<Payment[]> {
    const { skip, take } = this.getPaginationParams(pagination);
    return this.prismaService.payment.findMany({
      where: { status },
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });
  }

  updateProviderRef(id: number, providerRef: string): Promise<Payment> {
    return this.prismaService.payment.update({
      where: { id },
      data: { providerRef },
    });
  }

  // ✅ Update parcial: solo setea los campos presentes (no pisa providerPreferenceId si no viene)
  updatePaymentData(
    paymentId: number,
    patch: {
      providerRef?: string | null;
      status?: PaymentStatus;
      externalReference?: string | null;
      providerPreferenceId?: string | null;
    },
  ): Promise<Payment> {
    const data: Record<string, unknown> = {};
    if (typeof patch.providerRef !== 'undefined')
      data.providerRef = patch.providerRef;
    if (typeof patch.status !== 'undefined') data.status = patch.status;
    if (typeof patch.externalReference !== 'undefined')
      data.externalReference = patch.externalReference;
    if (typeof patch.providerPreferenceId !== 'undefined')
      data.providerPreferenceId = patch.providerPreferenceId;

    return this.prismaService.payment.update({
      where: { id: paymentId },
      data,
    });
  }

  findByProviderRef(providerRef: string): Promise<Payment[]> {
    return this.prismaService.payment.findMany({ where: { providerRef } });
  }

  findByIdempotencyKey(key: string): Promise<Payment | null> {
    return this.prismaService.payment.findUnique({
      where: { idempotencyKey: key },
    });
  }
}
