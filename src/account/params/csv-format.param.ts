import { IsIn, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CsvFormatParam {
  @ApiPropertyOptional({
    title: 'CSV format',
    default: 'koinly',
    type: 'string',
    enum: ['koinly'],
  })
  @IsOptional()
  @IsIn(['koinly'])
  format?: string;
}
