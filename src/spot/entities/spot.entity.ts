import {
  Entity,
  Column,
  ManyToOne,
  PrimaryGeneratedColumn,
  Index,
} from 'typeorm';
import { Epoch } from '../../epoch/entities/epoch.entity';

@Entity()
export class Spot {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Epoch, { onDelete: 'CASCADE' })
  @Index({ unique: true })
  epoch!: Epoch;

  @Column({ type: 'float', comment: 'EUR Spot Price' })
  price!: number;
}
