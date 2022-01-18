import {
  Column,
  ManyToOne,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
  Entity,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Account } from './account.entity';
import { TransactionAddress } from './transaction-address.entity';

@Entity()
@Index(['account', 'txHash'], { unique: true })
export class Transaction {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Account, (account) => account.transactions, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  account!: Account;

  @OneToMany(() => TransactionAddress, (txAddress) => txAddress.tx)
  addresses!: TransactionAddress[];

  @Column()
  txHash!: string;

  @Column()
  txIndex!: number;

  @Column({ type: 'bigint' })
  blockHeight!: number;

  @Column()
  blockTime!: number;

  @Column()
  received!: string;

  @Column()
  sent!: string;

  @Column({ type: 'bigint' })
  fees!: number;

  @Column({ type: 'bigint' })
  deposit!: number;

  @Column()
  withdrawalCount!: number;

  @Column()
  mirCertCount!: number;

  @Column()
  delegationCount!: number;

  @Column()
  stakeCertCount!: number;

  @Column()
  poolUpdateCount!: number;

  @Column()
  poolRetireCount!: number;

  @Column()
  assetMintCount!: number;

  @Column()
  redeemerCount!: number;

  @Column()
  validContract!: boolean;

  @Column()
  tags!: string;

  @Column({ default: false })
  needReview!: boolean;

  // Special columns
  @CreateDateColumn()
  createdAt!: string;

  @UpdateDateColumn()
  updatedAt!: string;
}
