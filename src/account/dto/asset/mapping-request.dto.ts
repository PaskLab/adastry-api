import { IsNotEmpty, IsOptional, Matches, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MappingRequestDto {
  @IsNotEmpty()
  @Matches('^[a-f0-9]+$', '', {
    message: 'Must be a valid mainnet asset hex ID',
  })
  @ApiProperty({
    title: 'Asset Hex ID',
    pattern: '^[a-f0-9]+$',
    example: '0afbd68c440321ec8aa6b235591cb29ff...',
  })
  hexId!: string;

  @IsOptional()
  @Matches('^ID:\\d+$', '', {
    message: 'Must be a valid Koinly ID. (ie: ID:12345)',
  })
  @MaxLength(15)
  @ApiPropertyOptional({
    title: 'Use global Koinly ID',
    example: true,
  })
  koinlyId?: string;
}
