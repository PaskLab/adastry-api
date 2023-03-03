import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SlugParam {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    title: 'Slug',
    example: 'My-Slug',
  })
  slug!: string;
}
