import { IsEmail, IsNotEmpty, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({
    title: 'User email',
    example: 'my-email@gmail.com',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    title: 'Username',
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
}
