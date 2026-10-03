import { Module } from '@nestjs/common';
import { ChatModule } from '../chat/chat.module.js';
import { UsersModule } from '../users/users.module.js';
import { PostsController } from './posts.controller.js';
import { PostsService } from './posts.service.js';

@Module({
  imports: [UsersModule, ChatModule],
  controllers: [PostsController],
  providers: [PostsService],
  exports: [PostsService],
})
export class PostsModule {}
