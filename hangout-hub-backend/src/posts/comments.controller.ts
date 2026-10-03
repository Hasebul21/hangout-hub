import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUserId } from '../auth/current-user-id.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { MembersOnlyGuard } from '../auth/members-only.guard.js';
import { CommentsService } from './comments.service.js';
import { PostContentDto } from './dto/post-content.dto.js';

@Controller('posts/:postId/comments')
@UseGuards(JwtAuthGuard)
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get()
  list(@Param('postId', ParseUUIDPipe) postId: string) {
    return this.commentsService.list(postId);
  }

  @Post()
  @UseGuards(MembersOnlyGuard)
  add(
    @Param('postId', ParseUUIDPipe) postId: string,
    @CurrentUserId() userId: number,
    @Body() body: PostContentDto,
  ) {
    return this.commentsService.add(postId, userId, body.content);
  }

  @Delete(':commentId')
  @UseGuards(MembersOnlyGuard)
  @HttpCode(204)
  remove(
    @Param('postId', ParseUUIDPipe) postId: string,
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @CurrentUserId() userId: number,
  ) {
    return this.commentsService.remove(postId, commentId, userId);
  }
}
