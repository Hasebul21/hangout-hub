import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../service/auth.service';
import { UserService } from '../service/user.service';
import { NzMessageService } from 'ng-zorro-antd/message';
import { Router } from '@angular/router';
import { NavbarComponent } from "../navbar/navbar.component";

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MatIconModule, NavbarComponent],
  templateUrl: './user-profile.component.html',
  styleUrl: './user-profile.component.scss'
})
export class UserProfileComponent {
  title = '';
  location = '';
  portfolio = '';
  instagram = '';
  bio = '';
  skills = '';
  hobbies = '';
  profileImage: any = null;
  loggedInUser: any = null;

  constructor(private authService: AuthService,
    private userService: UserService,
    private msg: NzMessageService,
    private router: Router
  ) { }

  ngOnInit() {
    this.loggedInUser = this.authService.currentUser;
  }

  updateProfile() {
    const formData = new FormData();

    if (this.title) formData.append('professionalTitle', this.title);
    if (this.location) formData.append('location', this.location);
    if (this.portfolio) formData.append('portfolio', this.portfolio);
    if (this.instagram) formData.append('instagram', this.instagram);
    if (this.bio) formData.append('bio', this.bio);
    if (this.skills) formData.append('skills', this.skills);
    if (this.hobbies) formData.append('hobbies', this.hobbies);

    if (this.profileImage) {
      formData.append('profileImage', this.profileImage);
    }
    for (let [key, val] of formData.entries()) {
    }

    this.userService.updateProfile(formData).subscribe({
      next: (response) => {
        this.authService.setCurrentUser(response);
        this.msg.success('Profile updated successfully!');
        this.router.navigate(['/home']);
      },
      error: (error) => {
        this.msg.error('Failed to update profile.');
      }
    });
  }


  onFileSelected(event: any) {
    this.profileImage = event.target.files[0];
  }
}