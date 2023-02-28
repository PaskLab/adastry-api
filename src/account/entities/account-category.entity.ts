import { Entity, Index, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Account } from './account.entity';
import { UserCategory } from '../../user/entities/user-category.entity';

@Entity()
@Index(['account', 'category'], { unique: true })
export class AccountCategory {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Account, { onDelete: 'CASCADE' })
  account!: Account;

  @ManyToOne(() => UserCategory, { onDelete: 'CASCADE' })
  category!: UserCategory;
}
