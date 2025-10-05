import { Controller, Get, HttpStatus, HttpCode, HttpException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService } from './health.service';

@ApiTags('Health')
@Controller('api/health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  @ApiResponse({ status: 503, description: 'Service is unhealthy' })
  async getHealth() {
    const health = await this.healthService.getHealth();
    if (health.status !== 'OK') {
      throw new HttpException('Service unhealthy', HttpStatus.SERVICE_UNAVAILABLE);
    }
    return health;
  }

  @Get('detailed')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Detailed health check with service dependencies' })
  @ApiResponse({ status: 200, description: 'All services are healthy' })
  @ApiResponse({ status: 503, description: 'One or more services are unhealthy' })
  async getDetailedHealth() {
    const health = await this.healthService.getDetailedHealth();
    if (health.status !== 'OK') {
      throw new HttpException('Service unhealthy', HttpStatus.SERVICE_UNAVAILABLE);
    }
    return health;
  }
}
