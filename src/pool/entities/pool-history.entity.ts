import {
  Entity,
  Column,
  ManyToOne,
  PrimaryGeneratedColumn,
  Index,
} from 'typeorm';
import { Epoch } from '../../epoch/entities/epoch.entity';
import { Pool } from './pool.entity';
import { PoolCert } from './pool-cert.entity';

@Entity()
@Index(['pool', 'epoch'], { unique: true })
export class PoolHistory {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Pool, (pool) => pool.history, { onDelete: 'CASCADE' })
  pool!: Pool;

  @ManyToOne(() => Epoch, { onDelete: 'CASCADE' })
  epoch!: Epoch;

  @Column({ type: 'bigint', default: 0 })
  rewards!: number;

  @Column({ type: 'bigint', default: 0 })
  fees!: number;

  @Column({ default: 0 })
  blocks!: number;

  @Column({ type: 'bigint', default: 0 })
  activeStake!: number;

  @ManyToOne(() => PoolCert)
  cert!: PoolCert;

  @Column({ default: false })
  rewardsRevised!: boolean;
}
