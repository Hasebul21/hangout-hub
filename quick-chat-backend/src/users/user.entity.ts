import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('accounts')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50 })
  userName: string;

  @Column({ unique: true })
  email: string;

  @Column({ select: false })
  password: string;

  @Column({ nullable: true })
  professionalTitle: string;

  @Column({ nullable: true })
  location: string;

  @Column({ length: 300, nullable: true })
  bio: string;

  @Column({ nullable: true })
  portfolio: string;

  @Column({ length: 100, nullable: true })
  skills: string;

  @Column({ length: 100, nullable: true })
  hobbies: string;

  @Column({ nullable: true })
  instagram: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
