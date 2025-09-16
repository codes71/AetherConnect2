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

  constructor(address: string = 'localhost:50002') {
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
        address,
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

  async SendMessage(request: any): Promise<any> {
    return this.promisifyCall('SendMessage', request);
  }

  async GetMessageHistory(request: any): Promise<any> {
    return this.promisifyCall('GetMessageHistory', request);
  }

  async GetRooms(request: any): Promise<any> {
    return this.promisifyCall('GetRooms', request);
  }

  async CreateRoom(request: any): Promise<any> {
    return this.promisifyCall('CreateRoom', request);
  }

  async JoinRoom(request: any): Promise<any> {
    return this.promisifyCall('JoinRoom', request);
  }

  async CheckRoomMembership(request: any): Promise<any> {
    return this.promisifyCall('CheckRoomMembership', request);
  }

  async HealthCheck(request: any = {}): Promise<any> {
    return this.promisifyCall('HealthCheck', request);
  }

  async GetRoomById(request: any): Promise<any> {
    return this.promisifyCall('GetRoomById', request);
  }
}