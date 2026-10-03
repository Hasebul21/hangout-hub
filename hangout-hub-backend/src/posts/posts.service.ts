import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { ChatGateway } from '../chat/chat.gateway.js';
import { ListPostsDto } from './dto/list-posts.dto.js';
import { Post } from './post.entity.js';
import { escapeLike, toPostView } from './post-view.js';
import { Reaction, ReactionType } from './reaction.entity.js';

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post) private readonly posts: Repository<Post>,
    @InjectRepository(Reaction)
    private readonly reactions: Repository<Reaction>,
    private readonly dataSource: DataSource,
    private readonly gateway: ChatGateway,
  ) {}

  async create(userId: number, content: string) {
    const now = new Date();
    const post = await this.posts.save(
      this.posts.create({
        authorId: userId,
        content,
        createdAt: now,
        updatedAt: now,
      }),
    );
    await this.publishTrending();
    await this.publishPostCount(userId);
    return this.findOne(post.id, userId);
  }

  async list(query: ListPostsDto, userId: number) {
    const qb = this.posts
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.author', 'author')
      .orderBy('post.createdAt', 'DESC')
      .skip((query.page - 1) * query.size)
      .take(query.size);

    const author = query.author?.trim();
    if (author) {
      qb.andWhere(
        '(author.userName ILIKE :start OR author.userName ILIKE :word)',
        {
          start: `${escapeLike(author)}%`,
          word: `% ${escapeLike(author)}%`,
        },
      );
    }
    const text = query.q?.trim();
    if (text) {
      qb.andWhere('post.content ILIKE :text', {
        text: `%${escapeLike(text)}%`,
      });
    }
    if (query.from) {
      qb.andWhere('post.createdAt >= :from', { from: query.from });
    }
    if (query.to) {
      qb.andWhere('post.createdAt <= :to', { to: query.to });
    }

    const [posts, total] = await qb.getManyAndCount();
    const myReactions = await this.myReactions(
      userId,
      posts.map((post) => post.id),
    );
    return {
      items: posts.map((post) => toPostView(post, myReactions.get(post.id))),
      total,
      page: query.page,
      size: query.size,
    };
  }

  async findOne(id: string, userId: number) {
    const post = await this.posts.findOne({
      where: { id },
      relations: { author: true },
    });
    if (!post) {
      throw new NotFoundException('Post not found');
    }
    const myReactions = await this.myReactions(userId, [id]);
    return toPostView(post, myReactions.get(id));
  }

  async update(id: string, userId: number, content: string) {
    await this.findOwnPost(id, userId);
    await this.posts.update(id, { content, updatedAt: new Date() });
    await this.publishTrending();
    return this.findOne(id, userId);
  }

  async remove(id: string, userId: number) {
    await this.findOwnPost(id, userId);

    await this.posts.delete(id);
    await this.publishTrending();
    await this.publishPostCount(userId);
  }

  async react(id: string, userId: number, type: ReactionType) {
    await this.dataSource.transaction(async (manager) => {
      const post = await manager.findOne(Post, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!post) {
        throw new NotFoundException('Post not found');
      }

      const existing = await manager.findOneBy(Reaction, {
        postId: id,
        userId,
      });
      if (existing && existing.type === type) {
        await manager.delete(Reaction, existing.id);
      } else if (existing) {
        await manager.update(Reaction, existing.id, { type });
      } else {
        await manager.insert(Reaction, { postId: id, userId, type });
      }

      const likeCount = await manager.countBy(Reaction, {
        postId: id,
        type: 'like',
      });
      const dislikeCount = await manager.countBy(Reaction, {
        postId: id,
        type: 'dislike',
      });
      await manager.update(Post, id, { likeCount, dislikeCount });
    });

    await this.publishTrending();
    return this.findOne(id, userId);
  }

  async trending() {
    const posts = await this.posts
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.author', 'author')
      .where('post.likeCount > 0')
      .orderBy('post.likeCount', 'DESC')
      .addOrderBy('post.createdAt', 'DESC')
      .take(8)
      .getMany();
    return posts.map((post) => toPostView(post));
  }

  countByAuthor(authorId: number) {
    return this.posts.countBy({ authorId });
  }

  async ensureExists(id: string) {
    const exists = await this.posts.existsBy({ id });
    if (!exists) {
      throw new NotFoundException('Post not found');
    }
  }

  private async myReactions(userId: number, postIds: string[]) {
    const result = new Map<string, ReactionType>();
    if (!postIds.length) {
      return result;
    }
    const reactions = await this.reactions.findBy({
      userId,
      postId: In(postIds),
    });
    for (const reaction of reactions) {
      result.set(reaction.postId, reaction.type);
    }
    return result;
  }

  private async findOwnPost(id: string, userId: number) {
    const post = await this.posts.findOneBy({ id });
    if (!post) {
      throw new NotFoundException('Post not found');
    }
    if (post.authorId !== userId) {
      throw new ForbiddenException('You can only change your own posts');
    }
    return post;
  }

  private async publishTrending() {
    this.gateway.sendToAll('trending-posts', await this.trending());
  }

  private async publishPostCount(userId: number) {
    const count = await this.countByAuthor(userId);
    this.gateway.sendToUser(userId, 'post-count', { count });
  }
}
