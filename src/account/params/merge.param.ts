import { IsIn, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class MergeParam {
  @IsOptional()
  @IsString()
  @IsIn(['true', 'false'])
  @ApiPropertyOptional({
    title: 'Merge matching transactions',
    example: 'true',
  })
  merge?: 'true' | 'false';
}
