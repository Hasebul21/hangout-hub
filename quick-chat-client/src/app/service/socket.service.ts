import { Injectable } from '@angular/core';
import { Observable, Subject, filter, map } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../environments/environment';

interface SocketEvent {
  name: string;
  data: any;
}

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket: Socket | null = null;
  private events$ = new Subject<SocketEvent>();

  connect(token: string) {
    if (this.socket) {
      return;
    }
    this.socket = io(environment.apiBaseUrl, { auth: { token } });
    this.socket.onAny((name, data) => this.events$.next({ name, data }));
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }

  // works even if a component subscribes before the socket is connected
  on<T>(name: string): Observable<T> {
    return this.events$.pipe(
      filter(event => event.name === name),
      map(event => event.data as T)
    );
  }

  emit(name: string, data: unknown) {
    this.socket?.emit(name, data);
  }

  async request<T>(name: string, data: unknown): Promise<T> {
    if (!this.socket) {
      throw new Error('Not connected');
    }
    return this.socket.timeout(5000).emitWithAck(name, data);
  }
}
