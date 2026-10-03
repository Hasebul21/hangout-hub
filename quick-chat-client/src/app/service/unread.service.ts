import { Injectable } from '@angular/core';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { BehaviorSubject, map } from 'rxjs';
import { Message } from '../models/message';
import { AuthService } from './auth.service';
import { ChatService } from './chat.service';
import { SocketService } from './socket.service';

// Keeps unread message counts per contact for the whole app, so the navbar and
// the contact list show the same numbers.
@Injectable({
  providedIn: 'root'
})
export class UnreadService {
  private counts$ = new BehaviorSubject<Record<number, number>>({});
  private openChatUserId: number | null = null;
  private started = false;

  counts = this.counts$.asObservable();
  total = this.counts$.pipe(map(counts => Object.values(counts).reduce((sum, n) => sum + n, 0)));

  constructor(private chatService: ChatService,
    private socket: SocketService,
    private auth: AuthService,
    private notification: NzNotificationService) { }

  start() {
    if (this.started) {
      return;
    }
    this.started = true;
    this.refresh();

    this.socket.on<Message>('message').subscribe(message => {
      const me = this.auth.currentUser;
      if (!me || message.receiverId !== me.id) {
        return;
      }
      if (message.senderId === this.openChatUserId) {
        this.chatService.markAsRead(message.senderId).subscribe();
        return;
      }
      const counts = { ...this.counts$.value };
      counts[message.senderId] = (counts[message.senderId] ?? 0) + 1;
      this.counts$.next(counts);
      this.notification.info('New message', message.content.slice(0, 80), { nzDuration: 3000 });
    });
  }

  stop() {
    this.started = false;
    this.counts$.next({});
  }

  refresh() {
    this.chatService.getUnreadCounts().subscribe(counts => this.counts$.next(counts));
  }

  openChat(userId: number | null) {
    this.openChatUserId = userId;
    if (userId && this.counts$.value[userId]) {
      const counts = { ...this.counts$.value };
      delete counts[userId];
      this.counts$.next(counts);
    }
    if (userId) {
      this.chatService.markAsRead(userId).subscribe();
    }
  }
}
