import {
  Column,
  ManyToOne,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
  Entity,
} from 'typeorm';
import { AccountAddress } from './account-address.entity';

@Entity()
@Index(['address', 'txHash'], { unique: true })
export class Transaction {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => AccountAddress, (address) => address.transactions, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  address!: AccountAddress;

  @Column()
  txHash!: string;

  @Column()
  txIndex!: number;

  @Column()
  blockHeight!: number;

  @Column()
  blockTime!: number;

  @Column()
  received!: string;

  @Column()
  sent!: string;

  @Column()
  fees!: number;

  @Column()
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
}
