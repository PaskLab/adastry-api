import {
  Entity,
  Column,
  ManyToOne,
  PrimaryGeneratedColumn,
  Index,
} from 'typeorm';
import { Epoch } from '../../epoch/entities/epoch.entity';
import { Currency } from './currency.entity';

@Entity()
@Index(['epoch', 'currency'], { unique: true })
export class Spot {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Epoch, { onDelete: 'CASCADE' })
  epoch!: Epoch;

  @ManyToOne(() => Currency, { onDelete: 'CASCADE' })
  currency!: Currency;

  @Column({ type: 'float' })
  price!: number;
}
