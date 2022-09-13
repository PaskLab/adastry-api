import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class UpdateVerifiedAddressDto {
  @ApiProperty({
    title: 'Account name',
    example: 'Alice primary account',
  })
  @IsString()
  name!: string;

  @ApiProperty({
    title: 'Account stake address',
    example: 'stake1ux9r7qjwtczc6g8qvfd2p4fntk30ffemghcwa8h7qm8vacsers3g8',
  })
  @Matches('^stake[a-z0-9]{54}$')
  stakeAddress!: string;
}
