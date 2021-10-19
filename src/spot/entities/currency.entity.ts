import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity()
export class Currency {
  @PrimaryColumn()
  code!: string;

  @Column()
  name!: string;
}
