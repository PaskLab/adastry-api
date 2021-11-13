import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Account } from './account.entity';
import { User } from '../../user/entities/user.entity';

@Entity()
@Index(['account', 'user'], { unique: true })
export class UserAccount {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Account, { onDelete: 'CASCADE' })
  account!: Account;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user!: User;

  @Column({ default: '' })
  name!: string;

  // Special columns
  @CreateDateColumn()
  createdAt!: string;

  @UpdateDateColumn()
  updatedAt!: string;
}
