import {
  Entity,
  Column,
  ManyToOne,
  PrimaryGeneratedColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Account } from './account.entity';
import { AddressTransaction } from './address-transaction.entity';

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

  @OneToMany(() => AddressTransaction, (transaction) => transaction.address)
  transactions!: AddressTransaction[];
}
