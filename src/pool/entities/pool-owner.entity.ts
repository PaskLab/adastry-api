import { Entity, ManyToOne, PrimaryGeneratedColumn, Index } from 'typeorm';
import { PoolCert } from './pool-cert.entity';
import { Account } from '../../account/entities/account.entity';

@Entity()
@Index(['cert', 'account'], { unique: true })
export class PoolOwner {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => PoolCert, (poolCert) => poolCert.owners, {
    onDelete: 'CASCADE',
    orphanedRowAction: 'delete',
  })
  cert!: PoolCert;

  @ManyToOne(() => Account, {
    onDelete: 'CASCADE',
    orphanedRowAction: 'delete',
  })
  account!: Account;
}
