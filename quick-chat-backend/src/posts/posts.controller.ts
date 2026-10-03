import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUserId } from '../auth/current-user-id.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CommentsService } from './comments.service.js';
import { ListPostsDto } from './dto/list-posts.dto.js';
import { PostContentDto } from './dto/post-content.dto.js';
import { ReactionDto } from './dto/reaction.dto.js';
import { toPostView } from './post.js';
import { PostsService } from './posts.service.js';

@Controller('posts')
@UseGuards(JwtAuthGuard)
export class PostsController {
  constructor(
    private readonly postsService: PostsService,
    private readonly commentsService: CommentsService,
  ) {}

  @Get()
  async list(@CurrentUserId() userId: number, @Query() query: ListPostsDto) {
    const page = await this.postsService.list(query);
    return {
      ...page,
      items: page.items.map((post) => toPostView(post, userId)),
    };
  }

  @Get('count/:userId')
  async count(@Param('userId', ParseIntPipe) userId: number) {
    return { count: await this.postsService.countByAuthor(userId) };
  }

  @Get('trending')
  async trending(@CurrentUserId() userId: number) {
    const posts = await this.postsService.trending();
    return posts.map((post) => toPostView(post, userId));
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUserId() userId: number) {
    return toPostView(await this.postsService.findOne(id), userId);
  }

  @Post()
  async create(@CurrentUserId() userId: number, @Body() body: PostContentDto) {
    return toPostView(
      await this.postsService.create(userId, body.content),
      userId,
    );
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @CurrentUserId() userId: number,
    @Body() body: PostContentDto,
  ) {
    return toPostView(
      await this.postsService.update(id, userId, body.content),
      userId,
    );
  }

  @Post(':id/reaction')
  @HttpCode(200)
  async react(
    @Param('id') id: string,
    @CurrentUserId() userId: number,
    @Body() body: ReactionDto,
  ) {
    return toPostView(
      await this.postsService.react(id, userId, body.type),
      userId,
    );
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string, @CurrentUserId() userId: number) {
    await this.postsService.remove(id, userId);
    await this.commentsService.removeAllForPost(id);
  }
}
