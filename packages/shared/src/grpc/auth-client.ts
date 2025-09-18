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

  constructor(address: string = 'localhost:50001') {
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
        address,
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

      logger.info(`gRPC client connected to ${this.serviceName} at ${address}`);
    } catch (error) {
      logger.error(`Failed to initialize gRPC client for ${this.serviceName}:`, error);
      throw error;
    }
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
    return this.promisifyCall('CreateUser', request);
  }

  async ValidateToken(request: any): Promise<any> {
    return this.promisifyCall('ValidateToken', request);
  }

  async Login(request: any): Promise<any> {
    return this.promisifyCall('Login', request);
  }

  async RefreshToken(request: any): Promise<any> {
    return this.promisifyCall('RefreshToken', request);
  }

  async Logout(request: any): Promise<any> {
    return this.promisifyCall('Logout', request);
  }

  async GetUserProfile(request: any): Promise<any> {
    return this.promisifyCall('GetUserProfile', request);
  }

  async UpdateUserProfile(request: any): Promise<any> {
    return this.promisifyCall('UpdateUserProfile', request);
  }

  async HealthCheck(request: any = {}): Promise<any> {
    return this.promisifyCall('HealthCheck', request);
  }

  async GetWebSocketToken(request: any): Promise<any> { // New method
    return this.promisifyCall('GetWebSocketToken', request);
  }
}