import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class FromParam {
  @ApiPropertyOptional({
    description:
      'From Epoch (Min: 208, Default: ASC == 208, DESC == lastEpoch)',
    minimum: 208,
  })
  @IsInt()
  @Min(208)
  @IsOptional()
  from?: number;

  @ApiPropertyOptional({
    description: 'Result order (ASC or DESC, Default: DESC)',
    default: 'ASC',
    type: 'string',
    enum: ['ASC', 'DESC'],
  })
  @IsString()
  @IsIn(['ASC', 'DESC'])
  @IsOptional()
  order?: 'ASC' | 'DESC';
}
