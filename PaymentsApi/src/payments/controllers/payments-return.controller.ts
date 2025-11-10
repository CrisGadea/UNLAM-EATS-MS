import { Controller, Get, Logger, Query, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type Response } from 'express';

@Controller('payments/return')
export class PaymentsReturnController {
  private readonly logger = new Logger(PaymentsReturnController.name);

  constructor(private readonly configService: ConfigService) {}

  @Get('success')
  success(
    @Res() res: Response,
    @Query('payment_id') paymentId?: string,
    @Query('status') status?: string,
    @Query('external_reference') externalRef?: string,
    @Query('merchant_order_id') moId?: string,
    @Query('preference_id') prefId?: string,
  ) {
    this.logger.log('[SUCCESS] back_url', {
      paymentId,
      status,
      externalRef,
      moId,
      prefId,
    });

    const frontendUrl = this.getFrontendUrl();
    const params = new URLSearchParams({
      status: 'success',
      ...(paymentId && { payment_id: paymentId }),
      ...(status && { collection_status: status }),
      ...(externalRef && { external_reference: externalRef }),
    });

    return res.redirect(`${frontendUrl}/payment-result?${params.toString()}`);
  }

  @Get('failure')
  failure(@Query() q: Record<string, string>, @Res() res: Response) {
    this.logger.warn('[FAILURE] back_url', q);

    const frontendUrl = this.getFrontendUrl();
    const params = new URLSearchParams({
      status: 'failure',
      ...(q.payment_id && { payment_id: q.payment_id }),
      ...(q.external_reference && { external_reference: q.external_reference }),
    });

    return res.redirect(`${frontendUrl}/payment-result?${params.toString()}`);
  }

  @Get('pending')
  pending(@Query() q: Record<string, string>, @Res() res: Response) {
    this.logger.log('[PENDING] back_url', q);

    const frontendUrl = this.getFrontendUrl();
    const params = new URLSearchParams({
      status: 'pending',
      ...(q.payment_id && { payment_id: q.payment_id }),
      ...(q.external_reference && { external_reference: q.external_reference }),
    });

    return res.redirect(`${frontendUrl}/payment-result?${params.toString()}`);
  }

  private getFrontendUrl(): string {
    return (
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:4200'
    );
  }
}
