import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { PaymentsService } from '../services/payments.service';
import { AuthGuard } from '../guards/jwt.guard';
import { PaginationDto } from '../dto/pagination.dto';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Payment } from '@prisma/client';
import { IdempotencyKeyPipe } from 'src/common/pipes/idempotency-key.pipe';
import { IdempotencyKey } from 'src/common/decorators/idempotency-key.decorator';

@ApiTags('Payments')
@Controller('payments')
@UseGuards(AuthGuard)
@ApiBearerAuth('JWT-auth')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @ApiOperation({
    summary: 'Crear nuevo pago',
    description: 'Crea un nuevo pago en el sistema',
  })
  @ApiHeader({
    name: 'idempotency-key',
    description: 'Clave de idempotencia para evitar pagos duplicados',
    required: false,
  })
  @ApiResponse({
    status: 201,
    description: 'Pago creado exitosamente',
    type: Promise<Payment>,
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos',
  })
  @ApiResponse({
    status: 409,
    description: 'Pago duplicado (idempotency key)',
  })
  async createPayment(
    @Body() paymentDto: CreatePaymentDto,
    @IdempotencyKey(IdempotencyKeyPipe) idempotencyKey?: string,
  ) {
    this.logger.log('=== INICIO createPayment ===');
    this.logger.log(`Payload recibido: ${JSON.stringify(paymentDto)}`);
    this.logger.log(`Idempotency Key: ${idempotencyKey || 'No proporcionada'}`);

    try {
      const result = await this.paymentsService.createPayment(
        paymentDto,
        idempotencyKey,
      );
      this.logger.log(`Pago creado exitosamente: ID ${result.id}`);
      return result;
    } catch (error) {
      this.logger.error(
        `Error al crear pago: ${error instanceof Error ? error.message : ''}`,
        error instanceof Error ? error.stack : '',
      );
      throw error;
    }
  }

  @Post('/:id/checkout')
  async initiateCheckout(@Param('id', ParseIntPipe) id: number) {
    return await this.paymentsService.initiateCheckout(id);
  }

  @Get('/users/:userId')
  getPaymentsByUserId(
    @Param('userId', ParseIntPipe) userId: number,
    @Query() pagination: PaginationDto,
  ) {
    return this.paymentsService.getPaymentsByUserId(userId, pagination);
  }

  @Get('/orders/:orderId')
  getPaymentsByOrderId(@Param('orderId', ParseIntPipe) orderId: number) {
    return this.paymentsService.getPaymentsByOrderId(orderId);
  }

  @Get('/status/:status')
  getPaymentsByStatus(
    @Param('status') status: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.paymentsService.getPaymentsByStatus(status, pagination);
  }

  @Get('/provider/:providerRef')
  getPaymentsByProviderRef(@Param('providerRef') providerRef: string) {
    return this.paymentsService.getPaymentsByProviderRef(providerRef);
  }

  @Get(':id')
  getPaymentById(@Param('id', ParseIntPipe) id: number) {
    return this.paymentsService.getPaymentById(id);
  }
}
