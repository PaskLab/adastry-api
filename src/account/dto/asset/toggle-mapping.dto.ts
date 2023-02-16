import { IsBoolean, IsNotEmpty, IsOptional, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ToggleMappingDto {
  @IsNotEmpty()
  @Matches('^asset1[a-z0-9]{38}$', '', {
    message: 'Must be a valid mainnet asset fingerprint',
  })
  @ApiProperty({
    title: 'Asset fingerprint',
    pattern: '^asset1[a-z0-9]{38}$',
    example: 'asset1g2qn2tx76nwnq5tv237ygwzz5dgxeppjt9myqc',
  })
  fingerprint!: string;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({
    title: 'Use global Koinly ID',
    example: true,
  })
  useGlobalKoinlyId?: boolean;
}
