import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Message } from '../chat/message.entity.js';
import { Comment } from '../posts/comment.entity.js';
import { Post } from '../posts/post.entity.js';
import { Reaction } from '../posts/reaction.entity.js';
import { User } from '../users/user.entity.js';
import { SeedService } from './seed.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([User, Post, Reaction, Comment, Message])],
  providers: [SeedService],
})
export class SeedModule {}
