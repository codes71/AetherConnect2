import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { Injectable, Logger } from "@nestjs/common";
import { AuthGrpcClient } from "@aether/shared";
import { MessageService } from "../message/message.service";
import Redis from "ioredis";
import { createAdapter } from "@socket.io/redis-adapter";

const logger = new Logger("SocketGateway");

interface JoinRoomData {
  roomId: string;
}

interface SendMessageData {
  roomId: string;
  content: string;
  messageType?: string;
  tempId?: string; // For optimistic updates
}

interface TypingData {
  roomId: string;
}

interface UserRateLimit {
  lastMessage: number;
  messageCount: number;
}

@Injectable()
@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3004",
    credentials: true,
  },
})
export class SocketGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
  @WebSocketServer() server: Server;
  private authClient: AuthGrpcClient;
  private userRateLimits = new Map<string, UserRateLimit>();
  private readonly MESSAGE_RATE_LIMIT = 10;
  private readonly MESSAGE_MAX_LENGTH = 1000;
  private typingTimers = new Map<string, NodeJS.Timeout>();
  private redisInitialized = false;

  constructor(private readonly messageService: MessageService) {
    this.authClient = new AuthGrpcClient(
      process.env.AUTH_SERVICE_GRPC_URL || "localhost:50001"
    );
  }

  afterInit(server: Server) {
    if (!this.redisInitialized) {
      this.setupRedisAdapter(server);
      this.redisInitialized = true;
    }
  }

  private setupRedisAdapter(server: Server) {
    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
    try {
      logger.log(`🔄 Setting up Redis adapter...`);
      
      const pubClient = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        connectTimeout: 10000,
      });

      pubClient.on('error', (err) => logger.error('❌ Redis PubClient Error', err));
      pubClient.on('connect', () => logger.log('✅ Redis PubClient Connected'));
      
      const subClient = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        connectTimeout: 10000,
      });

      subClient.on('error', (err) => logger.error('❌ Redis SubClient Error', err));
      subClient.on('connect', () => logger.log('✅ Redis SubClient Connected'));
      
      server.adapter(createAdapter(pubClient, subClient));
      logger.log("✅ Redis adapter configured successfully");
    } catch (error) {
      logger.error("❌ Failed to configure Redis adapter", error.message);
    }
  }

  private checkRateLimit(userId: string): boolean {
    const now = Date.now();
    const userLimit = this.userRateLimits.get(userId) || {
      lastMessage: 0,
      messageCount: 0,
    };

    if (now - userLimit.lastMessage > 60000) {
      userLimit.messageCount = 0;
    }

    userLimit.messageCount++;
    userLimit.lastMessage = now;
    this.userRateLimits.set(userId, userLimit);

    return userLimit.messageCount <= this.MESSAGE_RATE_LIMIT;
  }

  private validateMessage(content: string): { valid: boolean; error?: string } {
    if (!content || content.trim().length === 0) {
      return { valid: false, error: "Message cannot be empty" };
    }

    if (content.length > this.MESSAGE_MAX_LENGTH) {
      return { valid: false, error: "Message too long" };
    }

    const sanitized = content.replace(
      /<script\b[^<]*(?:(?!<\/script>)[^<]*)*<\/script>/gi,
      ""
    );
    if (sanitized !== content) {
      return { valid: false, error: "Invalid content detected" };
    }

    return { valid: true };
  }

  async handleConnection(client: Socket) {
    try {
      logger.log(`🔌 Client attempting to connect: ${client.id}`);
      const token = client.handshake.auth?.token;
      
      if (!token) {
        logger.warn(`❌ Connection rejected: No token provided for ${client.id}`);
        client.emit('error', { message: 'Authentication required' });
        client.disconnect();
        return;
      }

      const authResult = await this.authClient.ValidateToken({ token });
      if (!authResult.success || !authResult.isValid) {
        logger.warn(`❌ Connection rejected: Invalid token for ${client.id}`);
        client.emit('error', { message: 'Invalid token' });
        client.disconnect();
        return;
      }

      client.data.userId = authResult.user.id;
      client.data.username = authResult.user.username;

      client.emit("connected", {
        message: "Successfully connected",
        user: {
          id: authResult.user.id,
          username: authResult.user.username,
        },
      });

      logger.log(`✅ Client connected successfully: ${client.id} (User: ${authResult.user.username})`);
    } catch (error) {
      logger.error(`💥 Connection error for ${client.id}:`, error.stack);
      client.emit('error', { message: 'Connection failed' });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    logger.log(`👋 Client disconnected: ${client.id} (User: ${client.data?.username || "Unknown"})`);
    
    const userId = client.data?.userId;
    if (userId) {
      for (const [key, timer] of this.typingTimers.entries()) {
        if (key.startsWith(userId)) {
          clearTimeout(timer);
          this.typingTimers.delete(key);
        }
      }
    }
  }

  @SubscribeMessage("join_room")
  async handleJoinRoom(
    @MessageBody() data: JoinRoomData,
    @ConnectedSocket() client: Socket
  ) {
    try {
      if (!client.data?.userId) {
        client.emit('error', { message: 'User not authenticated', context: 'join_room' });
        return;
      }

      logger.log(`🏠 User ${client.data.username} attempting to join room: ${data.roomId}`);
      
      const membershipResult = await this.messageService.checkRoomMembership({
        userId: client.data.userId,
        roomId: data.roomId,
      });

      if (!membershipResult.success) {
        client.emit('error', { 
          message: membershipResult.message || "Failed to check room membership",
          context: 'join_room'
        });
        return;
      }

      if (!membershipResult.isMember) {
        if (membershipResult.roomType === "public") {
          // Fire and forget - don't wait for join completion
          this.messageService.joinRoom({
            userId: client.data.userId,
            roomId: data.roomId,
          }).catch(error => {
            logger.error(`Failed to auto-join public room ${data.roomId}:`, error);
          });
          
          logger.log(`🚀 Auto-joining user ${client.data.username} to public room: ${data.roomId}`);
        } else {
          client.emit('error', { 
            message: "You are not a member of this private room",
            context: 'join_room'
          });
          return;
        }
      }

      await client.join(data.roomId);
      logger.log(`🎯 Socket joined room: ${data.roomId}`);

      // Fire and forget notifications
      client.to(data.roomId).emit("user_joined", {
        userId: client.data.userId,
        username: client.data.username,
        roomId: data.roomId,
      });

      client.emit("joined_room", {
        message: `Joined room ${data.roomId}`,
        roomId: data.roomId,
      });

      logger.log(`🎉 User ${client.data.username} successfully joined room: ${data.roomId}`);
    } catch (error) {
      logger.error(`Error joining room ${data.roomId}:`, error);
      client.emit('error', { message: 'Failed to join room', context: 'join_room' });
    }
  }

  @SubscribeMessage("send_message")
  async handleSendMessage(
    @MessageBody() data: SendMessageData,
    @ConnectedSocket() client: Socket
  ): Promise<void> { // 🔥 Fire and forget - no return value
    try {
      // Quick validation checks first
      if (!client.data?.userId) {
        client.emit("message_error", { 
          message: "User not authenticated",
          tempId: data.tempId,
          timestamp: Date.now()
        });
        return;
      }

      if (!this.checkRateLimit(client.data.userId)) {
        client.emit("message_error", { 
          message: "Too many messages, please slow down",
          tempId: data.tempId,
          timestamp: Date.now()
        });
        return;
      }

      const validationResult = this.validateMessage(data.content);
      if (!validationResult.valid) {
        client.emit("message_error", { 
          message: validationResult.error,
          tempId: data.tempId,
          timestamp: Date.now()
        });
        return;
      }

      // 🚀 IMMEDIATELY broadcast optimistic message for instant UI update
      const optimisticMessage = {
        id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId: client.data.userId,
        username: client.data.username,
        roomId: data.roomId,
        content: data.content,
        messageType: data.messageType || "text",
        createdAt: new Date().toISOString(),
        tempId: data.tempId,
        status: 'sending'
      };

      this.server.to(data.roomId).emit("new_message", optimisticMessage);
      logger.log(`🚀 Optimistic message broadcasted to room ${data.roomId}`);

      // 🔥 Fire and forget - process in background
      this.processMessageAsync(client, data, optimisticMessage).catch(error => {
        logger.error('Background message processing failed:', error);
        
        // Send error notification but don't block
        client.emit("message_error", { 
          message: "Message failed to save",
          tempId: data.tempId,
          originalMessageId: optimisticMessage.id,
          timestamp: Date.now()
        });
      });

    } catch (error) {
      logger.error(`Error in send_message handler:`, error);
      client.emit("message_error", { 
        message: "Internal server error",
        tempId: data.tempId,
        timestamp: Date.now()
      });
    }
  }

  // 🔥 Background processing - no blocking
  private async processMessageAsync(
    client: Socket, 
    data: SendMessageData, 
    optimisticMessage: any
  ) {
    // Check room membership in background
    const membershipResult = await this.messageService.checkRoomMembership({
      userId: client.data.userId,
      roomId: data.roomId,
    });

    if (!membershipResult.success || !membershipResult.isMember) {
      throw new Error("User not in room");
    }

    // Get fresh user profile
    const userResult = await this.authClient.GetUserProfile({
      userId: client.data.userId,
    });
    const username = userResult.success ? userResult.user.username : client.data.username;

    // Save to database
    const messageResult = await this.messageService.sendMessage({
      userId: client.data.userId,
      username: username,
      roomId: data.roomId,
      content: data.content,
      messageType: data.messageType || "text",
    });

    if (!messageResult.success) {
      throw new Error(messageResult.message || "Failed to save message");
    }

    // Send final confirmed message with real ID
    const confirmedMessage = {
      id: messageResult.messageData.id,
      userId: client.data.userId,
      username: username,
      roomId: data.roomId,
      content: data.content,
      messageType: data.messageType || "text",
      createdAt: messageResult.messageData.createdAt || new Date().toISOString(),
      tempId: data.tempId,
      status: 'confirmed'
    };

    this.server.to(data.roomId).emit("message_confirmed", confirmedMessage);
    logger.log(`✅ Message confirmed and saved: ${messageResult.messageData.id}`);
  }

  @SubscribeMessage("leave_room")
  async handleLeaveRoom(
    @MessageBody() data: JoinRoomData,
    @ConnectedSocket() client: Socket
  ) {
    if (!client.data?.userId) return;

    logger.log(`🚪 User ${client.data.username} leaving room: ${data.roomId}`);
    await client.leave(data.roomId);

    // Fire and forget notifications
    client.to(data.roomId).emit("user_left", {
      userId: client.data.userId,
      username: client.data.username,
      roomId: data.roomId,
    });

    client.emit("left_room", {
      message: `Left room ${data.roomId}`,
      roomId: data.roomId,
    });

    logger.log(`👋 User ${client.data.username} left room: ${data.roomId}`);
  }

  @SubscribeMessage("typing_start")
  async handleTypingStart(
    @MessageBody() data: TypingData,
    @ConnectedSocket() client: Socket
  ) {
    if (!client.data?.userId) return;

    const typingKey = `${client.data.userId}-${data.roomId}`;

    const existingTimer = this.typingTimers.get(typingKey);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(() => {
      client.to(data.roomId).emit("user_typing", {
        userId: client.data.userId,
        username: client.data.username,
        roomId: data.roomId,
        isTyping: false,
      });
      this.typingTimers.delete(typingKey);
    }, 3000);

    this.typingTimers.set(typingKey, timer);

    client.to(data.roomId).emit("user_typing", {
      userId: client.data.userId,
      username: client.data.username,
      roomId: data.roomId,
      isTyping: true,
    });
  }

  @SubscribeMessage("typing_stop")
  async handleTypingStop(
    @MessageBody() data: TypingData,
    @ConnectedSocket() client: Socket
  ) {
    if (!client.data?.userId) return;

    const typingKey = `${client.data.userId}-${data.roomId}`;
    const existingTimer = this.typingTimers.get(typingKey);
    if (existingTimer) {
      clearTimeout(existingTimer);
      this.typingTimers.delete(typingKey);
    }

    client.to(data.roomId).emit("user_typing", {
      userId: client.data.userId,
      username: client.data.username,
      roomId: data.roomId,
      isTyping: false,
    });
  }
}