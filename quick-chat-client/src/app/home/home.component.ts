import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { NzMessageService } from 'ng-zorro-antd/message';
import { User } from '../models/user';
import { NavbarComponent } from '../navbar/navbar.component';
import { ProfileSectionComponent } from '../profile-section/profile-section.component';
import { AuthService } from '../service/auth.service';
import { PostService } from '../service/post.service';
import { UserService } from '../service/user.service';
import { avatarUrl, useDefaultAvatar } from '../shared/avatar';
import { TrendingPostComponent } from '../trending-post/trending-post.component';

const MAX_LENGTH = 500;

@Component({
  selector: 'app-home',
  imports: [CommonModule, FormsModule, RouterModule, MatIconModule, NavbarComponent, TrendingPostComponent, ProfileSectionComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit {
  loggedInUser: User | null = null;
  suggestedUsers: User[] = [];
  newPostContent = '';
  posting = false;
  maxLength = MAX_LENGTH;
  avatarUrl = avatarUrl;
  useDefaultAvatar = useDefaultAvatar;

  constructor(private authService: AuthService,
    private postService: PostService,
    private userService: UserService,
    private msg: NzMessageService) { }

  ngOnInit(): void {
    this.loggedInUser = this.authService.currentUser;
    this.userService.getUsers().subscribe(users => {
      this.suggestedUsers = users
        .filter(user => user.id !== this.loggedInUser?.id)
        .sort((a, b) => Number(b.isOwner) - Number(a.isOwner))
        .slice(0, 5);
    });
  }

  postPublicly() {
    const content = this.newPostContent.trim();
    if (!content || this.posting) {
      return;
    }

    this.posting = true;
    this.postService.createPost(content).subscribe({
      next: () => {
        this.posting = false;
        this.newPostContent = '';
        this.msg.success('Your post is live');
      },
      error: () => {
        this.posting = false;
        this.msg.error('Could not publish the post, please try again');
      }
    });
  }
}
