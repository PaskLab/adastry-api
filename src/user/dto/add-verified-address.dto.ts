import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AddVerifiedAddressDto {
  @ApiPropertyOptional({
    title: 'Account name',
    example: 'Alice primary account',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    title: 'COSESign1 Key',
  })
  key!: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    title: 'COSESign1 hex encoded object',
  })
  signature!: string;
}
