import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './service/auth.service';
import { SocketService } from './service/socket.service';
import { UnreadService } from './service/unread.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.component.html'
})
export class AppComponent implements OnInit {
  constructor(private auth: AuthService,
    private socket: SocketService,
    private unread: UnreadService) { }

  ngOnInit() {
    if (this.auth.isLoggedIn()) {
      this.socket.connect(this.auth.token!);
      this.unread.start();
    }
  }
}
