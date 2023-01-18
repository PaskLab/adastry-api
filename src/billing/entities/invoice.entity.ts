import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  Index,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { StrToBigInt } from '../../utils/utils';
import { InvoiceAccount } from './invoice-account.entity';
import { InvoicePool } from './invoice-pool.entity';

@Entity()
@Index(['invoiceId', 'txHash'], { unique: true })
export class Invoice {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  invoiceId!: string;

  @Column()
  txHash!: string;

  @Column({ default: false })
  confirmed!: boolean;

  @Column({ default: false })
  canceled!: boolean;

  @Column({ type: 'bigint', default: 0, transformer: [StrToBigInt] })
  totalAmount!: number;

  @ManyToOne(() => User)
  user!: User;

  @OneToMany(() => InvoiceAccount, (ia) => ia.invoice, { cascade: true })
  accounts!: InvoiceAccount[];

  @OneToMany(() => InvoicePool, (ip) => ip.invoice, { cascade: true })
  pools!: InvoicePool[];

  @Column()
  createdAt!: string;

  @Column()
  confirmedAt!: string;
}
