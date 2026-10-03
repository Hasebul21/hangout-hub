import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { escapeLike } from '../posts/post-view.js';
import { UsersService } from '../users/users.service.js';
import { Message } from './message.entity.js';

const MAX_LENGTH = 1000;

// both users get the same id no matter who sends first
export function conversationId(a: number, b: number) {
  return a < b ? `${a}_${b}` : `${b}_${a}`;
}

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message) private readonly messages: Repository<Message>,
    private readonly usersService: UsersService,
  ) {}

  async send(senderId: number, receiverId: number, content: string) {
    content = (content ?? '').trim();
    if (!content) {
      throw new BadRequestException('Message is empty');
    }
    if (content.length > MAX_LENGTH) {
      throw new BadRequestException(
        `Message is longer than ${MAX_LENGTH} characters`,
      );
    }
    if (senderId === receiverId) {
      throw new BadRequestException('You cannot message yourself');
    }
    await this.usersService.findById(receiverId);

    return this.messages.save(
      this.messages.create({
        conversationId: conversationId(senderId, receiverId),
        senderId,
        receiverId,
        content,
      }),
    );
  }

  async conversation(userId: number, otherUserId: number) {
    const messages = await this.messages.find({
      where: { conversationId: conversationId(userId, otherUserId) },
      order: { createdAt: 'DESC' },
      take: 100,
    });
    // newest 100, shown oldest first
    return messages.reverse();
  }

  async search(userId: number, otherUserId: number, text: string) {
    text = (text ?? '').trim();
    if (!text) {
      return [];
    }
    return this.messages
      .createQueryBuilder('message')
      .where('message.conversationId = :id', {
        id: conversationId(userId, otherUserId),
      })
      .andWhere('message.content ILIKE :text', {
        text: `%${escapeLike(text)}%`,
      })
      .orderBy('message.createdAt', 'DESC')
      .take(50)
      .getMany();
  }

  // number of unread messages per sender, for the current user
  async unreadCounts(userId: number) {
    const rows = await this.messages
      .createQueryBuilder('message')
      .select('message.senderId', 'senderId')
      .addSelect('COUNT(*)', 'count')
      .where('message.receiverId = :userId', { userId })
      .andWhere('message.read = false')
      .groupBy('message.senderId')
      .getRawMany<{ senderId: number; count: string }>();

    const counts: Record<number, number> = {};
    for (const row of rows) {
      counts[row.senderId] = Number(row.count);
    }
    return counts;
  }

  async markAsRead(userId: number, otherUserId: number) {
    await this.messages.update(
      { senderId: otherUserId, receiverId: userId, read: false },
      { read: true },
    );
  }
}
