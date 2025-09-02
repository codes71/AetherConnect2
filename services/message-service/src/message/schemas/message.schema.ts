import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MessageDocument = Message & Document;

@Schema({ timestamps: true })
export class Message {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  username: string;

  @Prop({ required: true })
  roomId: string;

  @Prop({ required: true })
  content: string;

  @Prop({ required: true, enum: ['text', 'image', 'file'], default: 'text' })
  messageType: string;

  @Prop({ type: Object, required: false })
  metadata?: any;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);

// Add indexes for better query performance
MessageSchema.index({ roomId: 1, createdAt: -1 });
MessageSchema.index({ userId: 1, createdAt: -1 });
