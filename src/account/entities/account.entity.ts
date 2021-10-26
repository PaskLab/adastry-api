import {
  Entity,
  Column,
  OneToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  Index,
} from 'typeorm';
import { AccountHistory } from './account-history.entity';
import { Pool } from '../../pool/entities/pool.entity';
import { Epoch } from '../../epoch/entities/epoch.entity';
import { Currency } from '../../spot/entities/currency.entity';

@Entity()
export class Account {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  @Index({ unique: true })
  stakeAddress!: string;

  @Column({ default: '' })
  name!: string;

  @Column({ default: 0 })
  rewardsSum!: number;

  @Column({ default: 0 })
  loyalty!: number;

  @ManyToOne(() => Epoch, { onDelete: 'SET NULL' })
  epoch!: Epoch | null; // Last updated epoch

  @ManyToOne(() => Pool, (pool) => pool.accounts, { onDelete: 'SET NULL' })
  pool!: Pool | null;

  @OneToMany(() => AccountHistory, (history) => history.account)
  history!: AccountHistory[];

  @ManyToOne(() => Currency)
  currency!: Currency | null;
}
