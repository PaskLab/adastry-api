import {
  Entity,
  Column,
  Index,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Currency } from '../../spot/entities/currency.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  @Index({ unique: true })
  username!: string;

  @Column({ default: true })
  active!: boolean;

  @Column({ default: '' })
  email!: string;

  @Column({ default: '' })
  name!: string;

  @Column({ default: '' })
  password!: string;

  @Column({ default: 'Not verified' })
  expHash!: string;

  @ManyToOne(() => Currency)
  currency!: Currency;

  // Special columns
  @CreateDateColumn()
  createdAt!: string;

  @UpdateDateColumn()
  updatedAt!: string;
}
