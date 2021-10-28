import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class EpochParam {
  @ApiProperty({
    description: 'Epoch (Min: 208)',
    minimum: 208,
  })
  @IsInt()
  @Min(208)
  epoch!: number;
}
