import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { OWNER } from '../seed/seed-data.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { User } from './user.entity.js';

const MAX_AVATAR_SIZE = 1024 * 1024;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async create(userName: string, email: string, password: string) {
    email = email.toLowerCase();
    const existing = await this.users.findOneBy({ email });
    if (existing || email === OWNER.email) {
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

  findOwner() {
    return this.users.findOneBy({ isOwner: true });
  }

  findByEmailWithPassword(email: string) {
    return this.users
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email: email.toLowerCase() })
      .getOne();
  }

  findAll() {
    return this.users.find({ order: { userName: 'ASC' } });
  }

  async updateProfile(
    id: number,
    changes: UpdateProfileDto,
    image?: Express.Multer.File,
  ) {
    const user = await this.findById(id);

    for (const [key, value] of Object.entries(changes)) {
      if (value !== undefined) {
        (user as any)[key] = value.trim() === '' ? null : value.trim();
      }
    }
    if (image) {
      user.avatar = await this.checkAvatar(image);
    }

    await this.users.save(user);
    return this.findById(id);
  }

  async findAvatar(id: number) {
    const user = await this.users
      .createQueryBuilder('user')
      .addSelect('user.avatar')
      .where('user.id = :id', { id })
      .getOne();
    return user?.avatar ?? null;
  }

  private async checkAvatar(image: Express.Multer.File) {
    const bytes = image.buffer;
    const isJpeg =
      bytes.length > 3 &&
      bytes[0] === 0xff &&
      bytes[1] === 0xd8 &&
      bytes[2] === 0xff;
    if (image.mimetype !== 'image/jpeg' || !isJpeg) {
      throw new BadRequestException('Profile picture must be a JPEG image');
    }
    if (image.size > MAX_AVATAR_SIZE) {
      throw new BadRequestException('Profile picture is too big');
    }
    return image.buffer;
  }
}
