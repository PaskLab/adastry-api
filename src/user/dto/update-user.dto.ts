import {
  IsAlpha,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
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

  @ApiPropertyOptional({
    title: 'User old password',
    example: 'mYuNsAfEpWd!',
  })
  @IsOptional()
  @IsString()
  oldPassword?: string;

  @ApiPropertyOptional({
    title: 'User new password',
    example: 'mYuNsAfEpWd!',
  })
  @IsOptional()
  @Length(8, 50)
  @Matches(
    new RegExp('((?=.*\\d)|(?=.*\\W+))(?![.\\n])(?=.*[A-Z])(?=.*[a-z]).*$'),
    {
      message:
        'Passwords must contain at least: 1 upper case letter, 1 lower case letter, 1 number or special character',
    },
  )
  newPassword?: string;
}
