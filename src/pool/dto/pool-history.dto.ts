import { ApiProperty } from '@nestjs/swagger';

export class PoolHistoryDto {
  constructor(props: PoolHistoryDto) {
    if (props) {
      this.epoch = props.epoch;
      this.rewards = props.rewards;
      this.fees = props.fees;
      this.blocks = props.blocks;
      this.activeStake = props.activeStake;
      this.owners = props.owners;
      this.rewardAccount = props.rewardAccount;
      this.margin = props.margin;
      this.fixed = props.fixed;
      this.active = props.active;
    }
  }

  @ApiProperty({
    title: 'History epoch',
    example: 208,
  })
  epoch!: number;

  @ApiProperty({
    title: 'Epoch pool rewards',
    example: 1500000000,
  })
  rewards!: number;

  @ApiProperty({
    title: 'Epoch pool fees',
    example: 800000000,
  })
  fees!: number;

  @ApiProperty({
    title: 'Epoch pool blocks',
    example: 10,
  })
  blocks!: number;

  @ApiProperty({
    title: 'Epoch pool active stake',
    example: 15000000000000,
  })
  activeStake!: number;

  @ApiProperty({
    title: 'Epoch pool owners',
    type: ['string'],
    example: ['stake1ux9r7qjwtczc6g8qvfd2p4fntk30ffemghcwa8h7qm8vacsers3g8'],
  })
  owners!: string[];

  @ApiProperty({
    title: 'Epoch pool reward account',
    example: 'stake1ux9r7qjwtczc6g8qvfd2p4fntk30ffemghcwa8h7qm8vacsers3g8',
  })
  rewardAccount!: string;

  @ApiProperty({
    title: 'Epoch pool margin',
    example: 0.015,
  })
  margin!: number | null;

  @ApiProperty({
    title: 'Epoch pool fixed fee',
    example: 340,
  })
  fixed!: number | null;

  @ApiProperty({
    title: 'Epoch pool registration state',
    example: true,
  })
  active!: boolean;
}
