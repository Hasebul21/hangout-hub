import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { Redis } from 'ioredis';
import { REDIS } from '../redis/redis.module.js';

const CONNECTIONS_KEY = 'presence:connections';
const LAST_SEEN_KEY = 'presence:last-seen';

export interface Presence {
  onlineUserIds: number[];
  lastSeen: Record<number, string>;
}

// Keeps track of who is online. A user can have more than one tab open, so we
// count connections per user and only mark them offline when the last one goes.
@Injectable()
export class PresenceService implements OnModuleInit {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async onModuleInit() {
    // sockets don't survive a restart, so old counts are meaningless
    await this.redis.del(CONNECTIONS_KEY);
  }

  async userConnected(userId: number) {
    await this.redis.hincrby(CONNECTIONS_KEY, String(userId), 1);
  }

  async userDisconnected(userId: number) {
    const count = await this.redis.hincrby(CONNECTIONS_KEY, String(userId), -1);
    if (count <= 0) {
      await this.redis.hdel(CONNECTIONS_KEY, String(userId));
      await this.redis.hset(
        LAST_SEEN_KEY,
        String(userId),
        new Date().toISOString(),
      );
    }
  }

  async getPresence(): Promise<Presence> {
    const ids = await this.redis.hkeys(CONNECTIONS_KEY);
    const lastSeen = await this.redis.hgetall(LAST_SEEN_KEY);
    return {
      onlineUserIds: ids.map(Number),
      lastSeen,
    };
  }
}
