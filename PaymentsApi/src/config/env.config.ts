import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),
  APP_URL: Joi.string().uri().default('http://localhost:3000'),
  FRONTEND_URL: Joi.string().uri().default('http://localhost:4200'),

  DATABASE_URL: Joi.string().required(),

  MERCADOPAGO_ACCESS_TOKEN: Joi.string().required(),
  MERCADOPAGO_PUBLIC_KEY: Joi.string().allow('').optional(),
  MERCADOPAGO_WEBHOOK_SECRET: Joi.string().allow('').optional(),

  JWT_SECRET: Joi.string().required(),
  JWT_EXPIRES_IN: Joi.string().default('1h'),

  SWAGGER_ENABLED: Joi.string().valid('true', 'false').default('true'),
  SWAGGER_PATH: Joi.string().default('/api/docs'),
}).unknown(true);
