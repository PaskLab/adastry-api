import { IsAlpha, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CodeParam {
  @IsAlpha()
  @Matches('^[A-Z]{3}$')
  @ApiProperty({
    title: 'Currency Code',
    pattern: '^[A-Z]{3}$',
    example: 'USD',
    description: 'Base currency: EUR',
  })
  code!: string;
}
