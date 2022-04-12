import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QuarterParam {
  @IsOptional()
  @Min(1)
  @Max(4)
  @IsInt()
  @ApiPropertyOptional({
    title: 'Quarter',
    minimum: 1,
    maximum: 4,
    example: 1,
  })
  quarter?: number;
}
