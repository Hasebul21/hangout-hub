import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import bcrypt from 'bcryptjs';
import { randomBytes, randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { conversationId } from '../chat/messages.service.js';
import { ElasticService } from '../elastic/elastic.service.js';
import { Post, POSTS_INDEX, postMappings } from '../posts/post.js';
import { User } from '../users/user.entity.js';
import { DEMO_USERS } from './demo-users.js';
import { OWNER, OWNER_POSTS } from './owner.js';

const DAY = 24 * 60 * 60 * 1000;

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
    await this.seedDemoUsers(owner);
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

  private async seedDemoUsers(owner: User) {
    const alreadySeeded = await this.users.findOneBy({
      email: DEMO_USERS[0].email,
    });
    if (alreadySeeded) {
      return;
    }

    const demoUsers: User[] = [];
    for (const [index, data] of DEMO_USERS.entries()) {
      const user = await this.users.save(
        this.users.create({
          userName: data.userName,
          email: data.email,
          // nobody knows this password, so the account can't be used to log in
          password: await bcrypt.hash(randomBytes(24).toString('hex'), 10),
          professionalTitle: 'Demo account',
          bio: data.bio,
          isDemo: true,
        }),
      );
      demoUsers.push(user);

      const postDate = new Date(Date.now() - (index + 1) * DAY * 0.7);
      await this.savePost(user, data.post, postDate);

      const messageDate = new Date(Date.now() - (index + 1) * 60 * 60 * 1000);
      await this.saveMessage(user.id, owner.id, data.message, messageDate);
      if (data.reply) {
        const replyDate = new Date(messageDate.getTime() + 5 * 60 * 1000);
        await this.saveMessage(owner.id, user.id, data.reply, replyDate, true);
      }
    }

    // a few likes on the owner's posts so trending isn't empty
    const ownerPosts = await this.elastic.search<Post>(POSTS_INDEX, {
      query: { term: { authorId: owner.id } },
      size: 10,
    });
    for (const [index, post] of ownerPosts.items.entries()) {
      const likedBy = demoUsers
        .slice(0, demoUsers.length - index)
        .map((u) => u.id);
      await this.elastic.request(
        'POST',
        `/${POSTS_INDEX}/_update/${post.id}?refresh=true`,
        { doc: { likedBy, likeCount: likedBy.length } },
      );
    }
    this.logger.log(`Added ${demoUsers.length} demo users`);
  }

  private async savePost(author: User, content: string, date: Date) {
    const post: Post = {
      id: randomUUID(),
      authorId: author.id,
      authorName: author.userName,
      content,
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

  private async saveMessage(
    senderId: number,
    receiverId: number,
    content: string,
    date: Date,
    read = false,
  ) {
    const id = randomUUID();
    await this.elastic.request(
      'PUT',
      `/quickchat_messages/_doc/${id}?refresh=true`,
      {
        id,
        conversationId: conversationId(senderId, receiverId),
        senderId,
        receiverId,
        content,
        read,
        createdAt: date.toISOString(),
      },
    );
  }
}
