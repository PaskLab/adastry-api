import {
  Entity,
  Column,
  ManyToOne,
  PrimaryGeneratedColumn,
  Index,
} from 'typeorm';
import { Account } from './account.entity';

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
}
