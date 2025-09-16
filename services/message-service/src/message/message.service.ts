import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
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

      let room;
      if (Types.ObjectId.isValid(data.roomId)) {
        room = await this.roomModel.findById(data.roomId).exec();
      } else {
        room = await this.roomModel.findOne({ name: data.roomId }).exec();
      }

      if (!room) {
        return {
          success: false,
          message: 'Room not found',
        };
      }

      const messages = await this.messageModel
        .find({ roomId: room._id.toString() })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec();

      const totalMessages = await this.messageModel.countDocuments({ roomId: room._id.toString() });
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
      const members = [data.createdBy];
      // Temporary hack: Manually add a dummy user to the 'general' room
      if (data.name === 'general') {
        members.push('dummy-user-id-for-general-room'); // Replace with a real user ID if available
      }

      const room = new this.roomModel({
        name: data.name,
        description: data.description,
        roomType: data.roomType || 'public',
        createdBy: data.createdBy,
        members: members, // Use the modified members array
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
      console.log("USER ID",data.userId)
      const rooms = await this.roomModel
        .find({ members: data.userId })
        .sort({ updatedAt: -1 })
        .exec();

      if (!rooms || rooms.length === 0) {
        return {
          success: true,
          message: 'No rooms joined yet.',
          rooms: [],
        };
      }

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
    logger.info('Attempting to join room', { userId: data.userId, roomId: data.roomId });
    try {
      let room;
      // Check if roomId is a valid ObjectId
      if (Types.ObjectId.isValid(data.roomId)) {  
        // Query by MongoDB _id
        room = await this.roomModel.findById(data.roomId);
      } else {
        // Query by room name (for cases like "general")
        room = await this.roomModel.findOne({ name: data.roomId });
      }
      
      if (!room) {
        return {
          success: false,
          message: 'Room not found',
        };
      }

      if (!room.members.includes(data.userId)) {
        logger.info('Adding user to room members', { userId: data.userId, roomId: room.name });
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

  async checkRoomMembership(data: { userId: string; roomId: string }) {
    try {
      let room;
      logger.info('Checking room membershipppn from service',{data})
      
      // Check if roomId is a valid ObjectId
      if (Types.ObjectId.isValid(data.roomId)) {
        // Query by MongoDB _id
        room = await this.roomModel.findById(data.roomId);
      } else {
        // Query by room name (for cases like "general")
        room = await this.roomModel.findOne({ name: data.roomId });
      }
      const isPublic = room?.roomId == 'general';

      if (!room) {
        console.log(isPublic)
        return { 
          success: false, 
          isMember: false, 
          message: `Room '${data.roomId}' not found`,
          roomType: 'public' // Added roomType for consistency
        };
      }

      // Check membership
      const isMember = room.members.includes(data.userId) || room.roomType === 'public';
      
      return {
        success: true,
        isMember,
        roomType: room.roomType,
        message: isMember ? 'User is a member' : 'User is not a member', // Added message for consistency
        room: {
          id: room._id.toString(),
          name: room.name,
          roomType: room.roomType // Added roomType for consistency
        }
      };
    } catch (error) {
      logger.error('Check room membership failed', error);
      return { 
        success: false, 
        isMember: false, 
        message: 'Failed to check room membership',
        error: error.message,
        roomType: null
      };
    }
  }

  // Also add a method to ensure users can always join public rooms
  async ensureRoomAccess(data: { userId: string; roomId: string }) {
    try {
      const membershipResult = await this.checkRoomMembership(data);
      
      if (!membershipResult.success) {
        return membershipResult;
      }

      if (membershipResult.isMember) {
        return {
          success: true,
          message: 'User already has access',
          room: membershipResult.room
        };
      }

      // If it's a public room, auto-join the user
      if (membershipResult.roomType === 'public') {
        return this.joinRoom(data);
      }

      return {
        success: false,
        message: 'User cannot access this private room'
      };
    } catch (error) {
      logger.error('Ensure room access failed', error);
      return {
        success: false,
        message: 'Failed to ensure room access',
        error: error.message
      };
    }
  }

  async getRoomById(roomId: string) {
    try {
      let room;
      // Check if roomId is a valid ObjectId
      if (Types.ObjectId.isValid(roomId)) {  
        // Query by MongoDB _id
        room = await this.roomModel.findById(roomId).exec();
      } else {
        // Query by room name (for cases like "general")
        room = await this.roomModel.findOne({ name: roomId }).exec();
      }

      if (!room) {
        return {
          success: false,
          message: 'Room not found',
        };
      }

      return {
        success: true,
        message: 'Room retrieved successfully',
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
      logger.error('Get room by ID failed:', error);
      return {
        success: false,
        message: 'Failed to retrieve room',
        error: error.message,
      };
    }
  }
}