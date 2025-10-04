import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { join } from 'path';
import { logger } from '../utils/logger';

const PROTO_PATH = join(__dirname, '../../../protos/message.proto');

export interface MessageServiceClient {
  SendMessage(request: any): Promise<any>;
  GetMessageHistory(request: any): Promise<any>;
  GetRooms(request: any): Promise<any>;
  CreateRoom(request: any): Promise<any>;
  JoinRoom(request: any): Promise<any>;
  CheckRoomMembership(request: any): Promise<any>;
  HealthCheck(request: any): Promise<any>;
  GetRoomById(request: any): Promise<any>;
}

export class MessageGrpcClient implements MessageServiceClient {
  private client: any;
  private readonly serviceName = 'MessageService';
  private address: string;
  private maxRetries: number = 3;
  private retryDelay: number = 1000;

  constructor(address: string = 'localhost:50002') {
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

      const messageProto = grpc.loadPackageDefinition(packageDefinition) as any;

      this.client = new messageProto.message.MessageService(
        this.address,
        grpc.credentials.createInsecure(),
        {
          'grpc.keepalive_time_ms': 30000,
          'grpc.keepalive_timeout_ms': 5000,
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

  async SendMessage(request: any): Promise<any> {
    return this.promisifyCallWithRetry('SendMessage', request);
  }

  async GetMessageHistory(request: any): Promise<any> {
    return this.promisifyCallWithRetry('GetMessageHistory', request);
  }

  async GetRooms(request: any): Promise<any> {
    return this.promisifyCallWithRetry('GetRooms', request);
  }

  async CreateRoom(request: any): Promise<any> {
    return this.promisifyCallWithRetry('CreateRoom', request);
  }

  async JoinRoom(request: any): Promise<any> {
    return this.promisifyCallWithRetry('JoinRoom', request);
  }

  async CheckRoomMembership(request: any): Promise<any> {
    return this.promisifyCallWithRetry('CheckRoomMembership', request);
  }

  async HealthCheck(request: any = {}): Promise<any> {
    return this.promisifyCallWithRetry('HealthCheck', request);
  }

  async GetRoomById(request: any): Promise<any> {
    return this.promisifyCallWithRetry('GetRoomById', request);
  }
}
