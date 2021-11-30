import { IsIn, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CsvFormatParam {
  @ApiPropertyOptional({
    title: 'CSV format',
    default: 'full',
    type: 'string',
    enum: ['full', 'koinly'],
  })
  @IsOptional()
  @IsIn(['full', 'koinly'])
  format?: string;
}
