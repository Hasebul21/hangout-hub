import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { CurrentUserId } from '../auth/current-user-id.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { User } from './user.entity.js';
import { UsersService } from './users.service.js';

// Other people's email addresses stay private
function hideEmail(user: User, currentUserId: number) {
  if (user.id === currentUserId) {
    return user;
  }
  const { email, ...rest } = user;
  return rest;
}

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async findAll(@CurrentUserId() currentUserId: number) {
    const users = await this.usersService.findAll();
    return users.map((user) => hideEmail(user, currentUserId));
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUserId() currentUserId: number,
  ) {
    const user = await this.usersService.findById(id);
    return hideEmail(user, currentUserId);
  }
}
