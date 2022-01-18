import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  OneToOne,
  JoinColumn,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Epoch } from '../../epoch/entities/epoch.entity';
import { Account } from '../../account/entities/account.entity';
import { PoolHistory } from './pool-history.entity';
import { PoolCert } from './pool-cert.entity';
import { StrToBigInt } from '../../utils/utils';

@Entity()
export class Pool {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  @Index({ unique: true })
  poolId!: string;

  @Column({ default: '' })
  name!: string;

  @Column({ default: 0 })
  blocksMinted!: number;

  @Column({ type: 'bigint', default: 0, transformer: [StrToBigInt] })
  liveStake!: number;

  @Column({ type: 'float', default: 0 })
  liveSaturation!: number;

  @Column({ default: 0 })
  liveDelegators!: number;

  @OneToOne(() => PoolCert, { onDelete: 'SET NULL' })
  @JoinColumn()
  lastCert!: PoolCert | null;

  @Column({ default: false })
  isMember!: boolean;

  @ManyToOne(() => Epoch, { onDelete: 'SET NULL' })
  epoch!: Epoch | null;

  @OneToMany(() => Account, (account) => account.pool)
  accounts!: Account[];

  @OneToMany(() => PoolHistory, (poolHistory) => poolHistory.pool)
  history!: PoolHistory[];

  @OneToMany(() => PoolCert, (cert) => cert.pool)
  certs!: PoolCert[];
}
