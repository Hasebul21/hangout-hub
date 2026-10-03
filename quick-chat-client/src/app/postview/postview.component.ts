import { Component, inject } from '@angular/core';
import { PostService } from '../service/post.service';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterModule } from '@angular/router';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { AuthService } from '../service/auth.service';
import { NavbarComponent } from "../navbar/navbar.component";
import { ToastrService } from 'ngx-toastr';
import { MatDialog } from '@angular/material/dialog';
import { PosteditComponent } from '../postedit/postedit.component';

@Component({
  selector: 'app-postview',
  imports: [
    CommonModule,
    MatToolbarModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatListModule,
    MatSelectModule,
    MatMenuModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    MatSnackBarModule,
    MatDatepickerModule,
    MatNativeDateModule,
    NavbarComponent
  ],
  templateUrl: './postview.component.html',
  styleUrls: ['./postview.component.scss']
})
export class PostviewComponent {

  currentPage: number = 1;
  totalPages: number = 10;
  allFilteredPosts: any[] = []; // Store full filtered results
  filteredPosts: any[] = [];
  showFilterOptions = false;
  loggedInUser: any = null;
  readonly dialog = inject(MatDialog);

  filter = {
    creatorName: null,
    content: null,
    likeCount: {
      gte: null,
      lte: null
    },
    dislikeCount: {
      gte: null,
      lte: null
    },
    createdDate: {
      gte: null,
      lte: null
    },
    updatedDate: {
      gte: null,
      lte: null
    }
  };

  constructor(private postService: PostService,
    private authService: AuthService,
    private toastr: ToastrService
  ) { }

  ngOnInit(): void {
    this.loggedInUser = this.authService.currentUser;
    this.loadPosts();
  }

  loadPosts(): void {
    this.postService.getAllPosts().subscribe((posts) => {
      const startIndex = (this.currentPage - 1) * 8;
      const endIndex = startIndex + 8;
      this.filteredPosts = posts.slice(startIndex, endIndex);
      this.totalPages = Math.ceil(posts.length / 8);
    });
  }

  openFilterOptions(): void {
    this.showFilterOptions = !this.showFilterOptions;
  }

  applyFilter(): void {
    // Build a payload copy so we don't mutate the bound filter values
    const filterPayload: any = {
      creatorName: this.filter.creatorName || null,
      content: this.filter.content || null,
      likeCount: this.filter.likeCount,
      dislikeCount: this.filter.dislikeCount,
      createdDate: null,
      updatedDate: null,
    };

    if (this.filter.createdDate?.gte || this.filter.createdDate?.lte) {
      filterPayload.createdDate = {
        gte: this.filter.createdDate.gte
          ? new Date(this.filter.createdDate.gte).toISOString()
          : null,
        lte: this.filter.createdDate.lte
          ? new Date(this.filter.createdDate.lte + 'T23:59:59').toISOString()
          : null,
      };
    }

    if (this.filter.updatedDate?.gte || this.filter.updatedDate?.lte) {
      filterPayload.updatedDate = {
        gte: this.filter.updatedDate.gte
          ? new Date(this.filter.updatedDate.gte).toISOString()
          : null,
        lte: this.filter.updatedDate.lte
          ? new Date(this.filter.updatedDate.lte + 'T23:59:59').toISOString()
          : null,
      };
    }

    this.postService.getPostsByFilter(filterPayload).subscribe((posts) => {
      this.allFilteredPosts = posts;
      this.totalPages = Math.ceil(posts.length / 8);
      this.currentPage = 1;
      this.updateFilteredPosts();
    });
  }

  updateFilteredPosts(): void {
    const startIndex = (this.currentPage - 1) * 8;
    const endIndex = startIndex + 8;
    this.filteredPosts = this.allFilteredPosts.slice(startIndex, endIndex);
  }

  resetFilter(): void {
    this.filter = {
      creatorName: null,
      content: null,
      likeCount: {
        gte: null,
        lte: null
      },
      dislikeCount: {
        gte: null,
        lte: null
      },
      createdDate: {
        gte: null,
        lte: null
      },
      updatedDate: {
        gte: null,
        lte: null
      }
    };
    this.allFilteredPosts = [];
    this.currentPage = 1;
    this.totalPages = 10;
    this.showFilterOptions = false;
    this.loadPosts();
  }

  updateLikeCount(id: any, isLike: boolean): void {
    let count = 0;
    if (isLike) {
      count = this.filteredPosts[id].likeCount + 1;
    } else {
      count = this.filteredPosts[id].dislikeCount + 1;
    }
    this.filteredPosts[id].postId
    this.postService.updateLikeCount(this.filteredPosts[id].postId,
      count, isLike).subscribe((response) => {
        this.filteredPosts[id].likeCount = response.likeCount;
        this.filteredPosts[id].dislikeCount = response.dislikeCount;
      }
        , (error) => {
          console.error('Error updating post:', error);
        }
      );
  }


  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.allFilteredPosts.length ? this.updateFilteredPosts() : this.loadPosts();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.allFilteredPosts.length ? this.updateFilteredPosts() : this.loadPosts();
    }
  }

  editPost(post: any): void {
    this.dialog.open(PosteditComponent, {
      data: post,
      width: '800px',
      height: '600px',
      disableClose: true,
      autoFocus: false
    }).afterClosed().subscribe((result) => {
      if (result) {
        console.log(result);
        this.postService.updatePost(post.postId, result).subscribe((response) => {
          this.toastr.success('Post updated successfully:', 'Success');
          this.loadPosts();
        }, (error) => {
          this.toastr.error('Error updating post', 'Error');
        });
      }
    }
    );
  }

  deletePost(post: any): void {
    this.postService.deletePost(post.postId).subscribe((response) => {
      this.toastr.success('Post deleted successfully:', 'Success');
      this.loadPosts();
    }, (error) => {
      this.toastr.error('Error deleting post', 'Error');
    });
  }
}
