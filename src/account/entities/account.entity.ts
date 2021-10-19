import {
  Entity,
  Column,
  PrimaryColumn,
  OneToMany,
  ManyToOne,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { AccountHistory } from './account-history.entity';
import { Pool } from '../../pool/entities/pool.entity';
import { Epoch } from '../../epoch/entities/epoch.entity';
import { Currency } from '../../spot/entities/currency.entity';
import { CreateAccountDto } from '../dto/create-account.dto';

@Entity()
export class Account {
  @PrimaryColumn()
  stakeAddress!: string;

  @Column({ default: '' })
  name!: string;

  @Column({ default: 0 })
  rewardsSum!: number;

  @Column({ default: 0 })
  loyalty!: number;

  @ManyToOne(() => Epoch)
  epoch!: Epoch | null; // Last updated epoch

  @ManyToOne(() => Pool, (pool) => pool.accounts, { cascade: true })
  pool!: Pool | null;

  @OneToMany(() => AccountHistory, (history) => history.account)
  history!: AccountHistory[];

  @OneToOne(() => Currency)
  @JoinColumn()
  currency!: Currency | null;
}
