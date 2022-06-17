import { ApiProperty } from '@nestjs/swagger';

export class PayloadDto {
  @ApiProperty({
    title: 'Custom message',
  })
  message!: string;

  @ApiProperty({
    title: 'Stake Address to verify',
  })
  stakeAddress!: string;

  @ApiProperty({
    title: 'Verification Token',
  })
  token!: string;
}
