import { ApiProperty } from '@nestjs/swagger';
import { PoolDto } from '../../pool/dto/pool.dto';
import { ListAbstract } from './list.abstract';

export class AccountHistoryDto {
  constructor(props?: AccountHistoryDto) {
    if (props) {
      this.account = props.account;
      this.epoch = props.epoch;
      this.activeStake = props.activeStake;
      this.balance = props.balance;
      this.rewards = props.rewards;
      this.revisedRewards = props.revisedRewards;
      this.opRewards = props.opRewards;
      this.withdrawable = props.withdrawable;
      this.withdrawn = props.withdrawn;
      this.pool = props.pool;
      this.owner = props.owner;
      this.stakeShare = props.stakeShare;
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
    title: 'Epoch account active stake',
    example: 370000000,
  })
  activeStake!: number;

  @ApiProperty({
    title: 'Account balance at epoch start',
    example: 370000000,
  })
  balance!: number;

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
    title: 'Epoch operator fees',
    example: '340000000',
  })
  opRewards!: number;

  @ApiProperty({
    title: 'Epoch withdrawable rewards',
    example: 15765432,
  })
  withdrawable!: number;

  @ApiProperty({
    title: 'Epoch withdrawn rewards',
    example: 15765432,
  })
  withdrawn!: number;

  @ApiProperty({
    type: PoolDto,
    nullable: true,
  })
  pool!: PoolDto | null;

  @ApiProperty({
    title: 'Is pool owner for the current epoch',
    example: false,
  })
  owner!: boolean;

  @ApiProperty({
    title: 'Pool owner stake share',
    example: 0.75,
  })
  stakeShare!: number;
}

export class AccountHistoryListDto extends ListAbstract {
  constructor(props?: AccountHistoryListDto) {
    super();
    if (props) {
      this.count = props.count;
      this.data = props.data;
    }
  }

  @ApiProperty({
    type: [AccountHistoryDto],
    nullable: true,
  })
  data!: AccountHistoryDto[];
}
