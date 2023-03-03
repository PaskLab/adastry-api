import {
  Entity,
  Column,
  Index,
  PrimaryGeneratedColumn,
  ManyToOne,
} from 'typeorm';
import { User } from './user.entity';

@Entity()
@Index(['slug', 'user', 'type'], { unique: true })
export class UserCategory {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column()
  slug!: string;

  @Column()
  type!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user!: User;
}
