import { Entity, Index, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { UserCategory } from '../../user/entities/user-category.entity';
import { UserAccount } from './user-account.entity';

@Entity()
@Index(['account', 'category'], { unique: true })
export class AccountCategory {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => UserAccount, { onDelete: 'CASCADE' })
  account!: UserAccount;

  @ManyToOne(() => UserCategory, { onDelete: 'CASCADE' })
  category!: UserCategory;
}
