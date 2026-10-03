import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ElasticService } from '../elastic/elastic.service.js';
import { UsersService } from '../users/users.service.js';
import { ListPostsDto } from './dto/list-posts.dto.js';
import { Post, POSTS_INDEX, postMappings } from './post.js';

@Injectable()
export class PostsService implements OnModuleInit {
  constructor(
    private readonly elastic: ElasticService,
    private readonly usersService: UsersService,
  ) {}

  async onModuleInit() {
    await this.elastic.createIndexIfMissing(POSTS_INDEX, postMappings);
  }

  async create(userId: number, content: string) {
    const user = await this.usersService.findById(userId);
    const now = new Date().toISOString();
    const post: Post = {
      id: randomUUID(),
      authorId: user.id,
      authorName: user.userName,
      content,
      likeCount: 0,
      dislikeCount: 0,
      likedBy: [],
      dislikedBy: [],
      createdAt: now,
      updatedAt: now,
    };
    await this.save(post);
    return post;
  }

  async list(query: ListPostsDto) {
    const { items, total } = await this.elastic.search<Post>(POSTS_INDEX, {
      query: { match_all: {} },
      sort: [{ createdAt: 'desc' }],
      from: (query.page - 1) * query.size,
      size: query.size,
      track_total_hits: true,
    });
    return { items, total, page: query.page, size: query.size };
  }

  async findOne(id: string) {
    const post = await this.elastic.getDocument<Post>(POSTS_INDEX, id);
    if (!post) {
      throw new NotFoundException('Post not found');
    }
    return post;
  }

  async update(id: string, userId: number, content: string) {
    const post = await this.findOwnPost(id, userId);
    post.content = content;
    post.updatedAt = new Date().toISOString();
    await this.save(post);
    return post;
  }

  async remove(id: string, userId: number) {
    await this.findOwnPost(id, userId);
    await this.elastic.request(
      'DELETE',
      `/${POSTS_INDEX}/_doc/${encodeURIComponent(id)}?refresh=true`,
    );
  }

  private async findOwnPost(id: string, userId: number) {
    const post = await this.findOne(id);
    if (post.authorId !== userId) {
      throw new ForbiddenException('You can only change your own posts');
    }
    return post;
  }

  private save(post: Post) {
    return this.elastic.request(
      'PUT',
      `/${POSTS_INDEX}/_doc/${encodeURIComponent(post.id)}?refresh=true`,
      post,
    );
  }
}
