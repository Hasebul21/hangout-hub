import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { DataSource } from 'typeorm';

const HOUR = 60 * 60 * 1000;
const GUEST_LIFETIME_HOURS = 24;

@Injectable()
export class GuestCleanupService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(GuestCleanupService.name);
  private timer?: NodeJS.Timeout;

  constructor(private readonly dataSource: DataSource) {}

  onApplicationBootstrap() {
    this.removeOldGuests().catch((err) => this.logger.error(err));
    this.timer = setInterval(() => {
      this.removeOldGuests().catch((err) => this.logger.error(err));
    }, HOUR);
  }

  onApplicationShutdown() {
    clearInterval(this.timer);
  }

  async removeOldGuests() {
    const cutoff = new Date(Date.now() - GUEST_LIFETIME_HOURS * HOUR);

    const removed = await this.dataSource.transaction(async (manager) => {
      const guests: { id: number }[] = await manager.query(
        `SELECT id FROM accounts WHERE "isGuest" = true AND "createdAt" < $1`,
        [cutoff],
      );
      const ids = guests.map((guest) => guest.id);
      if (!ids.length) {
        return 0;
      }

      await manager.query(
        `DELETE FROM messages WHERE "senderId" = ANY($1) OR "receiverId" = ANY($1)`,
        [ids],
      );
      await manager.query(
        `DELETE FROM post_reactions WHERE "userId" = ANY($1)`,
        [ids],
      );
      await manager.query(`DELETE FROM accounts WHERE id = ANY($1)`, [ids]);

      await manager.query(`
        UPDATE posts p SET
          "likeCount" = (SELECT COUNT(*) FROM post_reactions r WHERE r."postId" = p.id AND r.type = 'like'),
          "dislikeCount" = (SELECT COUNT(*) FROM post_reactions r WHERE r."postId" = p.id AND r.type = 'dislike'),
          "commentCount" = (SELECT COUNT(*) FROM comments c WHERE c."postId" = p.id)
      `);
      return ids.length;
    });

    if (removed) {
      this.logger.log(`Removed ${removed} old guest accounts`);
    }
    return removed;
  }
}
