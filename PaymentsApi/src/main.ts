import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import * as bodyParser from 'body-parser';
import { captureRawBody } from './utils/rawBody';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });

  app.use(
    '/webhook/mercadopago',
    bodyParser.raw({
      type: 'application/json',
      limit: '1mb',
      verify: captureRawBody,
    }),
  );

  app.use(
    bodyParser.json({
      limit: '1mb',
      verify: captureRawBody,
    }),
  );
  app.use(bodyParser.urlencoded({ extended: true }));

  const configService = app.get(ConfigService);

  const config = new DocumentBuilder()
    .setTitle('Payments API')
    .setDescription('API for managing payments with MercadoPago')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addApiKey(
      {
        type: 'apiKey',
        name: 'idempotency-key',
        in: 'header',
        description: 'Idempotency key for safe retries',
      },
      'idempotency-key',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: configService.get<string>('APP_URL') || 'http://localhost:3001',
  });

  app.useGlobalFilters(new HttpExceptionFilter());

  const PORT = configService.get<number>('PORT') || 3000;
  await app.listen(PORT);
}

void bootstrap();
