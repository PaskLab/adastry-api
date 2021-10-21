import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

@Entity()
export class Epoch {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  @Index({ unique: true })
  epoch!: number;

  @Column()
  startTime!: number;

  @Column()
  endTime!: number;
}
