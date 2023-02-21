import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class StartMonthParam {
  @IsOptional()
  @Min(1)
  @Max(12)
  @IsInt()
  @ApiPropertyOptional({
    title: 'Fiscal Year start month',
    minimum: 1,
    maximum: 12,
    example: 6,
  })
  startMonth!: number;
}
