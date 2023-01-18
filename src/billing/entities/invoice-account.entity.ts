import {
  Entity,
  PrimaryGeneratedColumn,
  Index,
  ManyToOne,
  Column,
} from 'typeorm';
import { Invoice } from './invoice.entity';
import { Account } from '../../account/entities/account.entity';
import { StrToBigInt } from '../../utils/utils';

@Entity()
@Index(['invoice', 'account'], { unique: true })
export class InvoiceAccount {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Invoice, { onDelete: 'CASCADE' })
  invoice!: Invoice;

  @ManyToOne(() => Account, { onDelete: 'CASCADE' })
  account!: Account;

  @Column({ type: 'bigint', default: 0, transformer: [StrToBigInt] })
  unitPrice!: number;
}
