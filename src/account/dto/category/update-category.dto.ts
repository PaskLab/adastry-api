import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

export class UpdateCategoryDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    title: 'Category slug',
    example: 'My-Category',
  })
  slug!: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @ApiPropertyOptional({
    title: 'Category name',
    example: 'My Category',
  })
  name?: string;

  @IsOptional()
  @IsArray()
  @Matches('^stake1[a-z0-9]{53}$', '', {
    each: true,
    message: 'item must be a valid mainnet bech32 stake address',
  })
  @ApiPropertyOptional({
    title: 'Accounts stake addresses',
    example: ['stake1ux9r7qjwtczc6g8qvfd2p4fntk30ffemghcwa8h7qm8vacsers3g8'],
  })
  accounts?: string[];
}
