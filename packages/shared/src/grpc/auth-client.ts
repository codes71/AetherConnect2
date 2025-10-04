import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { join } from 'path';
import { logger } from '../utils/logger';

const PROTO_PATH = join(__dirname, '../../../protos/auth.proto');

export interface AuthServiceClient {
  CreateUser(request: any): Promise<any>;
  ValidateToken(request: any): Promise<any>;
  Login(request: any): Promise<any>;
  RefreshToken(request: any): Promise<any>;
  Logout(request: any): Promise<any>;
  GetUserProfile(request: any): Promise<any>;
  UpdateUserProfile(request: any): Promise<any>;
  HealthCheck(request: any): Promise<any>;
  GetWebSocketToken(request: any): Promise<any>;
}

export class AuthGrpcClient implements AuthServiceClient {
  private client: any;
  private readonly serviceName = 'AuthService';
  private address: string;
  private maxRetries: number = 3;
  private retryDelay: number = 1000;

  constructor(address: string = 'localhost:50001') {
    this.address = address;
    this.initializeClient();
  }

  private initializeClient() {
    try {
      const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
      });

      const authProto = grpc.loadPackageDefinition(packageDefinition) as any;

      this.client = new authProto.auth.AuthService(
        this.address,
        grpc.credentials.createInsecure(),
        {
          'grpc.keepalive_time_ms': 60000,
          'grpc.keepalive_timeout_ms': 20000,
          'grpc.keepalive_permit_without_calls': true,
          'grpc.http2.max_pings_without_data': 0,
          'grpc.http2.min_time_between_pings_ms': 10000,
          'grpc.http2.min_ping_interval_without_data_ms': 300000,
        }
      );

      logger.info(`gRPC client connected to ${this.serviceName} at ${this.address}`);
    } catch (error) {
      logger.error(`Failed to initialize gRPC client for ${this.serviceName}:`, error);
      throw error;
    }
  }

  private async promisifyCallWithRetry(method: string, request: any, retryCount: number = 0): Promise<any> {
    return new Promise((resolve, reject) => {
      const call = this.client[method](request, async (error: any, response: any) => {
        if (error) {
          // Check if it's a connection error and we haven't exceeded max retries
          if (error.code === grpc.status.UNAVAILABLE && retryCount < this.maxRetries) {
            logger.warn(`${method} failed (attempt ${retryCount + 1}/${this.maxRetries + 1}), retrying in ${this.retryDelay}ms...`, error.message);

            setTimeout(async () => {
              try {
                const result = await this.promisifyCallWithRetry(method, request, retryCount + 1);
                resolve(result);
              } catch (retryError) {
                reject(retryError);
              }
            }, this.retryDelay);

            return;
          }

          logger.error(`gRPC ${method} error:`, error);
          reject(error);
        } else {
          resolve(response);
        }
      });
    });
  }

  private promisifyCall(method: string, request: any): Promise<any> {
    return new Promise((resolve, reject) => {
      this.client[method](request, (error: any, response: any) => {
        if (error) {
          logger.error(`gRPC ${method} error:`, error);
          reject(error);
        } else {
          resolve(response);
        }
      });
    });
  }

  async CreateUser(request: any): Promise<any> {
    return this.promisifyCallWithRetry('CreateUser', request);
  }

  async ValidateToken(request: any): Promise<any> {
    return this.promisifyCallWithRetry('ValidateToken', request);
  }

  async Login(request: any): Promise<any> {
    return this.promisifyCallWithRetry('Login', request);
  }

  async RefreshToken(request: any): Promise<any> {
    return this.promisifyCallWithRetry('RefreshToken', request);
  }

  async Logout(request: any): Promise<any> {
    return this.promisifyCallWithRetry('Logout', request);
  }

  async GetUserProfile(request: any): Promise<any> {
    return this.promisifyCallWithRetry('GetUserProfile', request);
  }

  async UpdateUserProfile(request: any): Promise<any> {
    return this.promisifyCallWithRetry('UpdateUserProfile', request);
  }

  async HealthCheck(request: any = {}): Promise<any> {
    return this.promisifyCallWithRetry('HealthCheck', request);
  }

  async GetWebSocketToken(request: any): Promise<any> { // New method
    return this.promisifyCallWithRetry('GetWebSocketToken', request);
  }
}
