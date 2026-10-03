import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Subscription } from 'rxjs';
import { Post } from '../models/post';
import { PostService } from '../service/post.service';
import { SocketService } from '../service/socket.service';
import { avatarUrl, useDefaultAvatar } from '../shared/avatar';

@Component({
  selector: 'app-trending-post',
  imports: [CommonModule, MatIconModule],
  templateUrl: './trending-post.component.html',
  styleUrl: './trending-post.component.scss'
})
export class TrendingPostComponent implements OnInit, OnDestroy {
  trendingPosts: Post[] = [];
  isLoading = true;
  avatarUrl = avatarUrl;
  useDefaultAvatar = useDefaultAvatar;
  private subscription?: Subscription;

  constructor(private postService: PostService, private socket: SocketService) { }

  ngOnInit(): void {
    this.postService.getTrending().subscribe({
      next: posts => {
        this.trendingPosts = posts;
        this.isLoading = false;
      },
      error: () => this.isLoading = false
    });

    this.subscription = this.socket.on<Post[]>('trending-posts').subscribe(posts => {
      this.trendingPosts = posts;
      this.isLoading = false;
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  score(post: Post): number {
    return Math.round(post.likeCount / ((post.likeCount + post.dislikeCount) || 1) * 100);
  }
}
