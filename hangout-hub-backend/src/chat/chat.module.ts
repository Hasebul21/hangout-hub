import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module.js';
import { ChatGateway } from './chat.gateway.js';
import { MessagesController } from './messages.controller.js';
import { MessagesService } from './messages.service.js';
import { PresenceService } from './presence.service.js';

@Module({
  imports: [UsersModule],
  controllers: [MessagesController],
  providers: [ChatGateway, PresenceService, MessagesService],
  exports: [ChatGateway],
})
export class ChatModule {}
