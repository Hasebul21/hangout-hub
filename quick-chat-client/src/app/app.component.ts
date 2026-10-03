import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './service/auth.service';
import { SocketService } from './service/socket.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {

  constructor(private auth: AuthService, private socket: SocketService) { }

  ngOnInit() {
    // reconnect after a page refresh
    if (this.auth.isLoggedIn()) {
      this.socket.connect(this.auth.token!);
    }
  }
}
