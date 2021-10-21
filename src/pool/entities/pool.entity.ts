import {
  Entity,
  Column,
  PrimaryColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Epoch } from '../../epoch/entities/epoch.entity';
import { Account } from '../../account/entities/account.entity';
import { PoolHistory } from './pool-history.entity';
import { PoolUpdate } from './pool-update.entity';

@Entity()
export class Pool {
  @PrimaryColumn()
  poolId!: string;

  @Column({ default: '' })
  name!: string;

  @Column({ default: 0 })
  blocksMinted!: number;

  @Column({ default: 0 })
  liveStake!: number;

  @Column({ default: 0 })
  liveSaturation!: number;

  @Column({ default: 0 })
  liveDelegators!: number;

  @OneToOne(() => PoolUpdate)
  @JoinColumn()
  registration!: PoolUpdate | null;

  @Column({ default: false })
  isMember!: boolean;

  @ManyToOne(() => Epoch)
  epoch!: Epoch | null;

  @OneToMany(() => Account, (account) => account.pool)
  accounts!: Account[];

  @OneToMany(() => PoolHistory, (poolHistory) => poolHistory.pool)
  history!: PoolHistory[];

  @OneToMany(() => PoolUpdate, (update) => update.pool)
  updates!: PoolUpdate[];
}
