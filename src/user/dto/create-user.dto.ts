import {
  IsAlpha,
  IsNotEmpty,
  IsOptional,
  Length,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({
    title: 'Username',
    example: 'alice',
  })
  @IsNotEmpty()
  username!: string;

  @ApiProperty({
    title: 'Full name',
    example: 'Alice',
  })
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    title: 'User password',
    example: 'mYuNsAfEpWd!',
  })
  @Length(8, 50)
  @Matches(
    new RegExp('((?=.*\\d)|(?=.*\\W+))(?![.\\n])(?=.*[A-Z])(?=.*[a-z]).*$'),
    {
      message:
        'Passwords must contain at least: 1 upper case letter, 1 lower case letter, 1 number or special character',
    },
  )
  password!: string;

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
