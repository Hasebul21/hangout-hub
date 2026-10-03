import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { UsersService } from '../users/users.service.js';
import { AuthService, GUEST_USER } from './auth.service.js';
import { CurrentUserId } from './current-user-id.decorator.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Post('register')
  register(@Body() body: RegisterDto) {
    return this.usersService.create(
      body.userName.trim(),
      body.email,
      body.password,
    );
  }

  @Post('login')
  @HttpCode(200)
  login(@Body() body: LoginDto) {
    return this.authService.login(body.email, body.password);
  }

  @Post('guest')
  @HttpCode(200)
  guest() {
    return this.authService.loginAsGuest();
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(
    @CurrentUserId() userId: number,
    @Req() req: Request & { isGuest?: boolean },
  ) {
    if (req.isGuest) {
      return GUEST_USER;
    }
    return this.usersService.findById(userId);
  }
}
