import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
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
import { NavbarComponent } from '../navbar/navbar.component';
import { SocketService } from '../service/socket.service';

@Component({
  selector: 'app-trending-post',
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
  ],
  templateUrl: './trending-post.component.html',
  styleUrl: './trending-post.component.scss'
})
export class TrendingPostComponent implements OnInit, OnDestroy {
  trendingPosts: any[] = [];
  isLoading = true;
  private subscription?: Subscription;

  constructor(private socket: SocketService) { }

  ngOnInit(): void {
    this.subscription = this.socket.on<any[]>('trending-posts').subscribe(posts => {
      this.trendingPosts = posts;
      this.isLoading = false;
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }
}
