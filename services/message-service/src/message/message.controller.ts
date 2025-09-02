import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { MessageService } from './message.service';
import { createServiceLogger } from '@aether/shared';

const logger = createServiceLogger('message-controller');

@Controller()
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @GrpcMethod('MessageService', 'SendMessage')
  async sendMessage(data: any) {
    try {
      logger.info('SendMessage gRPC call received', { 
        userId: data.userId, 
        roomId: data.roomId,
        messageType: data.messageType 
      });
      
      const result = await this.messageService.sendMessage(data);
      
      logger.info('SendMessage completed', { 
        success: result.success,
        messageId: result.messageData?.id 
      });
      
      return result;
    } catch (error) {
      logger.error('SendMessage failed:', error);
      return {
        success: false,
        message: 'Failed to send message',
        error: error.message,
      };
    }
  }

  @GrpcMethod('MessageService', 'GetMessageHistory')
  async getMessageHistory(data: any) {
    try {
      logger.info('GetMessageHistory gRPC call received', { 
        userId: data.userId, 
        roomId: data.roomId,
        page: data.page,
        limit: data.limit 
      });
      
      const result = await this.messageService.getMessageHistory(data);
      
      logger.info('GetMessageHistory completed', { 
        success: result.success,
        messageCount: result.messages?.length 
      });
      
      return result;
    } catch (error) {
      logger.error('GetMessageHistory failed:', error);
      return {
        success: false,
        message: 'Failed to get message history',
        error: error.message,
      };
    }
  }

  @GrpcMethod('MessageService', 'CreateRoom')
  async createRoom(data: any) {
    try {
      logger.info('CreateRoom gRPC call received', { 
        name: data.name, 
        createdBy: data.createdBy,
        roomType: data.roomType 
      });
      
      const result = await this.messageService.createRoom(data);
      
      logger.info('CreateRoom completed', { 
        success: result.success,
        roomId: result.room?.id 
      });
      
      return result;
    } catch (error) {
      logger.error('CreateRoom failed:', error);
      return {
        success: false,
        message: 'Failed to create room',
        error: error.message,
      };
    }
  }

  @GrpcMethod('MessageService', 'GetRooms')
  async getRooms(data: any) {
    try {
      logger.info('GetRooms gRPC call received', { userId: data.userId });
      
      const result = await this.messageService.getRooms(data);
      
      logger.info('GetRooms completed', { 
        success: result.success,
        roomCount: result.rooms?.length 
      });
      
      return result;
    } catch (error) {
      logger.error('GetRooms failed:', error);
      return {
        success: false,
        message: 'Failed to get rooms',
        error: error.message,
      };
    }
  }

  @GrpcMethod('MessageService', 'JoinRoom')
  async joinRoom(data: any) {
    try {
      logger.info('JoinRoom gRPC call received', { 
        userId: data.userId, 
        roomId: data.roomId 
      });
      
      const result = await this.messageService.joinRoom(data);
      
      logger.info('JoinRoom completed', { 
        success: result.success,
        roomId: data.roomId 
      });
      
      return result;
    } catch (error) {
      logger.error('JoinRoom failed:', error);
      return {
        success: false,
        message: 'Failed to join room',
        error: error.message,
      };
    }
  }

  @GrpcMethod('MessageService', 'HealthCheck')
  async healthCheck() {
    return {
      success: true,
      message: 'Message Service is healthy',
      service: 'message-service',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    };
  }
}
