import { Controller, Get, HttpStatus, HttpCode, HttpException } from '@nestjs/common';
import { HealthService } from './health.service';

@Controller('health')
export class RootHealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async getHealth() {
    const health = await this.healthService.getHealth();
    if (health.status !== 'OK') {
      throw new HttpException('Service unhealthy', HttpStatus.SERVICE_UNAVAILABLE);
    }
    return health;
  }
}
