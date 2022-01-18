import {
  Entity,
  Column,
  ManyToOne,
  PrimaryGeneratedColumn,
  Index,
} from 'typeorm';
import { Account } from './account.entity';
import { Epoch } from '../../epoch/entities/epoch.entity';
import { StrToBigInt } from '../../utils/utils';

@Entity()
@Index(['account', 'txHash'], { unique: true })
export class AccountWithdraw {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Account, (account) => account.withdraw, {
    onDelete: 'CASCADE',
  })
  account!: Account;

  @Column({ type: 'bigint', default: 0, transformer: [StrToBigInt] })
  amount!: number;

  @ManyToOne(() => Epoch, { onDelete: 'CASCADE' })
  @Index()
  epoch!: Epoch;

  @Column({ type: 'bigint', transformer: [StrToBigInt] })
  block!: number;

  /*
    The purpose for recording the transaction hash is to be able to filter
    through account withdraw event. This is required to work along with the data structure provided by Blockfrost
    as query against account withdraw do not return any epoch nor dates. To prevent doing multiples request to lookup
    each update, txHash is stored and must be unique.
  */
  @Column()
  txHash!: string;
}
