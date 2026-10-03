import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller.js';
import { AuthModule } from './auth/auth.module.js';
import { ChatModule } from './chat/chat.module.js';
import { ElasticModule } from './elastic/elastic.module.js';
import { PostsModule } from './posts/posts.module.js';
import { RedisModule } from './redis/redis.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get('DATABASE_URL'),
        ssl: config.get('DATABASE_SSL') === 'true',
        autoLoadEntities: true,
        synchronize: config.get('DB_SYNCHRONIZE') !== 'false',
      }),
    }),
    RedisModule,
    ElasticModule,
    AuthModule,
    ChatModule,
    PostsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
