import { IsAlpha, IsOptional, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class PreferredCodeParam {
  @IsOptional()
  @IsAlpha()
  @Matches('^[A-Z]{3}$')
  @ApiPropertyOptional({
    title: 'Currency Code',
    pattern: '^[A-Z]{3}$',
    default: 'EUR',
    example: 'USD',
    description: 'Preferred base currency',
  })
  code?: string;
}
