import { Injectable } from '@nestjs/common';
import { AuthGrpcClient } from '@aether/shared';

@Injectable()
export class HealthService {
  async getHealth() {
    return {
      status: 'OK',
      service: 'api-gateway',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    };
  }

  async getDetailedHealth() {
    const health = {
      status: 'OK',
      service: 'api-gateway',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      dependencies: {
        authService: await this.checkAuthService(),
      },
    };

    return health;
  }

  private async checkAuthService(): Promise<{ status: string; latency?: number }> {
    try {
      const start = Date.now();
      const authClient = new AuthGrpcClient(process.env.AUTH_SERVICE_GRPC_URL );
      await authClient.HealthCheck();
      const latency = Date.now() - start;

      return { status: 'OK', latency };
    } catch (error) {
      return { status: 'ERROR' };
    }
  }
}