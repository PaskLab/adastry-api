import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class OptionalSlugParam {
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  @ApiPropertyOptional({
    title: 'Slug',
    example: 'My-Slug',
  })
  slug?: string;
}
