import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ElasticService } from '../elastic/elastic.service.js';
import { UsersService } from '../users/users.service.js';

const INDEX = 'quickchat_messages';
const MAX_LENGTH = 1000;

export interface Message {
  id: string;
  conversationId: string;
  senderId: number;
  receiverId: number;
  content: string;
  createdAt: string;
}

// both users get the same id no matter who sends first
function conversationId(a: number, b: number) {
  return a < b ? `${a}_${b}` : `${b}_${a}`;
}

@Injectable()
export class MessagesService implements OnModuleInit {
  constructor(
    private readonly elastic: ElasticService,
    private readonly usersService: UsersService,
  ) {}

  async onModuleInit() {
    await this.elastic.createIndexIfMissing(INDEX, {
      properties: {
        id: { type: 'keyword' },
        conversationId: { type: 'keyword' },
        senderId: { type: 'integer' },
        receiverId: { type: 'integer' },
        content: { type: 'text' },
        createdAt: { type: 'date' },
      },
    });
  }

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

    const message: Message = {
      id: randomUUID(),
      conversationId: conversationId(senderId, receiverId),
      senderId,
      receiverId,
      content,
      createdAt: new Date().toISOString(),
    };
    await this.elastic.request(
      'PUT',
      `/${INDEX}/_doc/${message.id}?refresh=true`,
      message,
    );
    return message;
  }

  async conversation(userId: number, otherUserId: number) {
    const { items } = await this.elastic.search<Message>(INDEX, {
      query: { term: { conversationId: conversationId(userId, otherUserId) } },
      sort: [{ createdAt: 'desc' }],
      size: 100,
    });
    // newest 100, shown oldest first
    return items.reverse();
  }
}
