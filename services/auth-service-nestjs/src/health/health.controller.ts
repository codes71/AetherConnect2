import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  async getHealth() {
    return {
      status: 'OK',
      service: 'auth-service',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    };
  }
}
