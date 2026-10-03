import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUserId } from '../auth/current-user-id.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { MembersOnlyGuard } from '../auth/members-only.guard.js';
import { ListPostsDto } from './dto/list-posts.dto.js';
import { PostContentDto } from './dto/post-content.dto.js';
import { ReactionDto } from './dto/reaction.dto.js';
import { PostsService } from './posts.service.js';

@Controller('posts')
@UseGuards(JwtAuthGuard)
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get()
  list(@CurrentUserId() userId: number, @Query() query: ListPostsDto) {
    return this.postsService.list(query, userId);
  }

  @Get('count/:userId')
  async count(@Param('userId', ParseIntPipe) userId: number) {
    return { count: await this.postsService.countByAuthor(userId) };
  }

  @Get('trending')
  trending() {
    return this.postsService.trending();
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserId() userId: number,
  ) {
    return this.postsService.findOne(id, userId);
  }

  @Post()
  @UseGuards(MembersOnlyGuard)
  create(@CurrentUserId() userId: number, @Body() body: PostContentDto) {
    return this.postsService.create(userId, body.content);
  }

  @Patch(':id')
  @UseGuards(MembersOnlyGuard)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserId() userId: number,
    @Body() body: PostContentDto,
  ) {
    return this.postsService.update(id, userId, body.content);
  }

  @Post(':id/reaction')
  @UseGuards(MembersOnlyGuard)
  @HttpCode(200)
  react(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserId() userId: number,
    @Body() body: ReactionDto,
  ) {
    return this.postsService.react(id, userId, body.type);
  }

  @Delete(':id')
  @UseGuards(MembersOnlyGuard)
  @HttpCode(204)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserId() userId: number,
  ) {
    return this.postsService.remove(id, userId);
  }
}
