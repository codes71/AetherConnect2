
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class SendMessageDto {
  @ApiProperty({ description: 'The ID of the room to send the message to.' })
  @IsString()
  @IsNotEmpty()
  roomId: string;

  @ApiProperty({ description: 'The content of the message.' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({ description: 'The type of the message (e.g., text, image, file). Defaults to text.' })
  @IsString()
  @IsOptional()
  messageType?: string;

  @ApiPropertyOptional({ description: 'Optional metadata for the message.' })
  @IsString()
  @IsOptional()
  metadata?: string;
}

export class GetMessageHistoryDto {
  @ApiProperty({ description: 'The ID of the room to retrieve message history from.' })
  @IsString()
  @IsNotEmpty()
  roomId: string;

  @ApiPropertyOptional({ description: 'The page number for pagination. Defaults to 1.' })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: 'The number of messages per page. Defaults to 10.' })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  limit?: number;
}

export class CreateRoomDto {
  @ApiProperty({ description: 'The name of the new room.' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'A description for the new room.' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'The type of the room (public, private, direct).', enum: ['public', 'private', 'direct'] })
  @IsString()
  @IsNotEmpty()
  roomType: string;
}

export class JoinRoomDto {
  @ApiProperty({ description: 'The ID of the room to join.' })
  @IsString()
  @IsNotEmpty()
  roomId: string;
}

export class CheckRoomMembershipDto {
  @ApiProperty({ description: 'The ID of the room to check membership for.' })
  @IsString()
  @IsNotEmpty()
  roomId: string;
}

// Response DTOs (simplified for now, can be expanded with full data structures if needed)
export class MessageResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiPropertyOptional()
  error?: string;
}

export class MessageHistoryResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiPropertyOptional({ type: [Object] })
  messages?: any[]; // Use a more specific DTO if full message data is needed

  @ApiPropertyOptional()
  error?: string;
}

export class RoomsResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiPropertyOptional({ type: [Object] })
  rooms?: any[]; // Use a more specific DTO if full room data is needed

  @ApiPropertyOptional()
  error?: string;
}

export class RoomResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiPropertyOptional({ type: Object })
  room?: any; // Use a more specific DTO if full room data is needed

  @ApiPropertyOptional()
  error?: string;
}

export class RoomMembershipResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty()
  isMember: boolean;

  @ApiPropertyOptional()
  roomType?: string;

  @ApiPropertyOptional()
  room?: any;

  @ApiPropertyOptional()
  error?: string;
}
