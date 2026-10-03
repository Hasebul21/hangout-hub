import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { NzMessageService } from 'ng-zorro-antd/message';
import { AuthService } from '../service/auth.service';
import { SocketService } from '../service/socket.service';

@Component({
  selector: 'app-user-login',
  imports: [FormsModule, RouterModule],
  templateUrl: './user-login.component.html',
  styleUrl: './user-login.component.scss'
})
export class UserLoginComponent {
  email = '';
  password = '';
  loading = false;

  constructor(private auth: AuthService,
    private socket: SocketService,
    private router: Router,
    private msg: NzMessageService) { }

  login() {
    if (!this.email || !this.password) {
      this.msg.warning('Please enter your email and password');
      return;
    }

    this.loading = true;
    this.auth.login(this.email.trim(), this.password).subscribe({
      next: user => {
        this.loading = false;
        this.socket.connect(this.auth.token!);
        this.msg.success(`Welcome back, ${user.userName}!`);
        this.router.navigate(['/home']);
      },
      error: err => {
        this.loading = false;
        this.msg.error(err.error?.message || 'Login failed');
      }
    });
  }
}
