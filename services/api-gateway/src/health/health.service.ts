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

    // For Railway deployment, don't fail if microservices aren't available yet
    // Just report their status without affecting overall health
    const health = {
      status: 'OK', // API Gateway itself is healthy
      service: 'api-gateway',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      dependencies,
      note: 'Microservices may not be available during Railway deployment startup',
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
