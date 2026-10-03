import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { Presence } from '../models/message';
import { User } from '../models/user';
import { avatarUrl, useDefaultAvatar } from '../shared/avatar';
import { timeAgo } from '../shared/time-ago';

@Component({
  selector: 'app-user-status',
  imports: [CommonModule, FormsModule, NzTagModule],
  templateUrl: './user-status.component.html',
  styleUrl: './user-status.component.scss',
})
export class UserStatusComponent {
  @Input() me: User | null = null;
  @Input() users: User[] = [];
  @Input() presence: Presence = { onlineUserIds: [], lastSeen: {} };
  @Input() selectedUser: User | null = null;
  @Output() selectUser = new EventEmitter<User>();

  searchTerm = '';
  avatarUrl = avatarUrl;
  useDefaultAvatar = useDefaultAvatar;

  get filteredUsers(): User[] {
    const term = this.searchTerm.toLowerCase().trim();
    return this.users
      .filter(user => !term || user.userName.toLowerCase().includes(term))
      .sort((a, b) => Number(b.isOwner) - Number(a.isOwner)
        || Number(this.isOnline(b)) - Number(this.isOnline(a)));
  }

  isOnline(user: User): boolean {
    return this.presence.onlineUserIds.includes(user.id);
  }

  statusText(user: User): string {
    if (this.isOnline(user)) {
      return 'Online';
    }
    const lastSeen = this.presence.lastSeen[user.id];
    return lastSeen ? `Last seen ${timeAgo(lastSeen)}` : 'Offline';
  }
}
