import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class IdempotencyKeyPipe implements PipeTransform {
  transform(value: any) {
    if (value === undefined || value === null)
      throw new BadRequestException(
        'idempotency-key cannot be undefined or null',
      );
    if (typeof value !== 'string')
      throw new BadRequestException('Invalid idempotency-key');
    const key = value.trim();
    if (key.length === 0)
      throw new BadRequestException('idempotency-key cannot be empty');
    if (key.length > 255)
      throw new BadRequestException('idempotency-key too long');
    if (!/^[\w\-:.]+$/.test(key))
      throw new BadRequestException('idempotency-key has invalid characters');
    return key;
  }
}
