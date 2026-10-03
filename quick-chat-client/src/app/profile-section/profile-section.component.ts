import { CommonModule } from '@angular/common';
import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
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
import { SocketService } from '../service/socket.service';

@Component({
  selector: 'app-profile-section',
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
    MatSnackBarModule
  ],
  templateUrl: './profile-section.component.html',
  styleUrl: './profile-section.component.scss'
})
export class ProfileSectionComponent implements OnInit, OnDestroy {
  @Input() loggedInUser: any = null;
  trendingPostsCount = 0;
  private subscription?: Subscription;

  constructor(private socket: SocketService) { }

  ngOnInit(): void {
    this.subscription = this.socket.on<{ count: number }>('post-count').subscribe(data => {
      this.trendingPostsCount = data.count;
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }
}
