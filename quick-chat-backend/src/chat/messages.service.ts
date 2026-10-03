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
  read: boolean;
  createdAt: string;
}

// both users get the same id no matter who sends first
export function conversationId(a: number, b: number) {
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
        read: { type: 'boolean' },
        createdAt: { type: 'date' },
      },
    });
    // older indexes were created before the read flag existed
    await this.elastic.request('PUT', `/${INDEX}/_mapping`, {
      properties: { read: { type: 'boolean' } },
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
      read: false,
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

  async search(userId: number, otherUserId: number, text: string) {
    text = (text ?? '').trim();
    if (!text) {
      return [];
    }
    const { items } = await this.elastic.search<Message>(INDEX, {
      query: {
        bool: {
          filter: [
            { term: { conversationId: conversationId(userId, otherUserId) } },
          ],
          must: [{ match: { content: { query: text, fuzziness: 'AUTO' } } }],
        },
      },
      sort: [{ createdAt: 'desc' }],
      size: 50,
    });
    return items;
  }

  // number of unread messages per sender, for the current user
  async unreadCounts(userId: number) {
    const data = await this.elastic.request('POST', `/${INDEX}/_search`, {
      size: 0,
      query: {
        bool: {
          filter: [{ term: { receiverId: userId } }],
          must_not: [{ term: { read: true } }],
        },
      },
      aggs: { bySender: { terms: { field: 'senderId', size: 500 } } },
    });

    const counts: Record<number, number> = {};
    for (const bucket of data.aggregations.bySender.buckets) {
      counts[bucket.key] = bucket.doc_count;
    }
    return counts;
  }

  async markAsRead(userId: number, otherUserId: number) {
    await this.elastic.request(
      'POST',
      `/${INDEX}/_update_by_query?refresh=true&conflicts=proceed`,
      {
        query: {
          bool: {
            filter: [
              { term: { senderId: otherUserId } },
              { term: { receiverId: userId } },
            ],
            must_not: [{ term: { read: true } }],
          },
        },
        script: { source: 'ctx._source.read = true' },
      },
    );
  }
}
