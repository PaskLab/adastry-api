import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional } from 'class-validator';

export class UpdateEmailDto {
  @ApiProperty({
    title: 'Username',
    example: 'alice',
  })
  @IsNotEmpty()
  username!: string;

  @ApiProperty({
    title: 'User email',
    example: 'my-email@gmail.com',
  })
  @IsEmail()
  email = '';
}
