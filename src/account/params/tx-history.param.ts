import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class TxHistoryParam {
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
    description: 'Unix timestamp (Min: 1420070400)',
    minimum: 1420070400,
  })
  @IsInt()
  @Min(1420070400)
  @Max(4102444800)
  @IsOptional()
  from?: number;

  @ApiPropertyOptional({
    description: 'Unix timestamp (Min: 1420070400)',
    minimum: 1420070400,
  })
  @IsInt()
  @Min(1420070400)
  @Max(4102444800)
  @IsOptional()
  to?: number;

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
