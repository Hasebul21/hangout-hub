import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { NzMessageService } from 'ng-zorro-antd/message';
import { AuthService } from '../service/auth.service';
import { SocketService } from '../service/socket.service';
import { UnreadService } from '../service/unread.service';

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
    private unread: UnreadService,
    private router: Router,
    private msg: NzMessageService) { }

  login() {
    if (!this.email || !this.password) {
      this.msg.warning('Please enter your email and password');
      return;
    }
    this.loading = true;
    this.auth.login(this.email.trim(), this.password).subscribe({
      next: user => this.onLoggedIn(`Welcome back, ${user.userName}!`),
      error: err => {
        this.loading = false;
        this.msg.error(err.error?.message || 'Login failed');
      }
    });
  }

  loginAsGuest() {
    this.loading = true;
    this.auth.loginAsGuest().subscribe({
      next: user => this.onLoggedIn(`You're in as ${user.userName}`),
      error: err => {
        this.loading = false;
        this.msg.error(err.error?.message || 'Could not start a guest session');
      }
    });
  }

  private onLoggedIn(message: string) {
    this.loading = false;
    this.socket.connect(this.auth.token!);
    this.unread.start();
    this.msg.success(message);
    this.router.navigate(['/home']);
  }
}
