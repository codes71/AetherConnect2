import { Controller, Get, UseGuards, Req, Param, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MessageService } from './message.service';
import { Request } from 'express';

@Controller('api/rooms')
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async getRooms(@Req() req: Request) {
    const userId = req.user.userId;
    return this.messageService.getRooms(userId);
  }

  @Get(':roomId/messages')
  @UseGuards(JwtAuthGuard)
  async getMessageHistory(
    @Req() req: Request,
    @Param('roomId') roomId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    const userId = req.user.userId;
    return this.messageService.getMessageHistory(roomId, page, limit, userId);
  }
}
