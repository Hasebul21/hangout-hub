import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, OnDestroy, OnInit } from '@angular/core';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { Subscription } from 'rxjs';
import { User } from '../models/user';
import { PostService } from '../service/post.service';
import { SocketService } from '../service/socket.service';
import { avatarUrl, useDefaultAvatar } from '../shared/avatar';

@Component({
  selector: 'app-profile-section',
  imports: [CommonModule, MatIconModule, MatDividerModule],
  templateUrl: './profile-section.component.html',
  styleUrl: './profile-section.component.scss'
})
export class ProfileSectionComponent implements OnInit, OnChanges, OnDestroy {
  @Input() loggedInUser: User | null = null;
  postCount = 0;
  avatarUrl = avatarUrl;
  useDefaultAvatar = useDefaultAvatar;
  private subscription?: Subscription;

  constructor(private socket: SocketService, private postService: PostService) { }

  ngOnInit(): void {
    this.subscription = this.socket.on<{ count: number }>('post-count').subscribe(data => {
      this.postCount = data.count;
    });
  }

  ngOnChanges(): void {
    if (this.loggedInUser) {
      this.postService.getPostCount(this.loggedInUser.id).subscribe(data => this.postCount = data.count);
    }
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  get instagramUrl(): string {
    const handle = (this.loggedInUser?.instagram ?? '').replace(/^@/, '');
    return `https://instagram.com/${handle}`;
  }
}
