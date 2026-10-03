import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUserId } from '../auth/current-user-id.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { ListPostsDto } from './dto/list-posts.dto.js';
import { PostContentDto } from './dto/post-content.dto.js';
import { PostsService } from './posts.service.js';

@Controller('posts')
@UseGuards(JwtAuthGuard)
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get()
  list(@Query() query: ListPostsDto) {
    return this.postsService.list(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.postsService.findOne(id);
  }

  @Post()
  create(@CurrentUserId() userId: number, @Body() body: PostContentDto) {
    return this.postsService.create(userId, body.content);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUserId() userId: number,
    @Body() body: PostContentDto,
  ) {
    return this.postsService.update(id, userId, body.content);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string, @CurrentUserId() userId: number) {
    return this.postsService.remove(id, userId);
  }
}
