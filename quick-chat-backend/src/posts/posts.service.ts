import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ChatGateway } from '../chat/chat.gateway.js';
import { ElasticService } from '../elastic/elastic.service.js';
import { UsersService } from '../users/users.service.js';
import { ListPostsDto } from './dto/list-posts.dto.js';
import {
  Post,
  POSTS_INDEX,
  postMappings,
  Reaction,
  toPostView,
} from './post.js';

// Toggles the user's vote. Liking removes an earlier dislike and the other way
// round, clicking the same button twice takes the vote back.
const REACT_SCRIPT = `
  def mine = params.type == 'like' ? ctx._source.likedBy : ctx._source.dislikedBy;
  def other = params.type == 'like' ? ctx._source.dislikedBy : ctx._source.likedBy;
  if (mine.contains(params.userId)) {
    mine.removeIf(id -> id == params.userId);
  } else {
    mine.add(params.userId);
    other.removeIf(id -> id == params.userId);
  }
  ctx._source.likeCount = ctx._source.likedBy.size();
  ctx._source.dislikeCount = ctx._source.dislikedBy.size();
`;

@Injectable()
export class PostsService implements OnModuleInit {
  constructor(
    private readonly elastic: ElasticService,
    private readonly usersService: UsersService,
    private readonly gateway: ChatGateway,
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
      commentCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    await this.save(post);
    await this.publishTrending();
    await this.publishPostCount(user.id);
    return post;
  }

  async list(query: ListPostsDto) {
    const filters: object[] = [];
    if (query.author?.trim()) {
      filters.push({
        match_phrase_prefix: { authorName: query.author.trim() },
      });
    }
    if (query.q?.trim()) {
      filters.push({
        match: { content: { query: query.q.trim(), operator: 'and' } },
      });
    }
    if (query.from || query.to) {
      filters.push({
        range: { createdAt: { gte: query.from, lte: query.to } },
      });
    }

    const { items, total } = await this.elastic.search<Post>(POSTS_INDEX, {
      query: filters.length ? { bool: { must: filters } } : { match_all: {} },
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
    await this.publishTrending();
    return post;
  }

  async remove(id: string, userId: number) {
    await this.findOwnPost(id, userId);
    await this.elastic.request(
      'DELETE',
      `/${POSTS_INDEX}/_doc/${encodeURIComponent(id)}?refresh=true`,
    );
    await this.publishTrending();
    await this.publishPostCount(userId);
  }

  async countByAuthor(authorId: number) {
    const data = await this.elastic.request('POST', `/${POSTS_INDEX}/_count`, {
      query: { term: { authorId } },
    });
    return data.count as number;
  }

  private async publishPostCount(userId: number) {
    const count = await this.countByAuthor(userId);
    this.gateway.sendToUser(userId, 'post-count', { count });
  }

  async react(id: string, userId: number, type: Reaction) {
    await this.findOne(id);
    await this.elastic.request(
      'POST',
      `/${POSTS_INDEX}/_update/${encodeURIComponent(id)}?refresh=true&retry_on_conflict=3`,
      { script: { source: REACT_SCRIPT, params: { userId, type } } },
    );
    await this.publishTrending();
    return this.findOne(id);
  }

  async trending() {
    const { items } = await this.elastic.search<Post>(POSTS_INDEX, {
      query: { range: { likeCount: { gt: 0 } } },
      sort: [{ likeCount: 'desc' }, { createdAt: 'desc' }],
      size: 8,
    });
    return items;
  }

  // everyone watching the home page gets the new ranking
  private async publishTrending() {
    const posts = await this.trending();
    this.gateway.sendToAll(
      'trending-posts',
      posts.map((post) => toPostView(post, 0)),
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
