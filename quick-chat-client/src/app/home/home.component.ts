import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, OnInit, ViewEncapsulation } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { MatSelectModule } from '@angular/material/select';
import { MatMenuModule } from '@angular/material/menu';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../service/auth.service';
import { PostService } from '../service/post.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { NavbarComponent } from "../navbar/navbar.component";
import { TrendingPostComponent } from "../trending-post/trending-post.component";
import { StompService } from '../service/stomp.service';
import { ToastrService } from 'ngx-toastr';
import { ProfileSectionComponent } from "../profile-section/profile-section.component";
import { DEFAULT_USERS } from '../mock-data';

@Component({
  selector: 'app-home',
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
    NavbarComponent,
    TrendingPostComponent,
    ProfileSectionComponent
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit, AfterViewInit {
  loggedInUser: any = null;
  newPostContent: string = '';

  suggestedUsers = DEFAULT_USERS.map(u => ({
    name: u.userName,
    title: u.professionalTitle,
    avatar: u.profileImage,
  }));

  constructor(private authService: AuthService,
    private postService: PostService,
    private toastr: ToastrService
  ) { }
  ngAfterViewInit(): void {
    //this.postService.getMostLikedPost().subscribe();
  }


  ngOnInit(): void {
    this.loggedInUser = this.authService.currentUser;
  }

  postPublicly() {
    const newPost = {
      creatorName: this.loggedInUser.userName,
      creatorEmail: this.loggedInUser.userEmail,
      creatorImage: this.loggedInUser.profileImage,
      content: this.newPostContent.trim(),
      likeCount: 0,
      dislikeCount: 0,
    };
    this.newPostContent = '';
    this.postService.persistPost(newPost).subscribe(
      response => {
        this.toastr.success('User logged in successfully!', 'Success');
      },
      error => {
        this.toastr.success('User logged in successfully!', 'Success');
      }
    );
  }

}
