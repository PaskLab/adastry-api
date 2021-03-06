import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Index,
} from 'typeorm';
import { Epoch } from '../../epoch/entities/epoch.entity';
import { Pool } from './pool.entity';
import { Account } from '../../account/entities/account.entity';
import { PoolOwner } from './pool-owner.entity';
import { StrToBigInt } from '../../utils/utils';

@Entity()
@Index(['pool', 'epoch', 'txHash'], { unique: true })
export class PoolCert {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Pool, (pool) => pool.certs, { onDelete: 'CASCADE' })
  pool!: Pool;

  @ManyToOne(() => Epoch, { onDelete: 'CASCADE' })
  epoch!: Epoch;

  @OneToMany(() => PoolOwner, (poolOwner) => poolOwner.cert, { cascade: true })
  owners!: PoolOwner[];

  @ManyToOne(() => Account, { cascade: true, onDelete: 'SET NULL' })
  rewardAccount!: Account;

  @Column({ type: 'float', default: null, nullable: true })
  margin!: number | null;

  @Column({
    type: 'bigint',
    transformer: [StrToBigInt],
    default: null,
    nullable: true,
  })
  fixed!: number | null;

  @Column({ default: false })
  active!: boolean;

  @Column({ type: 'bigint', transformer: [StrToBigInt] })
  block!: number;

  /*
    The purpose for recording the transaction hash is to be able to filter
    through pool update event. This is required to work along with the data structure provided by Blockfrost
    as query against pool update do not return any epoch nor dates. To prevent doing multiples request to lookup
    each update, txHash is stored and must be unique.
  */
  @Column()
  txHash!: string;
}
