import { IsAlpha, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CodeParam {
  @IsAlpha()
  @Matches('^[A-Z]{3}$')
  @ApiProperty({
    title: 'Preferred conversion currency',
    pattern: '^[A-Z]{3}$',
    example: 'EUR',
    default: 'USD',
  })
  code!: string;
}
