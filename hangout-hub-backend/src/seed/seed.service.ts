import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { DataSource, Repository } from 'typeorm';
import { conversationId } from '../chat/messages.service.js';
import { Message } from '../chat/message.entity.js';
import { Comment } from '../posts/comment.entity.js';
import { Post } from '../posts/post.entity.js';
import { Reaction } from '../posts/reaction.entity.js';
import { User } from '../users/user.entity.js';
import {
  DEMO_USERS,
  OWNER,
  SEED_COMMENTS,
  SEED_LIKES,
  SEED_POSTS,
} from './seed-data.js';

const HOUR = 60 * 60 * 1000;

const SEED_LOCK = 734001;

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Post) private readonly posts: Repository<Post>,
    @InjectRepository(Reaction)
    private readonly reactions: Repository<Reaction>,
    @InjectRepository(Comment) private readonly comments: Repository<Comment>,
    @InjectRepository(Message) private readonly messages: Repository<Message>,
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  async onApplicationBootstrap() {
    try {
      await this.dataSource.transaction(async (manager) => {
        await manager.query('SELECT pg_advisory_xact_lock($1)', [SEED_LOCK]);
        await this.seed();
      });
    } catch (err) {
      this.logger.error(
        'Seeding failed',
        err instanceof Error ? err.stack : err,
      );
    }
  }

  private async seed() {
    const owner = await this.seedOwner();

    const alreadySeeded = await this.users.existsBy({
      email: DEMO_USERS[0].email,
    });
    if (alreadySeeded) {
      return;
    }

    const people = new Map<string, User>([[OWNER.key, owner]]);
    for (const demo of DEMO_USERS) {
      people.set(demo.key, await this.createDemoUser(demo));
    }

    const posts = await this.seedPosts(people);
    await this.seedComments(people, posts);
    await this.seedChats(owner, people);
    this.logger.log(
      `Seeded ${DEMO_USERS.length} demo users, ${SEED_POSTS.length} posts and ${SEED_COMMENTS.length} comments`,
    );
  }

  private async seedOwner() {
    const configured = this.config.get<string>('OWNER_PASSWORD');
    const existing = await this.users.findOneBy({ email: OWNER.email });
    if (existing) {
      existing.isOwner = true;

      if (configured) {
        existing.password = await bcrypt.hash(configured, 10);
      }
      await this.users.save(existing);
      return existing;
    }

    const password = configured || OWNER.defaultPassword;
    const owner = await this.users.save(
      this.users.create({
        userName: OWNER.userName,
        email: OWNER.email,
        password: await bcrypt.hash(password, 10),
        professionalTitle: OWNER.professionalTitle,
        portfolio: OWNER.portfolio,
        skills: OWNER.skills,
        bio: OWNER.bio,
        isOwner: true,
      }),
    );
    this.logger.log(`Created owner account ${OWNER.email}`);
    return owner;
  }

  private async createDemoUser(demo: (typeof DEMO_USERS)[number]) {
    return this.users.save(
      this.users.create({
        userName: demo.userName,
        email: demo.email,

        password: await bcrypt.hash(randomBytes(24).toString('hex'), 10),
        professionalTitle: 'Demo account',
        bio: demo.bio,
        isDemo: true,
      }),
    );
  }

  private async seedPosts(people: Map<string, User>) {
    const posts = new Map<string, Post>();
    for (const item of SEED_POSTS) {
      const likedBy = SEED_LIKES[item.key] ?? [];
      const date = new Date(Date.now() - item.hoursAgo * HOUR);
      const post = await this.posts.save(
        this.posts.create({
          authorId: people.get(item.author)!.id,
          content: item.content,
          likeCount: likedBy.length,
          commentCount: SEED_COMMENTS.filter((c) => c.post === item.key).length,
          createdAt: date,
          updatedAt: date,
        }),
      );
      for (const key of likedBy) {
        await this.reactions.insert({
          postId: post.id,
          userId: people.get(key)!.id,
          type: 'like',
        });
      }
      posts.set(item.key, post);
    }
    return posts;
  }

  private async seedComments(
    people: Map<string, User>,
    posts: Map<string, Post>,
  ) {
    for (const [index, item] of SEED_COMMENTS.entries()) {
      const post = posts.get(item.post)!;

      const date = new Date(
        post.createdAt.getTime() + (index + 1) * 20 * 60 * 1000,
      );
      await this.comments.save(
        this.comments.create({
          postId: post.id,
          authorId: people.get(item.author)!.id,
          content: item.content,
          createdAt: date,
        }),
      );
    }
  }

  private async seedChats(owner: User, people: Map<string, User>) {
    for (const [index, demo] of DEMO_USERS.entries()) {
      const user = people.get(demo.key)!;
      const sentAt = Date.now() - (index + 1) * 3 * HOUR;
      await this.saveMessage(user.id, owner.id, demo.message, sentAt, false);
      if (demo.reply) {
        await this.saveMessage(
          owner.id,
          user.id,
          demo.reply,
          sentAt + 10 * 60 * 1000,
          true,
        );
      }
    }
  }

  private saveMessage(
    senderId: number,
    receiverId: number,
    content: string,
    sentAt: number,
    read: boolean,
  ) {
    return this.messages.save(
      this.messages.create({
        conversationId: conversationId(senderId, receiverId),
        senderId,
        receiverId,
        content,
        read,
        createdAt: new Date(sentAt),
      }),
    );
  }
}
