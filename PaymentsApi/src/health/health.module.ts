import { Module } from '@nestjs/common';
import { HealthService } from './health.service';
import { HealthController } from './health.controller';

@Module({
  imports: [],
  providers: [HealthService],
  controllers: [HealthController],
})
export class HealthModule {}
