import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module.js';
import { ChatGateway } from './chat.gateway.js';
import { Message } from './message.entity.js';
import { MessagesController } from './messages.controller.js';
import { MessagesService } from './messages.service.js';
import { PresenceService } from './presence.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Message]), UsersModule],
  controllers: [MessagesController],
  providers: [ChatGateway, PresenceService, MessagesService],
  exports: [ChatGateway],
})
export class ChatModule {}
