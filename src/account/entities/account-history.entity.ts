import {
  Entity,
  Column,
  ManyToOne,
  PrimaryGeneratedColumn,
  Index,
} from 'typeorm';
import { Account } from './account.entity';
import { Epoch } from '../../epoch/entities/epoch.entity';
import { Pool } from '../../pool/entities/pool.entity';

@Entity()
@Index(['account', 'epoch'], { unique: true })
export class AccountHistory {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Account, (account) => account.history, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  account!: Account;

  @ManyToOne(() => Epoch, { onDelete: 'CASCADE' })
  epoch!: Epoch;

  @Column({ default: 0 })
  rewards!: number;

  @Column({ default: 0 })
  fullBalance!: number;

  @Column({ default: 0 })
  opRewards!: number;

  @ManyToOne(() => Pool, { cascade: true, onDelete: 'SET NULL' })
  pool!: Pool | null;

  @Column({ default: false })
  owner!: boolean;
}
