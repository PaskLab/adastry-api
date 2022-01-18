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
import { StrToBigInt } from '../../utils/utils';

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

  @Column({ type: 'bigint', default: 0, transformer: [StrToBigInt] })
  rewards!: number;

  @Column({ type: 'bigint', default: 0, transformer: [StrToBigInt] })
  activeStake!: number;

  @Column({ type: 'bigint', default: 0, transformer: [StrToBigInt] })
  balance!: number;

  @Column({ type: 'bigint', default: 0, transformer: [StrToBigInt] })
  withdrawable!: number;

  @Column({ type: 'bigint', default: 0, transformer: [StrToBigInt] })
  withdrawn!: number;

  @Column({ type: 'bigint', default: 0, transformer: [StrToBigInt] })
  opRewards!: number;

  @Column({ type: 'bigint', default: 0, transformer: [StrToBigInt] })
  revisedRewards!: number;

  @Column({ type: 'float', default: 0 })
  stakeShare!: number;

  @ManyToOne(() => Pool, { cascade: true, onDelete: 'SET NULL' })
  pool!: Pool | null;

  @Column({ default: false })
  owner!: boolean;
}
