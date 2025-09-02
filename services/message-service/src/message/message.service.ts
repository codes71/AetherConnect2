import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Message, MessageDocument } from './schemas/message.schema';
import { Room, RoomDocument } from './schemas/room.schema';
import { createServiceLogger } from '@aether/shared';
import { v4 as uuidv4 } from 'uuid';

const logger = createServiceLogger('message-service-logic');

@Injectable()
export class MessageService {
  constructor(
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    @InjectModel(Room.name) private roomModel: Model<RoomDocument>,
  ) {}

  async sendMessage(data: any) {
    try {
      const message = new this.messageModel({
        userId: data.userId,
        username: data.username || 'Unknown',
        roomId: data.roomId,
        content: data.content,
        messageType: data.messageType || 'text',
        metadata: data.metadata,
      });

      const savedMessage = await message.save();

      return {
        success: true,
        message: 'Message sent successfully',
        messageData: {
          id: savedMessage._id.toString(),
          userId: savedMessage.userId,
          username: savedMessage.username,
          roomId: savedMessage.roomId,
          content: savedMessage.content,
          messageType: savedMessage.messageType,
          metadata: savedMessage.metadata,
          createdAt: savedMessage.createdAt.toISOString(),
          updatedAt: savedMessage.updatedAt.toISOString(),
        },
      };
    } catch (error) {
      logger.error('Send message failed:', error);
      return {
        success: false,
        message: 'Failed to send message',
        error: error.message,
      };
    }
  }

  async getMessageHistory(data: any) {
    try {
      const page = parseInt(data.page) || 1;
      const limit = Math.min(parseInt(data.limit) || 50, 100); // Max 100 messages per request
      const skip = (page - 1) * limit;

      const messages = await this.messageModel
        .find({ roomId: data.roomId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec();

      const totalMessages = await this.messageModel.countDocuments({ roomId: data.roomId });
      const totalPages = Math.ceil(totalMessages / limit);

      return {
        success: true,
        message: 'Message history retrieved successfully',
        messages: messages.reverse().map(msg => ({
          id: msg._id.toString(),
          userId: msg.userId,
          username: msg.username,
          roomId: msg.roomId,
          content: msg.content,
          messageType: msg.messageType,
          metadata: msg.metadata,
          createdAt: msg.createdAt.toISOString(),
          updatedAt: msg.updatedAt.toISOString(),
        })),
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: totalMessages,
          itemsPerPage: limit,
          hasNext: page < totalPages,
          hasPrevious: page > 1,
        },
      };
    } catch (error) {
      logger.error('Get message history failed:', error);
      return {
        success: false,
        message: 'Failed to get message history',
        error: error.message,
      };
    }
  }

  async createRoom(data: any) {
    try {
      const room = new this.roomModel({
        name: data.name,
        description: data.description,
        roomType: data.roomType || 'public',
        createdBy: data.createdBy,
        members: [data.createdBy],
      });

      const savedRoom = await room.save();

      return {
        success: true,
        message: 'Room created successfully',
        room: {
          id: savedRoom._id.toString(),
          name: savedRoom.name,
          description: savedRoom.description,
          roomType: savedRoom.roomType,
          createdBy: savedRoom.createdBy,
          members: savedRoom.members,
          createdAt: savedRoom.createdAt.toISOString(),
          updatedAt: savedRoom.updatedAt.toISOString(),
        },
      };
    } catch (error) {
      logger.error('Create room failed:', error);
      return {
        success: false,
        message: 'Failed to create room',
        error: error.message,
      };
    }
  }

  async getRooms(data: any) {
    try {
      const rooms = await this.roomModel
        .find({ 
          $or: [
            { members: data.userId },
            { roomType: 'public' }
          ]
        })
        .sort({ updatedAt: -1 })
        .exec();

      return {
        success: true,
        message: 'Rooms retrieved successfully',
        rooms: rooms.map(room => ({
          id: room._id.toString(),
          name: room.name,
          description: room.description,
          roomType: room.roomType,
          createdBy: room.createdBy,
          members: room.members,
          createdAt: room.createdAt.toISOString(),
          updatedAt: room.updatedAt.toISOString(),
        })),
      };
    } catch (error) {
      logger.error('Get rooms failed:', error);
      return {
        success: false,
        message: 'Failed to get rooms',
        error: error.message,
      };
    }
  }

  async joinRoom(data: any) {
    try {
      const room = await this.roomModel.findById(data.roomId);
      
      if (!room) {
        return {
          success: false,
          message: 'Room not found',
        };
      }

      if (!room.members.includes(data.userId)) {
        room.members.push(data.userId);
        await room.save();
      }

      return {
        success: true,
        message: 'Joined room successfully',
        room: {
          id: room._id.toString(),
          name: room.name,
          description: room.description,
          roomType: room.roomType,
          createdBy: room.createdBy,
          members: room.members,
          createdAt: room.createdAt.toISOString(),
          updatedAt: room.updatedAt.toISOString(),
        },
      };
    } catch (error) {
      logger.error('Join room failed:', error);
      return {
        success: false,
        message: 'Failed to join room',
        error: error.message,
      };
    }
  }
}
