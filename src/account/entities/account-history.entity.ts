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
import { PoolUpdate } from '../../pool/entities/pool-update.entity';

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
  balance!: number;

  @Column({ default: 0 })
  rewards!: number;

  @Column({ default: 0 })
  rewardsBalance!: number;

  @Column({ default: 0 })
  fullBalance!: number;

  @Column({ default: 0 })
  opRewards!: number;

  @ManyToOne(() => Pool, { cascade: true })
  pool!: Pool | null;

  @ManyToOne(() => PoolUpdate)
  own!: PoolUpdate | null;
}
