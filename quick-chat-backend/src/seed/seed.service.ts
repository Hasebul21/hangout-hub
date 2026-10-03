import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { ElasticService } from '../elastic/elastic.service.js';
import { Post, POSTS_INDEX, postMappings } from '../posts/post.js';
import { User } from '../users/user.entity.js';
import { OWNER, OWNER_POSTS } from './owner.js';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly elastic: ElasticService,
    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap() {
    const owner = await this.seedOwner();
    await this.seedOwnerPosts(owner);
  }

  private async seedOwner() {
    const existing = await this.users.findOneBy({ email: OWNER.email });
    if (existing) {
      if (!existing.isOwner) {
        existing.isOwner = true;
        await this.users.save(existing);
      }
      return existing;
    }

    const password =
      this.config.get<string>('OWNER_PASSWORD') || OWNER.defaultPassword;
    const owner = this.users.create({
      userName: OWNER.userName,
      email: OWNER.email,
      password: await bcrypt.hash(password, 10),
      professionalTitle: OWNER.professionalTitle,
      portfolio: OWNER.portfolio,
      skills: OWNER.skills,
      bio: OWNER.bio,
      isOwner: true,
    });
    await this.users.save(owner);
    this.logger.log(`Created owner account ${OWNER.email}`);
    return owner;
  }

  private async seedOwnerPosts(owner: User) {
    await this.elastic.createIndexIfMissing(POSTS_INDEX, postMappings);
    const data = await this.elastic.request('POST', `/${POSTS_INDEX}/_count`, {
      query: { term: { authorId: owner.id } },
    });
    if (data.count > 0) {
      return;
    }

    for (const item of OWNER_POSTS) {
      const date = new Date(Date.now() - item.daysAgo * 24 * 60 * 60 * 1000);
      const post: Post = {
        id: randomUUID(),
        authorId: owner.id,
        authorName: owner.userName,
        content: item.content,
        likeCount: 0,
        dislikeCount: 0,
        likedBy: [],
        dislikedBy: [],
        commentCount: 0,
        createdAt: date.toISOString(),
        updatedAt: date.toISOString(),
      };
      await this.elastic.request(
        'PUT',
        `/${POSTS_INDEX}/_doc/${post.id}?refresh=true`,
        post,
      );
    }
    this.logger.log(`Added ${OWNER_POSTS.length} posts for the owner`);
  }
}
