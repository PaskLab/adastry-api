import { IsAlpha, IsNotEmpty, Length, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAccountDto {
  @IsNotEmpty()
  @Matches('^stake[a-z0-9]{54}$')
  @ApiProperty({
    title: 'Account stake address',
    pattern: '^stake[a-z0-9]{54}$',
    example: 'stake1ux9r7qjwtczc6g8qvfd2p4fntk30ffemghcwa8h7qm8vacsers3g8',
  })
  stakeAddress!: string;

  @IsNotEmpty()
  @ApiProperty({
    title: 'Account name',
    example: 'Alice primary account',
  })
  name!: string;

  @IsAlpha()
  @Length(3, 3)
  @ApiPropertyOptional({
    title: 'Preferred conversion currency',
    maximum: 3,
    minimum: 3,
    example: 'EUR',
    default: 'USD',
  })
  currency?: string = 'USD';
}
