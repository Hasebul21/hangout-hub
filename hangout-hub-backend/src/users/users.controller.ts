import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Put,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { CurrentUserId } from '../auth/current-user-id.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { User } from './user.entity.js';
import { UsersService } from './users.service.js';

const DEFAULT_AVATAR = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#e2e4f0"/><circle cx="32" cy="25" r="12" fill="#a3a8c3"/><path d="M10 58c2-12 11-18 22-18s20 6 22 18z" fill="#a3a8c3"/></svg>`;

// Other people's email addresses stay private
function hideEmail(user: User, currentUserId: number) {
  if (user.id === currentUserId) {
    return user;
  }
  const { email, ...rest } = user;
  return rest;
}

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@CurrentUserId() currentUserId: number) {
    const users = await this.usersService.findAll();
    return users.map((user) => hideEmail(user, currentUserId));
  }

  @Put('me')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('avatar', { limits: { fileSize: 2 * 1024 * 1024 } }),
  )
  updateProfile(
    @CurrentUserId() userId: number,
    @Body() body: UpdateProfileDto,
    @UploadedFile() avatar?: Express.Multer.File,
  ) {
    return this.usersService.updateProfile(userId, body, avatar);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUserId() currentUserId: number,
  ) {
    const user = await this.usersService.findById(id);
    return hideEmail(user, currentUserId);
  }

  // public on purpose, <img> tags can't send the auth header
  @Get(':id/avatar')
  async avatar(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    const avatar = await this.usersService.findAvatar(id);
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (!avatar) {
      res.type('image/svg+xml').send(DEFAULT_AVATAR);
      return;
    }
    res.type('image/jpeg').send(avatar);
  }
}
