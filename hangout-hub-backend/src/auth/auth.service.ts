import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service.js';

export interface JwtPayload {
  sub: number;
  email: string;
  guest?: boolean;
}

export const GUEST_USER = {
  id: 0,
  userName: 'Guest',
  email: '',
  professionalTitle: null,
  location: null,
  bio: null,
  portfolio: null,
  skills: null,
  hobbies: null,
  instagram: null,
  isOwner: false,
  isDemo: false,
  isGuest: true,
};

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmailWithPassword(email);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('Wrong email or password');
    }

    const payload: JwtPayload = { sub: user.id, email: user.email };
    return {
      accessToken: await this.jwtService.signAsync(payload),
      user: await this.usersService.findById(user.id),
    };
  }

  async loginAsGuest() {
    const payload: JwtPayload = { sub: GUEST_USER.id, email: '', guest: true };
    const now = new Date().toISOString();
    return {
      accessToken: await this.jwtService.signAsync(payload, {
        expiresIn: '1d',
      }),
      user: { ...GUEST_USER, createdAt: now, updatedAt: now },
    };
  }

  async verifyToken(token: string): Promise<JwtPayload> {
    return this.jwtService.verifyAsync<JwtPayload>(token);
  }
}
