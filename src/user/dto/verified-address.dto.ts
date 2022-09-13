import { ApiProperty } from '@nestjs/swagger';

export class VerifiedAddressDto {
  constructor(props?: VerifiedAddressDto) {
    if (props) {
      this.stakeAddress = props.stakeAddress;
      this.name = props.name;
      this.createdAt = props.createdAt;
    }
  }

  @ApiProperty({
    title: 'Account name',
    example: 'Alice primary account',
  })
  name!: string;

  @ApiProperty({
    title: 'Account stake address',
    example: 'stake1ux9r7qjwtczc6g8qvfd2p4fntk30ffemghcwa8h7qm8vacsers3g8',
  })
  stakeAddress!: string;

  @ApiProperty({
    title: 'Created at',
    example: '2021-11-13T01:50:15.000Z',
  })
  createdAt!: string;
}
