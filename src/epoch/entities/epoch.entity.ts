import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity()
export class Epoch {
  @PrimaryColumn()
  epoch!: number;

  @Column()
  startTime!: number;

  @Column()
  endTime!: number;
}
