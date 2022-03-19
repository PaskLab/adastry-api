import { ApiProperty } from '@nestjs/swagger';
import { ListAbstract } from '../../utils/dto/list.abstract';

export class PoolDto {
  constructor(props?: PoolDto) {
    if (props) {
      this.poolId = props.poolId;
      this.name = props.name;
      this.blocksMinted = props.blocksMinted;
      this.liveStake = props.liveStake;
      this.liveSaturation = props.liveSaturation;
      this.liveDelegators = props.liveDelegators;
      this.epoch = props.epoch;
      this.isMember = props.isMember;
    }
  }

  @ApiProperty({
    title: 'Stake Pool ID',
    example: 'pool19f6guwy97mmnxg9dz65rxyj8hq07qxud886hamyu4fgfz7dj9gl',
  })
  poolId!: string;

  @ApiProperty({
    title: 'Stake Pool Name & ticker',
    example: 'Berry[BERRY]',
  })
  name!: string;

  @ApiProperty({
    title: 'Pool all time minted blocks',
    example: 100,
  })
  blocksMinted!: number;

  @ApiProperty({
    title: 'Pool current stake',
    example: 15000000000000,
  })
  liveStake!: number;

  @ApiProperty({
    title: 'Pool saturation percentage',
    example: 0.23,
  })
  liveSaturation!: number;

  @ApiProperty({
    title: 'Pool current delegators number',
    example: 100,
  })
  liveDelegators!: number;

  @ApiProperty({
    title: 'Armada Alliance member',
    example: true,
  })
  isMember!: boolean;

  @ApiProperty({
    title: 'Last updated epoch',
    nullable: true,
  })
  epoch!: number | null;
}

export class PoolListDto extends ListAbstract {
  constructor(props?: PoolListDto) {
    super();
    if (props) {
      this.count = props.count;
      this.data = props.data;
    }
  }

  @ApiProperty({
    type: [PoolDto],
  })
  data!: PoolDto[];
}
