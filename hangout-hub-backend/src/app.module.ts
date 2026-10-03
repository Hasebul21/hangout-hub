import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import pg from 'pg';
import { AppController } from './app.controller.js';
import { AuthModule } from './auth/auth.module.js';
import { ChatModule } from './chat/chat.module.js';
import { PostsModule } from './posts/posts.module.js';
import { SeedModule } from './seed/seed.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        // passed in directly so bundlers include the driver
        driver: pg,
        url: config.get('DATABASE_URL'),
        ssl: config.get('DATABASE_SSL') === 'true',
        autoLoadEntities: true,
        synchronize: config.get('DB_SYNCHRONIZE') !== 'false',
      }),
    }),
    AuthModule,
    ChatModule,
    PostsModule,
    SeedModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
