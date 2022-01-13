import {
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Transaction } from './transaction.entity';
import { AccountAddress } from './account-address.entity';

@Entity()
@Index(['tx', 'address'], { unique: true })
export class TransactionAddress {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Transaction, { onDelete: 'CASCADE' })
  tx!: Transaction;

  @ManyToOne(() => AccountAddress, { onDelete: 'CASCADE' })
  address!: AccountAddress;

  // Special columns
  @CreateDateColumn()
  createdAt!: string;
}
