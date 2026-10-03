import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('messages')
@Index(['conversationId', 'createdAt'])
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // "smallerId_biggerId", the same for both people in the chat
  @Column({ length: 40 })
  conversationId: string;

  @Column()
  senderId: number;

  @Index()
  @Column()
  receiverId: number;

  @Column({ length: 1000 })
  content: string;

  @Column({ default: false })
  read: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
