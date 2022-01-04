import {
  Entity,
  Column,
  ManyToOne,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Account } from './account.entity';
import { AccountTransaction } from './account-transaction.entity';

@Entity()
export class AccountAddress {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @ManyToOne(() => Account, (account) => account.addresses, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  account!: Account;

  @Column()
  @Index({ unique: true })
  address!: string;

  @OneToMany(() => AccountTransaction, (transaction) => transaction.address)
  transactions!: AccountTransaction[];

  // Special columns
  @CreateDateColumn()
  createdAt!: string;
}
