import {
  Entity,
  PrimaryGeneratedColumn,
  Index,
  ManyToOne,
  Column,
} from 'typeorm';
import { Invoice } from './invoice.entity';
import { StrToBigInt } from '../../utils/utils';
import { Pool } from '../../pool/entities/pool.entity';

@Entity()
@Index(['invoice', 'pool'], { unique: true })
export class InvoicePool {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Invoice, { onDelete: 'CASCADE' })
  invoice!: Invoice;

  @ManyToOne(() => Pool, { onDelete: 'CASCADE' })
  pool!: Pool;

  @Column({ type: 'bigint', default: 0, transformer: [StrToBigInt] })
  unitPrice!: number;
}
