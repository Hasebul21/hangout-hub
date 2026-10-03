import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AuthService } from '../auth/auth.service.js';
import { allowedOrigins } from '../cors.js';

export function userRoom(userId: number) {
  return `user:${userId}`;
}

@WebSocketGateway({ cors: { origin: allowedOrigins(), credentials: true } })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(private readonly authService: AuthService) {}

  async handleConnection(client: Socket) {
    const token = client.handshake.auth?.token;
    if (!token) {
      client.disconnect();
      return;
    }

    try {
      const payload = await this.authService.verifyToken(token);
      client.data.userId = payload.sub;
    } catch {
      client.disconnect();
      return;
    }

    // every tab of the same user joins the same room
    await client.join(userRoom(client.data.userId));
    this.logger.log(`User ${client.data.userId} connected (${client.id})`);
  }

  handleDisconnect(client: Socket) {
    if (client.data.userId) {
      this.logger.log(`User ${client.data.userId} disconnected (${client.id})`);
    }
  }

  sendToUser(userId: number, event: string, data: unknown) {
    this.server.to(userRoom(userId)).emit(event, data);
  }

  sendToAll(event: string, data: unknown) {
    this.server.emit(event, data);
  }
}
