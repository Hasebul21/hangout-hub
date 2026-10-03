import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { Subject, Subscription, debounceTime } from 'rxjs';
import { Post, PostFilter, Reaction } from '../models/post';
import { User } from '../models/user';
import { NavbarComponent } from '../navbar/navbar.component';
import { PostCommentsComponent } from '../post-comments/post-comments.component';
import { AuthService } from '../service/auth.service';
import { PostService } from '../service/post.service';
import { UserService } from '../service/user.service';
import { avatarUrl, useDefaultAvatar } from '../shared/avatar';

const PAGE_SIZE = 8;

@Component({
  selector: 'app-postview',
  imports: [
    CommonModule, FormsModule, MatIconModule, NavbarComponent, PostCommentsComponent,
    NzPaginationModule, NzDatePickerModule, NzModalModule, NzPopconfirmModule, NzInputModule, NzTagModule
  ],
  templateUrl: './postview.component.html',
  styleUrls: ['./postview.component.scss']
})
export class PostviewComponent implements OnInit, OnDestroy {
  loggedInUser: User | null = null;
  posts: Post[] = [];
  total = 0;
  page = 1;
  pageSize = PAGE_SIZE;
  loading = false;

  showFilterOptions = false;
  author = '';
  keyword = '';
  dateRange: Date[] = [];

  demoUserIds = new Set<number>();
  isGuest = false;
  openComments = new Set<string>();

  editingPost: Post | null = null;
  editContent = '';
  saving = false;

  avatarUrl = avatarUrl;
  useDefaultAvatar = useDefaultAvatar;

  private authorChanges = new Subject<string>();
  private subscription?: Subscription;

  constructor(private postService: PostService,
    private authService: AuthService,
    private userService: UserService,
    private msg: NzMessageService) { }

  ngOnInit(): void {
    this.loggedInUser = this.authService.currentUser;
    this.isGuest = this.authService.isGuest();

    this.subscription = this.authorChanges.pipe(debounceTime(300)).subscribe(() => this.search());
    this.loadPosts();
    this.userService.getUsers().subscribe(users => {
      this.demoUserIds = new Set(users.filter(user => user.isDemo).map(user => user.id));
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  loadPosts(): void {
    this.loading = true;
    this.postService.getPosts(this.page, this.pageSize, this.buildFilter()).subscribe({
      next: result => {
        this.posts = result.items;
        this.total = result.total;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.msg.error('Could not load posts');
      }
    });
  }

  onAuthorChange(value: string) {
    this.authorChanges.next(value);
  }

  search(): void {
    this.page = 1;
    this.loadPosts();
  }

  resetFilter(): void {
    this.author = '';
    this.keyword = '';
    this.dateRange = [];
    this.showFilterOptions = false;
    this.search();
  }

  onPageChange(page: number): void {
    this.page = page;
    this.loadPosts();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  react(post: Post, type: Reaction): void {
    if (this.isGuest) {
      this.msg.info('Create an account to like or dislike posts');
      return;
    }
    this.postService.react(post.id, type).subscribe({
      next: updated => this.replacePost(updated),
      error: () => this.msg.error('Could not save your reaction')
    });
  }

  isMine(post: Post): boolean {
    return post.authorId === this.loggedInUser?.id;
  }

  openEdit(post: Post): void {
    this.editingPost = post;
    this.editContent = post.content;
  }

  closeEdit(): void {
    this.editingPost = null;
  }

  saveEdit(): void {
    const content = this.editContent.trim();
    if (!this.editingPost || !content) {
      return;
    }
    this.saving = true;
    this.postService.updatePost(this.editingPost.id, content).subscribe({
      next: updated => {
        this.saving = false;
        this.replacePost(updated);
        this.editingPost = null;
        this.msg.success('Post updated');
      },
      error: () => {
        this.saving = false;
        this.msg.error('Could not update the post');
      }
    });
  }

  deletePost(post: Post): void {
    this.postService.deletePost(post.id).subscribe({
      next: () => {
        this.msg.success('Post deleted');

        if (this.posts.length === 1 && this.page > 1) {
          this.page--;
        }
        this.loadPosts();
      },
      error: () => this.msg.error('Could not delete the post')
    });
  }

  toggleComments(post: Post) {
    if (this.openComments.has(post.id)) {
      this.openComments.delete(post.id);
    } else {
      this.openComments.add(post.id);
    }
  }

  onCommentCount(post: Post, count: number) {
    post.commentCount = count;
  }

  wasEdited(post: Post): boolean {
    return post.updatedAt !== post.createdAt;
  }

  private buildFilter(): PostFilter {
    const [from, to] = this.dateRange ?? [];
    let toDate: Date | undefined;
    if (to) {
      toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
    }
    let fromDate: Date | undefined;
    if (from) {
      fromDate = new Date(from);
      fromDate.setHours(0, 0, 0, 0);
    }
    return {
      author: this.author.trim(),
      q: this.keyword.trim(),
      from: fromDate?.toISOString(),
      to: toDate?.toISOString()
    };
  }

  private replacePost(updated: Post) {
    this.posts = this.posts.map(post => post.id === updated.id ? updated : post);
  }
}
