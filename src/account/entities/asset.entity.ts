import { Column, PrimaryGeneratedColumn, Index, Entity } from 'typeorm';

@Entity()
export class Asset {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  @Index({ unique: true })
  hexId!: string;

  @Column()
  policyId!: string;

  @Column()
  name!: string;

  @Column()
  fingerprint!: string;

  @Column()
  quantity!: string;

  @Column({ nullable: true })
  decimals!: number;

  @Column()
  mintTxHash!: string;

  @Column()
  onChainMetadata!: string;

  @Column()
  metadata!: string;

  @Column({ type: 'timestamp', nullable: true })
  metadataLastSync!: Date | null;
}
