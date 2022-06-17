import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SignatureDto {
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
