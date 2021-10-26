import { Entity, ManyToOne, PrimaryGeneratedColumn, Index } from 'typeorm';
import { PoolUpdate } from './pool-update.entity';
import { Account } from '../../account/entities/account.entity';

@Entity()
@Index(['own', 'account'], { unique: true })
export class PoolOwner {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => PoolUpdate, (poolUpdate) => poolUpdate.owners, {
    onDelete: 'CASCADE',
    orphanedRowAction: 'delete',
  })
  own!: PoolUpdate;

  @ManyToOne(() => Account, {
    onDelete: 'CASCADE',
    orphanedRowAction: 'delete',
  })
  account!: Account;
}
