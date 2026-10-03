import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUserId } from '../auth/current-user-id.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CommentsService } from './comments.service.js';
import { PostContentDto } from './dto/post-content.dto.js';

@Controller('posts/:postId/comments')
@UseGuards(JwtAuthGuard)
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get()
  list(@Param('postId') postId: string) {
    return this.commentsService.list(postId);
  }

  @Post()
  add(
    @Param('postId') postId: string,
    @CurrentUserId() userId: number,
    @Body() body: PostContentDto,
  ) {
    return this.commentsService.add(postId, userId, body.content);
  }

  @Delete(':commentId')
  @HttpCode(204)
  remove(
    @Param('postId') postId: string,
    @Param('commentId') commentId: string,
    @CurrentUserId() userId: number,
  ) {
    return this.commentsService.remove(postId, commentId, userId);
  }
}
