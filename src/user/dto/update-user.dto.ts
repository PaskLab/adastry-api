import { IsAlpha, IsNotEmpty, IsOptional, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @IsNotEmpty()
  @IsOptional()
  @ApiPropertyOptional({
    title: 'Full name',
    example: 'Alice',
  })
  name!: string;

  @IsOptional()
  @IsAlpha()
  @Matches('^[A-Z]{3}$')
  @ApiPropertyOptional({
    title: 'Preferred conversion currency',
    pattern: '^[A-Z]{3}$',
    example: 'EUR',
    default: 'USD',
  })
  currency?: string = 'USD';
}
