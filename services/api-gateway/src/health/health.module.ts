import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { RootHealthController } from './root-health.controller';
import { HealthService } from './health.service';

@Module({
  controllers: [HealthController, RootHealthController],
  providers: [HealthService],
})
export class HealthModule {}
