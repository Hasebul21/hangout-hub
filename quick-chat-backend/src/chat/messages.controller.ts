import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { CurrentUserId } from '../auth/current-user-id.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { MessagesService } from './messages.service.js';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get(':userId')
  conversation(
    @CurrentUserId() currentUserId: number,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.messagesService.conversation(currentUserId, userId);
  }
}
