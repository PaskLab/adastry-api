import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    title: 'Username',
    example: 'alice',
  })
  @IsNotEmpty()
  username!: string;

  @ApiProperty({
    title: 'User password',
    example: 'mYuNsAfEpWd!',
  })
  @IsNotEmpty()
  password!: string;
}
