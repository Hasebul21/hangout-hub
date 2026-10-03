import {
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUserId } from '../auth/current-user-id.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { MessagesService } from './messages.service.js';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get('unread')
  unread(@CurrentUserId() currentUserId: number) {
    return this.messagesService.unreadCounts(currentUserId);
  }

  @Post(':userId/read')
  @HttpCode(204)
  markAsRead(
    @CurrentUserId() currentUserId: number,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.messagesService.markAsRead(currentUserId, userId);
  }

  @Get(':userId/search')
  search(
    @CurrentUserId() currentUserId: number,
    @Param('userId', ParseIntPipe) userId: number,
    @Query('q') q: string,
  ) {
    return this.messagesService.search(currentUserId, userId, q);
  }

  @Get(':userId')
  conversation(
    @CurrentUserId() currentUserId: number,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.messagesService.conversation(currentUserId, userId);
  }
}
