import {
  PrimaryGeneratedColumn,
  Entity,
  Column,
  Index,
  ManyToOne,
} from 'typeorm';
import { Asset } from './asset.entity';

@Entity()
@Index(['asset', 'koinlyId'])
export class AssetMapping {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index({ unique: true })
  @ManyToOne(() => Asset, { onDelete: 'CASCADE' })
  asset!: Asset;

  @Index()
  @Column({ default: '' })
  koinlyId!: string;

  @Column({ default: false })
  activeKoinlyId!: boolean;
}
