import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class HistoryQuery {
  @ApiPropertyOptional({
    description: 'Page number (Min: 1)',
    default: 1,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({
    description: 'Number of result (Min: 1, Max: 100, Default: 100)',
    default: 100,
    minimum: 1,
    maximum: 100,
  })
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({
    description: 'From Epoch (Min: 208, Default: 208(ASC), LastEpoch(DESC))',
    minimum: 208,
  })
  @IsInt()
  @Min(208)
  @IsOptional()
  from?: number;

  @ApiPropertyOptional({
    description: 'Result order (ASC or DESC, Default: DESC)',
    default: 'DESC',
    type: 'string',
    enum: ['ASC', 'DESC'],
  })
  @IsString()
  @IsIn(['ASC', 'DESC'])
  @IsOptional()
  order?: 'ASC' | 'DESC';
}
