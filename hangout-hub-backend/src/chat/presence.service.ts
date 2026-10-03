import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service.js';

export interface Presence {
  onlineUserIds: number[];
  lastSeen: Record<number, string>;
}

// Keeps track of who is online. A user can have more than one tab open, so we
// count connections per user and only mark them offline when the last one goes.
// Kept in memory, which is fine while the app runs as a single server.
@Injectable()
export class PresenceService {
  private connections = new Map<number, number>();
  private lastSeen = new Map<number, string>();

  constructor(private readonly usersService: UsersService) {}

  userConnected(userId: number) {
    this.connections.set(userId, (this.connections.get(userId) ?? 0) + 1);
  }

  userDisconnected(userId: number) {
    const count = (this.connections.get(userId) ?? 1) - 1;
    if (count > 0) {
      this.connections.set(userId, count);
      return;
    }
    this.connections.delete(userId);
    this.lastSeen.set(userId, new Date().toISOString());
  }

  async getPresence(): Promise<Presence> {
    const ids = [...this.connections.keys()];

    // the owner always shows as available
    const owner = await this.usersService.findOwner();
    if (owner && !ids.includes(owner.id)) {
      ids.push(owner.id);
    }
    return {
      onlineUserIds: ids,
      lastSeen: Object.fromEntries(this.lastSeen),
    };
  }
}
