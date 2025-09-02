import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type RoomDocument = Room & Document;

@Schema({ timestamps: true })
export class Room {
  @Prop({ required: true })
  name: string;

  @Prop()
  description: string;

  @Prop({ required: true, enum: ['public', 'private', 'direct'], default: 'public' })
  roomType: string;

  @Prop({ required: true })
  createdBy: string;

  @Prop({ type: [String], default: [] })
  members: string[];

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const RoomSchema = SchemaFactory.createForClass(Room);

// Add indexes
RoomSchema.index({ createdBy: 1 });
RoomSchema.index({ members: 1 });
RoomSchema.index({ roomType: 1 });
