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

@Entity()
export class Account {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  @Index({ unique: true })
  stakeAddress!: string;

  @Column({ default: 0 })
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

  @Column({ default: () => "datetime('now')" })
  addressesLastSync!: Date;

  @OneToMany(() => Transaction, (transaction) => transaction.account)
  transactions!: Transaction[];

  @Column({ default: () => "datetime('now')" })
  transactionsLastSync!: Date;

  @OneToMany(() => AccountWithdraw, (withdraw) => withdraw.account)
  withdraw!: AccountWithdraw[];

  @Column({ default: () => "datetime('now')" })
  withdrawLastSync!: Date;

  // Special columns
  @CreateDateColumn()
  createdAt!: string;

  @UpdateDateColumn()
  updatedAt!: string;
}
