import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module.js';
import { AuthController } from './auth.controller.js';

@Module({
  imports: [UsersModule],
  controllers: [AuthController],
})
export class AuthModule {}
