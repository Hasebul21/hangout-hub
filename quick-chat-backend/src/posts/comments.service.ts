import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ElasticService } from '../elastic/elastic.service.js';
import { UsersService } from '../users/users.service.js';
import { POSTS_INDEX } from './post.js';
import { PostsService } from './posts.service.js';

const INDEX = 'quickchat_comments';

export interface Comment {
  id: string;
  postId: string;
  authorId: number;
  authorName: string;
  content: string;
  createdAt: string;
}

@Injectable()
export class CommentsService implements OnModuleInit {
  constructor(
    private readonly elastic: ElasticService,
    private readonly usersService: UsersService,
    private readonly postsService: PostsService,
  ) {}

  async onModuleInit() {
    await this.elastic.createIndexIfMissing(INDEX, {
      properties: {
        id: { type: 'keyword' },
        postId: { type: 'keyword' },
        authorId: { type: 'integer' },
        authorName: { type: 'keyword' },
        content: { type: 'text' },
        createdAt: { type: 'date' },
      },
    });
  }

  async list(postId: string) {
    const { items } = await this.elastic.search<Comment>(INDEX, {
      query: { term: { postId } },
      sort: [{ createdAt: 'asc' }],
      size: 200,
    });
    return items;
  }

  async add(postId: string, userId: number, content: string) {
    await this.postsService.findOne(postId);
    const user = await this.usersService.findById(userId);

    const comment: Comment = {
      id: randomUUID(),
      postId,
      authorId: user.id,
      authorName: user.userName,
      content,
      createdAt: new Date().toISOString(),
    };
    await this.elastic.request(
      'PUT',
      `/${INDEX}/_doc/${comment.id}?refresh=true`,
      comment,
    );
    await this.changeCommentCount(postId, 1);
    return comment;
  }

  async remove(postId: string, commentId: string, userId: number) {
    const comment = await this.elastic.getDocument<Comment>(INDEX, commentId);
    if (!comment || comment.postId !== postId) {
      throw new NotFoundException('Comment not found');
    }
    if (comment.authorId !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }
    await this.elastic.request(
      'DELETE',
      `/${INDEX}/_doc/${commentId}?refresh=true`,
    );
    await this.changeCommentCount(postId, -1);
  }

  async removeAllForPost(postId: string) {
    await this.elastic.request(
      'POST',
      `/${INDEX}/_delete_by_query?refresh=true`,
      { query: { term: { postId } } },
    );
  }

  private async changeCommentCount(postId: string, delta: number) {
    await this.elastic.request(
      'POST',
      `/${POSTS_INDEX}/_update/${encodeURIComponent(postId)}?refresh=true&retry_on_conflict=3`,
      {
        script: {
          source:
            'ctx._source.commentCount = Math.max(0, (ctx._source.commentCount == null ? 0 : ctx._source.commentCount) + params.delta)',
          params: { delta },
        },
      },
    );
  }
}
