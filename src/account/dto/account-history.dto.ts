import { ApiProperty } from '@nestjs/swagger';

export class AccountHistoryDto {
  constructor(props?: AccountHistoryDto) {
    if (props) {
      this.account = props.account;
      this.epoch = props.epoch;
      this.balance = props.balance;
      this.rewards = props.rewards;
      this.rewardsBalance = props.rewardsBalance;
      this.fullBalance = props.fullBalance;
      this.opRewards = props.opRewards;
      this.pool = props.pool;
      this.owner = props.owner;
    }
  }

  @ApiProperty({
    title: 'Account stake address',
    example: 'stake1ux9r7qjwtczc6g8qvfd2p4fntk30ffemghcwa8h7qm8vacsers3g8',
  })
  account!: string;

  @ApiProperty({
    title: 'History epoch',
    example: 208,
  })
  epoch!: number;

  @ApiProperty({
    title: 'Epoch account balance',
    example: 208,
  })
  balance!: number;

  @ApiProperty({
    title: 'Epoch received rewards',
    example: 15000000,
  })
  rewards!: number;

  @ApiProperty({
    title: 'Epoch reward balance',
    example: 355000000,
  })
  rewardsBalance!: number;

  @ApiProperty({
    title: 'Epoch account combined balance',
    example: 370000000,
  })
  fullBalance!: number;

  @ApiProperty({
    title: 'Epoch operator fees',
    example: '340000000',
  })
  opRewards!: number;

  @ApiProperty({
    oneOf: [{ type: 'string' }, { type: 'null' }],
    title: 'Epoch delegated to',
    example: 'pool19f6guwy97mmnxg9dz65rxyj8hq07qxud886hamyu4fgfz7dj9gl',
  })
  pool!: string | null;

  @ApiProperty({
    title: 'Is pool owner for the current epoch',
    example: false,
  })
  owner!: boolean;
}
