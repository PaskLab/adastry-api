import { ApiProperty } from '@nestjs/swagger';

export class AccountHistoryDto {
  constructor(props?: AccountHistoryDto) {
    if (props) {
      this.account = props.account;
      this.epoch = props.epoch;
      this.rewards = props.rewards;
      this.revisedRewards = props.revisedRewards;
      this.activeStake = props.activeStake;
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
    title: 'Epoch received rewards',
    example: 15000000,
  })
  rewards!: number;

  @ApiProperty({
    title: 'Epoch pool owner revised rewards',
    example: 15000000,
  })
  revisedRewards!: number;

  @ApiProperty({
    title: 'Epoch account active stake',
    example: 370000000,
  })
  activeStake!: number;

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
