import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway.js';
import { PresenceService } from './presence.service.js';

@Module({
  providers: [ChatGateway, PresenceService],
  exports: [ChatGateway],
})
export class ChatModule {}
