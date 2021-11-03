import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    title: 'User email',
    example: 'my-email@gmail.com',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    title: 'User password',
    example: 'mYuNsAfEpWd!',
  })
  @IsNotEmpty()
  password!: string;
}
