import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { HealthService } from './health.service';

@ApiTags('Health')
@Controller('api/health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  async getHealth() {
    return this.healthService.getHealth();
  }

  @Get('detailed')
  @ApiOperation({ summary: 'Detailed health check with service dependencies' })
  async getDetailedHealth() {
    return this.healthService.getDetailedHealth();
  }
}