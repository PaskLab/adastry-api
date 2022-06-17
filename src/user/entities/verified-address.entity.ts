import {
  Entity,
  Column,
  Index,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity()
export class VerifiedAddress {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  @Index({ unique: true })
  stakeAddress!: string;

  @ManyToOne(() => User)
  user!: User;

  // Special columns
  @CreateDateColumn()
  createdAt!: string;
}
