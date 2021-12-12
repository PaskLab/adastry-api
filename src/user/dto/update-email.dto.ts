import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class UpdateEmailDto {
  @ApiProperty({
    title: 'User email',
    example: 'my-email@gmail.com',
  })
  @IsEmail()
  email = '';
}
