import { Controller, Get, Query, Res, Logger } from '@nestjs/common';
import { type Response } from 'express';

@Controller('payments/return')
export class PaymentsReturnController {
  private readonly logger = new Logger(PaymentsReturnController.name);

  constructor() {}

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

    return `
    <html>
      <body>
        <h2>Gracias 🙌</h2>
        <p>Estado del pago: ${status}</p>
      </body>
    </html>
  `;
  }

  @Get('failure')
  failure(@Query() q: Record<string, string>, @Res() res: Response) {
    this.logger.warn('[FAILURE] back_url', q);
    return res.redirect('/pago?status=failure');
  }

  @Get('pending')
  pending(@Query() q: Record<string, string>, @Res() res: Response) {
    this.logger.log('[PENDING] back_url', q);
    return res.redirect('/pago?status=pending');
  }
}
