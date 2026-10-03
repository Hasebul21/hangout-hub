import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AuthService } from '../auth/auth.service.js';
import { allowedOrigins } from '../cors.js';
import { MessagesService } from './messages.service.js';
import { PresenceService } from './presence.service.js';

export function userRoom(userId: number) {
  return `user:${userId}`;
}

@WebSocketGateway({ cors: { origin: allowedOrigins(), credentials: true } })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly authService: AuthService,
    private readonly presenceService: PresenceService,
    private readonly messagesService: MessagesService,
  ) {}

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
    await this.presenceService.userConnected(client.data.userId);
    client.data.counted = true;
    this.logger.log(`User ${client.data.userId} connected (${client.id})`);
    await this.broadcastPresence();
  }

  async handleDisconnect(client: Socket) {
    if (!client.data.counted) {
      return;
    }
    await this.presenceService.userDisconnected(client.data.userId);
    this.logger.log(`User ${client.data.userId} disconnected (${client.id})`);
    await this.broadcastPresence();
  }

  @SubscribeMessage('send-message')
  async sendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { receiverId: number; content: string },
  ) {
    const senderId = client.data.userId;
    if (!senderId) {
      return { error: 'Not connected' };
    }

    try {
      const message = await this.messagesService.send(
        senderId,
        Number(body?.receiverId),
        body?.content,
      );
      // the receiver, and the sender's other tabs
      client
        .to(userRoom(message.receiverId))
        .to(userRoom(senderId))
        .emit('message', message);
      return message;
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Could not send' };
    }
  }

  private async broadcastPresence() {
    this.sendToAll('presence', await this.presenceService.getPresence());
  }

  sendToUser(userId: number, event: string, data: unknown) {
    this.server.to(userRoom(userId)).emit(event, data);
  }

  sendToAll(event: string, data: unknown) {
    this.server.emit(event, data);
  }
}
