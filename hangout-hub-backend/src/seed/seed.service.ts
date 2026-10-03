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
import {
  DEMO_USERS,
  OWNER,
  SEED_COMMENTS,
  SEED_LIKES,
  SEED_POSTS,
} from './seed-data.js';

const HOUR = 60 * 60 * 1000;

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

    // everything else is only created once, on an empty database
    const alreadySeeded = await this.users.findOneBy({
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
        // nobody knows this password, so the account can't be used to log in
        password: await bcrypt.hash(randomBytes(24).toString('hex'), 10),
        professionalTitle: 'Demo account',
        bio: demo.bio,
        isDemo: true,
      }),
    );
  }

  private async seedPosts(people: Map<string, User>) {
    await this.elastic.createIndexIfMissing(POSTS_INDEX, postMappings);

    const posts = new Map<string, Post>();
    for (const item of SEED_POSTS) {
      const author = people.get(item.author)!;
      const likedBy = (SEED_LIKES[item.key] ?? []).map(
        (key) => people.get(key)!.id,
      );
      const date = new Date(Date.now() - item.hoursAgo * HOUR).toISOString();
      const commentCount = SEED_COMMENTS.filter(
        (c) => c.post === item.key,
      ).length;

      const post: Post = {
        id: randomUUID(),
        authorId: author.id,
        authorName: author.userName,
        content: item.content,
        likeCount: likedBy.length,
        dislikeCount: 0,
        likedBy,
        dislikedBy: [],
        commentCount,
        createdAt: date,
        updatedAt: date,
      };
      await this.put(POSTS_INDEX, post.id, post);
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
      const author = people.get(item.author)!;
      // a little while after the post, in order
      const date = new Date(
        new Date(post.createdAt).getTime() + (index + 1) * 20 * 60 * 1000,
      );
      const id = randomUUID();
      await this.put('hangouthub_comments', id, {
        id,
        postId: post.id,
        authorId: author.id,
        authorName: author.userName,
        content: item.content,
        createdAt: date.toISOString(),
      });
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

  private async saveMessage(
    senderId: number,
    receiverId: number,
    content: string,
    sentAt: number,
    read: boolean,
  ) {
    const id = randomUUID();
    await this.put('hangouthub_messages', id, {
      id,
      conversationId: conversationId(senderId, receiverId),
      senderId,
      receiverId,
      content,
      read,
      createdAt: new Date(sentAt).toISOString(),
    });
  }

  private put(index: string, id: string, doc: object) {
    return this.elastic.request(
      'PUT',
      `/${index}/_doc/${id}?refresh=true`,
      doc,
    );
  }
}
