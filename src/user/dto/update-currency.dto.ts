import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsAlpha, Matches } from 'class-validator';

export class UpdateCurrencyDto {
  @IsAlpha()
  @Matches('^[A-Z]{3}$')
  @ApiPropertyOptional({
    title: 'Preferred conversion currency',
    pattern: '^[A-Z]{3}$',
    example: 'EUR',
    default: 'USD',
  })
  code!: string;
}
