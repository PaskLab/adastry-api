import {
  Entity,
  Column,
  ManyToOne,
  PrimaryGeneratedColumn,
  Index,
} from 'typeorm';
import { Epoch } from '../../epoch/entities/epoch.entity';
import { Pool } from './pool.entity';
import { PoolUpdate } from './pool-update.entity';

@Entity()
@Index(['pool', 'epoch'], { unique: true })
export class PoolHistory {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Pool, (pool) => pool.history, { onDelete: 'CASCADE' })
  pool!: Pool;

  @ManyToOne(() => Epoch, { onDelete: 'CASCADE' })
  epoch!: Epoch;

  @Column({ default: 0 })
  rewards!: number;

  @Column({ default: 0 })
  fees!: number;

  @Column({ default: 0 })
  blocks!: number;

  @Column({ default: 0 })
  activeStake!: number;

  @ManyToOne(() => PoolUpdate)
  registration!: PoolUpdate;
}
