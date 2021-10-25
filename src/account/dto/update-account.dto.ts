import { IsAlpha, IsNotEmpty, Length, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateAccountDto {
  @IsNotEmpty()
  @ApiPropertyOptional({
    title: 'Account name',
    example: 'Alice primary account',
  })
  name?: string;

  @IsAlpha()
  @Length(3, 3)
  @ApiPropertyOptional({
    title: 'Preferred conversion currency',
    maximum: 3,
    minimum: 3,
    example: 'EUR',
    default: 'USD',
  })
  currency?: string;
}
