import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import bcrypt from 'bcryptjs';
import sharp from 'sharp';
import { Repository } from 'typeorm';
import { OWNER } from '../seed/owner.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { User } from './user.entity.js';

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
        // an empty field clears the value
        (user as any)[key] = value.trim() === '' ? null : value.trim();
      }
    }
    if (image) {
      user.avatar = await this.resizeAvatar(image);
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

  private async resizeAvatar(image: Express.Multer.File) {
    if (!image.mimetype.startsWith('image/')) {
      throw new BadRequestException('Profile picture must be an image');
    }
    try {
      return await sharp(image.buffer)
        .rotate()
        .resize(400, 400, { fit: 'cover' })
        .jpeg({ quality: 75 })
        .toBuffer();
    } catch {
      throw new BadRequestException('Could not read that image');
    }
  }
}
