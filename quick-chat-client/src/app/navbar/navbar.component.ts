import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { Router, RouterModule } from '@angular/router';
import { NzMessageService } from 'ng-zorro-antd/message';
import { User } from '../models/user';
import { AuthService } from '../service/auth.service';
import { SocketService } from '../service/socket.service';
import { avatarUrl, useDefaultAvatar } from '../shared/avatar';

@Component({
  selector: 'app-navbar',
  imports: [CommonModule, RouterModule, MatIconModule, MatMenuModule, MatButtonModule, MatDividerModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss'
})
export class NavbarComponent implements OnInit {
  loggedInUser: User | null = null;
  mobileMenuOpen = false;
  avatar = '';
  useDefaultAvatar = useDefaultAvatar;

  constructor(private auth: AuthService,
    private socket: SocketService,
    private msg: NzMessageService,
    private router: Router) { }

  ngOnInit() {
    this.loggedInUser = this.auth.currentUser;
    this.avatar = avatarUrl(this.loggedInUser?.id, this.loggedInUser?.updatedAt);
  }

  logout() {
    this.socket.disconnect();
    this.auth.logout();
    this.loggedInUser = null;
    this.msg.success('You have been logged out');
    this.router.navigate(['/login']);
  }
}
