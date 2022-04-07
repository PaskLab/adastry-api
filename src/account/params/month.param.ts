import { IsInt, IsNotEmpty, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MonthParam {
  @IsNotEmpty()
  @Min(1)
  @Max(12)
  @IsInt()
  @ApiProperty({
    title: 'Month',
    minimum: 1,
    maximum: 12,
    example: 6,
  })
  month!: number;
}
