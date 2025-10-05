import { Injectable } from '@nestjs/common';
import { AuthGrpcClient, MessageGrpcClient } from '@aether/shared';

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
    const authServiceHealth = await this.checkAuthService();
    const messageServiceHealth = await this.checkMessageService();

    const dependencies = {
      authService: authServiceHealth,
      messageService: messageServiceHealth,
    };

    // Determine overall status based on dependencies
    const allHealthy = Object.values(dependencies).every(dep => dep.status === 'OK');
    const status = allHealthy ? 'OK' : 'ERROR';

    const health = {
      status,
      service: 'api-gateway',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      dependencies,
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
    } catch {
      return { status: 'ERROR' };
    }
  }

  private async checkMessageService(): Promise<{ status: string; latency?: number }> {
    try {
      const start = Date.now();
      const messageClient = new MessageGrpcClient(process.env.MESSAGE_SERVICE_GRPC_URL);
      await messageClient.HealthCheck();
      const latency = Date.now() - start;

      return { status: 'OK', latency };
    } catch {
      return { status: 'ERROR' };
    }
  }
}
