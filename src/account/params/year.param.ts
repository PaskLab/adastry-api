import { IsInt, IsNotEmpty, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class YearParam {
  @IsNotEmpty()
  @Min(2020)
  @Max(2100)
  @IsInt()
  @ApiProperty({
    title: 'Year',
    minimum: 2020,
    example: '2020',
  })
  year!: number;
}
