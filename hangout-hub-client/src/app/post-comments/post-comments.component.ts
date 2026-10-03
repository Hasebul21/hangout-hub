import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { RouterModule } from '@angular/router';
import { Comment, Post } from '../models/post';
import { AuthService } from '../service/auth.service';
import { PostService } from '../service/post.service';
import { avatarUrl, useDefaultAvatar } from '../shared/avatar';
import { timeAgo } from '../shared/time-ago';

@Component({
  selector: 'app-post-comments',
  imports: [CommonModule, FormsModule, RouterModule, NzInputModule, NzButtonModule, NzIconModule, NzPopconfirmModule],
  templateUrl: './post-comments.component.html',
  styleUrl: './post-comments.component.scss'
})
export class PostCommentsComponent implements OnInit {
  @Input() post!: Post;
  @Output() countChange = new EventEmitter<number>();

  comments: Comment[] = [];
  newComment = '';
  loading = true;
  sending = false;
  myId: number | undefined;
  isGuest = false;
  avatarUrl = avatarUrl;
  useDefaultAvatar = useDefaultAvatar;
  timeAgo = timeAgo;

  constructor(private postService: PostService,
    private auth: AuthService,
    private msg: NzMessageService) { }

  ngOnInit(): void {
    this.myId = this.auth.currentUser?.id;
    this.isGuest = this.auth.isGuest();
    this.postService.getComments(this.post.id).subscribe({
      next: comments => {
        this.comments = comments;
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  addComment() {
    const content = this.newComment.trim();
    if (!content || this.sending) {
      return;
    }
    this.sending = true;
    this.postService.addComment(this.post.id, content).subscribe({
      next: comment => {
        this.comments.push(comment);
        this.newComment = '';
        this.sending = false;
        this.countChange.emit(this.comments.length);
      },
      error: () => {
        this.sending = false;
        this.msg.error('Could not add the comment');
      }
    });
  }

  deleteComment(comment: Comment) {
    this.postService.deleteComment(this.post.id, comment.id).subscribe({
      next: () => {
        this.comments = this.comments.filter(c => c.id !== comment.id);
        this.countChange.emit(this.comments.length);
      },
      error: () => this.msg.error('Could not delete the comment')
    });
  }
}
