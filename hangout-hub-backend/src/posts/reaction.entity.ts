import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Post } from './post.entity.js';

export type ReactionType = 'like' | 'dislike';

@Entity('post_reactions')
@Unique(['postId', 'userId'])
export class Reaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  postId: string;

  @ManyToOne(() => Post, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'postId' })
  post: Post;

  @Column()
  userId: number;

  @Column({ type: 'varchar', length: 10 })
  type: ReactionType;
}
