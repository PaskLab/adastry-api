import {
  PrimaryGeneratedColumn,
  Entity,
  Column,
  Index,
  ManyToOne,
} from 'typeorm';
import { Asset } from './asset.entity';
import { User } from '../../user/entities/user.entity';

@Entity()
@Index(['asset', 'user'], { unique: true })
export class UserMapping {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Asset, { onDelete: 'CASCADE' })
  asset!: Asset;

  @Column({ default: '' })
  koinlyId!: string;

  @Column({ default: false })
  useGlobalKoinlyId!: boolean;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user!: User;
}
