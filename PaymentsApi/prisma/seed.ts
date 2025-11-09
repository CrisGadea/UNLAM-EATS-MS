import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const payments: Prisma.PaymentCreateManyInput[] = [
    {
      orderId: 1,
      userId: 1,
      amountCents: 2500,
      currency: 'ARS',
      status: 'pending',
      method: 'card',
      provider: 'mercadopago',
      providerRef: null,
      idempotencyKey: 'idem_order_1001',
      description: 'Pago inicial - pedido 1001',
      createdAt: new Date('2025-01-01T10:00:00.000Z'),
      updatedAt: new Date('2025-01-01T10:00:00.000Z'),
    },
    {
      orderId: 2,
      userId: 2,
      amountCents: 4999,
      currency: 'USD',
      status: 'processing',
      method: 'transfer',
      provider: 'mercadopago',
      providerRef: 'mp_tx_2001',
      idempotencyKey: 'idem_order_1002',
      description: 'Pago en proceso - order 1002',
      createdAt: new Date('2025-02-15T12:30:00.000Z'),
      updatedAt: new Date('2025-02-15T12:35:00.000Z'),
    },
    {
      orderId: 3,
      userId: 3,
      amountCents: 1500,
      currency: 'ARS',
      status: 'succeeded',
      method: 'card',
      provider: 'mercadopago',
      providerRef: 'mp_tx_3001',
      idempotencyKey: 'idem_order_1003',
      description: 'Pago exitoso - order 1003',
      createdAt: new Date('2025-03-01T09:10:00.000Z'),
      updatedAt: new Date('2025-03-01T09:12:00.000Z'),
    },
    {
      orderId: 4,
      userId: 4,
      amountCents: 800,
      currency: 'ARS',
      status: 'failed',
      method: 'cash',
      provider: 'mercadopago',
      providerRef: 'mp_tx_4001',
      idempotencyKey: 'idem_order_1004',
      description: 'Pago rechazado - order 1004',
      createdAt: new Date('2025-04-10T14:00:00.000Z'),
      updatedAt: new Date('2025-04-10T14:05:00.000Z'),
    },
    {
      orderId: 1, // intento adicional para la misma order
      userId: 1,
      amountCents: 2500,
      currency: 'ARS',
      status: 'succeeded',
      method: 'pix',
      provider: 'mercadopago',
      providerRef: 'mp_tx_5001',
      idempotencyKey: 'idem_order_1001_attempt2',
      description: 'Segundo intento - order 1001',
      createdAt: new Date('2025-05-01T08:00:00.000Z'),
      updatedAt: new Date('2025-05-01T08:02:00.000Z'),
    },
  ];

  await prisma.payment.createMany({
    data: payments,
    skipDuplicates: true,
  });

  console.log('Seed completed: inserted sample payments');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
