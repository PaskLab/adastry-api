import {
  Entity,
  Column,
  OneToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AccountHistory } from './account-history.entity';
import { Pool } from '../../pool/entities/pool.entity';
import { Epoch } from '../../epoch/entities/epoch.entity';
import { AccountAddress } from './account-address.entity';
import { Transaction } from './transaction.entity';
import { AccountWithdraw } from './account-withdraw.entity';
import { StrToBigInt } from '../../utils/utils';

@Entity()
export class Account {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  @Index({ unique: true })
  stakeAddress!: string;

  @Column({ type: 'bigint', default: 0, transformer: [StrToBigInt] })
  rewardsSum!: number;

  @Column({ default: 0 })
  loyalty!: number;

  @ManyToOne(() => Epoch, { onDelete: 'SET NULL' })
  epoch!: Epoch | null; // Last updated epoch

  @ManyToOne(() => Pool, (pool) => pool.accounts, { onDelete: 'SET NULL' })
  pool!: Pool | null;

  @OneToMany(() => AccountHistory, (history) => history.account)
  history!: AccountHistory[];

  @OneToMany(() => AccountAddress, (address) => address.account)
  addresses!: AccountAddress[];

  @Column({ type: 'timestamp', nullable: true })
  addressesLastSync!: Date | null;

  @OneToMany(() => Transaction, (transaction) => transaction.account)
  transactions!: Transaction[];

  @Column({ type: 'timestamp', nullable: true })
  transactionsLastSync!: Date | null;

  @OneToMany(() => AccountWithdraw, (withdraw) => withdraw.account)
  withdraw!: AccountWithdraw[];

  // Special columns
  @CreateDateColumn()
  createdAt!: string;

  @UpdateDateColumn()
  updatedAt!: string;
}
