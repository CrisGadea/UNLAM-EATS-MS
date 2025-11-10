import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export const IdempotencyKey = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | null => {
    const req = ctx.switchToHttp().getRequest<Request>();

    const raw =
      req.headers['idempotency-key'] ??
      req.headers['idempotency_key'] ??
      req.headers['idempotencykey'];

    if (raw === undefined) {
      return null;
    }

    if (Array.isArray(raw)) {
      return raw[0] ?? null;
    }

    return raw;
  },
);
