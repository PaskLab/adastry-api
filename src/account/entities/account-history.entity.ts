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

  @Column({ type: 'bigint', default: 0 })
  rewards!: number;

  @Column({ type: 'bigint', default: 0 })
  activeStake!: number;

  @Column({ type: 'bigint', default: 0 })
  balance!: number;

  @Column({ type: 'bigint', default: 0 })
  withdrawable!: number;

  @Column({ type: 'bigint', default: 0 })
  withdrawn!: number;

  @Column({ type: 'bigint', default: 0 })
  opRewards!: number;

  @Column({ type: 'bigint', default: 0 })
  revisedRewards!: number;

  @Column({ type: 'float', default: 0 })
  stakeShare!: number;

  @ManyToOne(() => Pool, { cascade: true, onDelete: 'SET NULL' })
  pool!: Pool | null;

  @Column({ default: false })
  owner!: boolean;
}
