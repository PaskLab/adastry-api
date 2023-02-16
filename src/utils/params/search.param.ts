import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class SearchParam {
  @ApiPropertyOptional({
    description: 'Text string to search',
  })
  @IsString()
  @IsOptional()
  search?: string;
}
