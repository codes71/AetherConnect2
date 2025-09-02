import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable } from '@nestjs/common';
import { AuthGrpcClient, createServiceLogger } from '@aether/shared';
import { MessageService } from '../message/message.service';
import Redis from 'ioredis';
import { createAdapter } from '@socket.io/redis-adapter';

const logger = createServiceLogger('socket-gateway');

@Injectable()
@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3004',
    credentials: true,
  },
})
export class SocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private authClient: AuthGrpcClient;
  private connectedUsers = new Map<string, { userId: string; username: string; rooms: Set<string> }>();

  constructor(private readonly messageService: MessageService) {
    // Initialize Auth gRPC client
    this.authClient = new AuthGrpcClient(process.env.AUTH_SERVICE_GRPC_URL || 'localhost:50001');
    
    // Setup Redis adapter for Socket.io clustering
    this.setupRedisAdapter();
  }

  private setupRedisAdapter() {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      logger.error('REDIS_URL environment variable is not set.');
      throw new Error('REDIS_URL environment variable is not set.');
    }
    const pubClient = new Redis(redisUrl);
    const subClient = pubClient.duplicate();
    
    this.server?.adapter(createAdapter(pubClient, subClient));
    logger.info('Redis adapter configured for Socket.io clustering');
  }

  async handleConnection(client: Socket) {
    try {
      logger.info('Client attempting to connect', { socketId: client.id });
      
      const token = client.handshake.auth?.token;
      if (!token) {
        logger.warn('Connection rejected: No token provided', { socketId: client.id });
        client.emit('error', { message: 'Authentication required' });
        client.disconnect();
        return;
      }

      // Validate token with Auth Service
      const authResult = await this.authClient.ValidateToken({ token });
      
      if (!authResult.success || !authResult.isValid) {
        logger.warn('Connection rejected: Invalid token', { socketId: client.id });
        client.emit('error', { message: 'Invalid token' });
        client.disconnect();
        return;
      }

      // Store user connection info
      this.connectedUsers.set(client.id, {
        userId: authResult.user.id,
        username: authResult.user.username,
        rooms: new Set(),
      });

      client.emit('connected', {
        message: 'Successfully connected',
        user: {
          id: authResult.user.id,
          username: authResult.user.username,
        },
      });

      logger.info('Client connected successfully', {
        socketId: client.id,
        userId: authResult.user.id,
        username: authResult.user.username,
      });

    } catch (error) {
      logger.error('Connection error:', error);
      client.emit('error', { message: 'Connection failed' });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userInfo = this.connectedUsers.get(client.id);
    if (userInfo) {
      // Leave all rooms
      userInfo.rooms.forEach(roomId => {
        client.leave(roomId);
        client.to(roomId).emit('user_left', {
          userId: userInfo.userId,
          username: userInfo.username,
          roomId,
        });
      });

      this.connectedUsers.delete(client.id);
      
      logger.info('Client disconnected', {
        socketId: client.id,
        userId: userInfo.userId,
        username: userInfo.username,
      });
    }
  }

  @SubscribeMessage('join_room')
  async handleJoinRoom(
    @MessageBody() data: { roomId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const userInfo = this.connectedUsers.get(client.id);
      if (!userInfo) {
        client.emit('error', { message: 'User not authenticated' });
        return;
      }

      await client.join(data.roomId);
      userInfo.rooms.add(data.roomId);

      // Notify other users in the room
      client.to(data.roomId).emit('user_joined', {
        userId: userInfo.userId,
        username: userInfo.username,
        roomId: data.roomId,
      });

      client.emit('joined_room', {
        message: `Joined room ${data.roomId}`,
        roomId: data.roomId,
      });

      logger.info('User joined room', {
        userId: userInfo.userId,
        username: userInfo.username,
        roomId: data.roomId,
      });

    } catch (error) {
      logger.error('Error joining room:', error);
      client.emit('error', { message: 'Failed to join room' });
    }
  }

  @SubscribeMessage('leave_room')
  async handleLeaveRoom(
    @MessageBody() data: { roomId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const userInfo = this.connectedUsers.get(client.id);
      if (!userInfo) return;

      await client.leave(data.roomId);
      userInfo.rooms.delete(data.roomId);

      // Notify other users in the room
      client.to(data.roomId).emit('user_left', {
        userId: userInfo.userId,
        username: userInfo.username,
        roomId: data.roomId,
      });

      client.emit('left_room', {
        message: `Left room ${data.roomId}`,
        roomId: data.roomId,
      });

      logger.info('User left room', {
        userId: userInfo.userId,
        username: userInfo.username,
        roomId: data.roomId,
      });

    } catch (error) {
      logger.error('Error leaving room:', error);
      client.emit('error', { message: 'Failed to leave room' });
    }
  }

  @SubscribeMessage('send_message')
  async handleMessage(
    @MessageBody() data: { roomId: string; content: string; messageType?: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const userInfo = this.connectedUsers.get(client.id);
      if (!userInfo) {
        client.emit('error', { message: 'User not authenticated' });
        return;
      }

      if (!userInfo.rooms.has(data.roomId)) {
        client.emit('error', { message: 'You are not in this room' });
        return;
      }

      // Save message to database via gRPC
      const messageResult = await this.messageService.sendMessage({
        userId: userInfo.userId,
        roomId: data.roomId,
        content: data.content,
        messageType: data.messageType || 'text',
      });

      if (!messageResult.success) {
        client.emit('error', { message: 'Failed to send message' });
        return;
      }

      const messageData = {
        id: messageResult.messageData.id,
        userId: userInfo.userId,
        username: userInfo.username,
        roomId: data.roomId,
        content: data.content,
        messageType: data.messageType || 'text',
        createdAt: new Date().toISOString(),
      };

      // Broadcast to all users in the room (including sender)
      this.server.to(data.roomId).emit('new_message', messageData);

      logger.info('Message sent', {
        messageId: messageResult.messageData.id,
        userId: userInfo.userId,
        roomId: data.roomId,
        contentLength: data.content.length,
      });

    } catch (error) {
      logger.error('Error sending message:', error);
      client.emit('error', { message: 'Failed to send message' });
    }
  }

  @SubscribeMessage('typing_start')
  handleTypingStart(
    @MessageBody() data: { roomId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userInfo = this.connectedUsers.get(client.id);
    if (userInfo && userInfo.rooms.has(data.roomId)) {
      client.to(data.roomId).emit('user_typing', {
        userId: userInfo.userId,
        username: userInfo.username,
        roomId: data.roomId,
        isTyping: true,
      });
    }
  }

  @SubscribeMessage('typing_stop')
  handleTypingStop(
    @MessageBody() data: { roomId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userInfo = this.connectedUsers.get(client.id);
    if (userInfo && userInfo.rooms.has(data.roomId)) {
      client.to(data.roomId).emit('user_typing', {
        userId: userInfo.userId,
        username: userInfo.username,
        roomId: data.roomId,
        isTyping: false,
      });
    }
  }
}
