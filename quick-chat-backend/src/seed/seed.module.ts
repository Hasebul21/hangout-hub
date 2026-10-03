import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/user.entity.js';
import { SeedService } from './seed.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [SeedService],
})
export class SeedModule {}
