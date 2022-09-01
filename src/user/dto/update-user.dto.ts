import {
  IsAlpha,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional({
    title: 'Username',
    example: 'alice',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  username?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    title: 'Full name',
    example: 'Alice',
  })
  name?: string;

  @IsOptional()
  @IsAlpha()
  @Matches('^[A-Z]{3}$')
  @ApiPropertyOptional({
    title: 'Preferred conversion currency',
    pattern: '^[A-Z]{3}$',
    example: 'EUR',
  })
  currency?: string;
}
