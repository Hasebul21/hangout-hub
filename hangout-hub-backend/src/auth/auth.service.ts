import {
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service.js';

const GUESTS_PER_IP_PER_HOUR = 5;
const GUESTS_PER_HOUR = 100;
const HOUR = 60 * 60 * 1000;

export interface JwtPayload {
  sub: number;
  email: string;
}

@Injectable()
export class AuthService {
  private guestLogins = new Map<string, number[]>();
  private allGuestLogins: number[] = [];

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

  async loginAsGuest(ip: string) {
    const now = Date.now();
    this.forgetOldGuestLogins(now);

    const fromThisIp = this.guestLogins.get(ip) ?? [];
    if (
      fromThisIp.length >= GUESTS_PER_IP_PER_HOUR ||
      this.allGuestLogins.length >= GUESTS_PER_HOUR
    ) {
      throw new HttpException(
        'Too many guest accounts, please try again later',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    fromThisIp.push(now);
    this.guestLogins.set(ip, fromThisIp);
    this.allGuestLogins.push(now);

    const user = await this.usersService.createGuest();
    const payload: JwtPayload = { sub: user.id, email: user.email };
    return {
      accessToken: await this.jwtService.signAsync(payload, {
        expiresIn: '1d',
      }),
      user,
    };
  }

  private forgetOldGuestLogins(now: number) {
    this.allGuestLogins = this.allGuestLogins.filter(
      (time) => now - time < HOUR,
    );
    for (const [ip, times] of this.guestLogins) {
      const recent = times.filter((time) => now - time < HOUR);
      if (recent.length) {
        this.guestLogins.set(ip, recent);
      } else {
        this.guestLogins.delete(ip);
      }
    }
  }

  async verifyToken(token: string): Promise<JwtPayload> {
    return this.jwtService.verifyAsync<JwtPayload>(token);
  }
}
