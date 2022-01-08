import {
  Entity,
  Column,
  ManyToOne,
  PrimaryGeneratedColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Account } from './account.entity';
import { Transaction } from './transaction.entity';

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

  @OneToMany(() => Transaction, (transaction) => transaction.address)
  transactions!: Transaction[];
}
