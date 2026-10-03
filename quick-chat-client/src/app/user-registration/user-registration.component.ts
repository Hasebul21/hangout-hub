import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../service/auth.service';

@Component({
  selector: 'app-user-registration',
  imports: [FormsModule, RouterModule],
  templateUrl: './user-registration.component.html',
  styleUrl: './user-registration.component.scss'
})
export class UserRegistrationComponent {
  userName = '';
  email = '';
  password = '';
  confirmPassword = '';
  loading = false;

  constructor(private authService: AuthService,
    private router: Router,
    private toastr: ToastrService) { }

  register() {
    if (this.disableSubmit()) {
      return;
    }

    this.loading = true;
    this.authService.register(this.userName.trim(), this.email.trim(), this.password).subscribe({
      next: () => {
        this.loading = false;
        this.toastr.success('Account created, you can log in now');
        this.router.navigate(['/login']);
      },
      error: err => {
        this.loading = false;
        const message = err.error?.message;
        this.toastr.error(Array.isArray(message) ? message[0] : message || 'Registration failed');
      }
    });
  }

  disableSubmit(): boolean {
    return !this.userName.trim() || !this.email || this.password.length < 6
      || this.password !== this.confirmPassword || this.loading;
  }
}
