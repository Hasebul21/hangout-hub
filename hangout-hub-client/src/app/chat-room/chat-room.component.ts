import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { ChatBoxComponent } from '../chat-box/chat-box.component';
import { Presence } from '../models/message';
import { User } from '../models/user';
import { NavbarComponent } from '../navbar/navbar.component';
import { AuthService } from '../service/auth.service';
import { SocketService } from '../service/socket.service';
import { UnreadService } from '../service/unread.service';
import { UserService } from '../service/user.service';
import { UserStatusComponent } from '../user-status/user-status.component';

@Component({
  selector: 'app-chat-room',
  imports: [CommonModule, MatIconModule, NavbarComponent, UserStatusComponent, ChatBoxComponent],
  templateUrl: './chat-room.component.html',
  styleUrl: './chat-room.component.scss'
})
export class ChatRoomComponent implements OnInit, OnDestroy {
  me: User | null = null;
  users: User[] = [];
  selectedUser: User | null = null;
  presence: Presence = { onlineUserIds: [], lastSeen: {} };
  private subscription?: Subscription;

  constructor(private auth: AuthService,
    private userService: UserService,
    private socket: SocketService,
    public unread: UnreadService,
    private route: ActivatedRoute) { }

  ngOnInit(): void {
    this.me = this.auth.currentUser;

    this.subscription = this.socket.on<Presence>('presence').subscribe(presence => {
      this.presence = presence;
    });

    this.userService.getUsers().subscribe(users => {
      this.users = users.filter(user => user.id !== this.me?.id);

      const userId = Number(this.route.snapshot.queryParamMap.get('user'));
      if (userId) {
        this.selectedUser = this.users.find(user => user.id === userId) ?? null;
      }

      if (!this.selectedUser) {
        this.selectedUser = this.users.find(user => user.isOwner) ?? this.users[0] ?? null;
      }
      this.unread.openChat(this.selectedUser?.id ?? null);
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
    this.unread.openChat(null);
  }

  onSelectUser(user: User) {
    this.selectedUser = user;
    this.unread.openChat(user.id);
  }

  isOnline(user: User): boolean {
    return this.presence.onlineUserIds.includes(user.id);
  }
}
