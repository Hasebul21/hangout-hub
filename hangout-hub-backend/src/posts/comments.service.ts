import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment } from './comment.entity.js';
import { Post } from './post.entity.js';
import { toCommentView } from './post-view.js';
import { PostsService } from './posts.service.js';

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment) private readonly comments: Repository<Comment>,
    @InjectRepository(Post) private readonly posts: Repository<Post>,
    private readonly postsService: PostsService,
  ) {}

  async list(postId: string) {
    const comments = await this.comments.find({
      where: { postId },
      relations: { author: true },
      order: { createdAt: 'ASC' },
      take: 200,
    });
    return comments.map(toCommentView);
  }

  async add(postId: string, userId: number, content: string) {
    await this.postsService.ensureExists(postId);
    const comment = await this.comments.save(
      this.comments.create({ postId, authorId: userId, content }),
    );
    await this.updateCommentCount(postId);

    const saved = await this.comments.findOneOrFail({
      where: { id: comment.id },
      relations: { author: true },
    });
    return toCommentView(saved);
  }

  async remove(postId: string, commentId: string, userId: number) {
    const comment = await this.comments.findOneBy({ id: commentId, postId });
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }
    if (comment.authorId !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }
    await this.comments.delete(commentId);
    await this.updateCommentCount(postId);
  }

  private async updateCommentCount(postId: string) {
    const commentCount = await this.comments.countBy({ postId });
    await this.posts.update(postId, { commentCount });
  }
}
