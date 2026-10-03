import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { User } from './user.entity.js';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async create(userName: string, email: string, password: string) {
    email = email.toLowerCase();
    const existing = await this.users.findOneBy({ email });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const user = this.users.create({
      userName,
      email,
      password: await bcrypt.hash(password, 10),
    });
    const saved = await this.users.save(user);
    return this.findById(saved.id);
  }

  async findById(id: number) {
    const user = await this.users.findOneBy({ id });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  findAll() {
    return this.users.find({ order: { userName: 'ASC' } });
  }
}
