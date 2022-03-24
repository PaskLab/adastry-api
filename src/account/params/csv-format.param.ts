import { IsIn, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

const REWARD_FORMATS = [
  'default',
  'transaction',
  'koinly',
  'spo',
  'multiowner',
];
const TRANSACTION_FORMATS = ['default', 'koinly'];

export class RewardsCsvFormatParam {
  @ApiPropertyOptional({
    title: 'CSV format',
    default: 'full',
    type: 'string',
    enum: REWARD_FORMATS,
  })
  @IsOptional()
  @IsIn(REWARD_FORMATS)
  format?: string;
}

export class TxCsvFormatParam {
  @ApiPropertyOptional({
    title: 'CSV format',
    default: 'full',
    type: 'string',
    enum: TRANSACTION_FORMATS,
  })
  @IsOptional()
  @IsIn(TRANSACTION_FORMATS)
  format?: string;
}
