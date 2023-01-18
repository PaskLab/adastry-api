import { ApiProperty } from '@nestjs/swagger';

export class AccountStateDto {
  constructor(props?: AccountStateDto) {
    if (props) {
      this.stakeAddress = props.stakeAddress;
      this.name = props.name;
      this.active = props.active;
      this.type = props.type;
      this.createdAt = props.createdAt;
      this.confirmedAt = props.confirmedAt;
    }
  }

  @ApiProperty({
    title: 'Account stake address',
    example: 'stake1ux9r7qjwtczc6g8qvfd2p4fntk30ffemghcwa8h7qm8vacsers3g8',
  })
  stakeAddress!: string;

  @ApiProperty({
    title: 'Account name',
    example: 'Alice primary account',
  })
  name!: string;

  @ApiProperty({
    title: 'Account subscription state',
    example: true,
  })
  active!: boolean;

  @ApiProperty({
    title: 'Subscription related invoice',
    example: 'p0ZoB1FwH6',
  })
  invoiceId!: string;

  @ApiProperty({
    title: 'Subscription type',
    example: 'member',
  })
  type!: 'account' | 'pool' | 'member' | 'none';

  @ApiProperty({
    title: 'Created at',
    example: '1641849529405',
  })
  createdAt!: string;

  @ApiProperty({
    title: 'Transaction confirmation time',
    example: '1641849529405',
  })
  confirmedAt!: string;
}
