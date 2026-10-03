import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterModule } from '@angular/router';
import { NzMessageService } from 'ng-zorro-antd/message';
import { User } from '../models/user';
import { NavbarComponent } from '../navbar/navbar.component';
import { AuthService } from '../service/auth.service';
import { UserService } from '../service/user.service';
import { avatarUrl, useDefaultAvatar } from '../shared/avatar';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

@Component({
  selector: 'app-user-profile',
  imports: [CommonModule, FormsModule, RouterModule, MatIconModule, NavbarComponent],
  templateUrl: './user-profile.component.html',
  styleUrl: './user-profile.component.scss'
})
export class UserProfileComponent implements OnInit, OnDestroy {
  loggedInUser: User | null = null;
  form = {
    professionalTitle: '',
    location: '',
    portfolio: '',
    instagram: '',
    skills: '',
    hobbies: '',
    bio: ''
  };
  avatarFile: File | null = null;
  avatarPreview = '';
  saving = false;
  useDefaultAvatar = useDefaultAvatar;

  constructor(private authService: AuthService,
    private userService: UserService,
    private msg: NzMessageService,
    private router: Router) { }

  ngOnInit() {
    this.loggedInUser = this.authService.currentUser;
    if (this.loggedInUser) {
      this.avatarPreview = avatarUrl(this.loggedInUser.id, this.loggedInUser.updatedAt);
      for (const key of Object.keys(this.form) as (keyof typeof this.form)[]) {
        this.form[key] = this.loggedInUser[key] ?? '';
      }
    }
  }

  ngOnDestroy() {
    if (this.avatarFile) {
      URL.revokeObjectURL(this.avatarPreview);
    }
  }

  onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) {
      return;
    }
    if (!file.type.startsWith('image/')) {
      this.msg.warning('Please choose an image file');
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      this.msg.warning('Image is too big, the limit is 5 MB');
      return;
    }
    if (this.avatarFile) {
      URL.revokeObjectURL(this.avatarPreview);
    }
    this.avatarFile = file;
    this.avatarPreview = URL.createObjectURL(file);
  }

  updateProfile() {
    const formData = new FormData();
    for (const [key, value] of Object.entries(this.form)) {
      formData.append(key, value ?? '');
    }
    if (this.avatarFile) {
      formData.append('avatar', this.avatarFile);
    }

    this.saving = true;
    this.userService.updateProfile(formData).subscribe({
      next: user => {
        this.saving = false;
        this.authService.setCurrentUser(user);
        this.msg.success('Profile updated');
        this.router.navigate(['/home']);
      },
      error: err => {
        this.saving = false;
        const message = err.error?.message;
        this.msg.error(Array.isArray(message) ? message[0] : message || 'Could not update the profile');
      }
    });
  }
}
