import { ApiProperty } from '@nestjs/swagger';
import { PoolDto } from '../../pool/dto/pool.dto';

export class AccountDto {
  constructor(props?: AccountDto) {
    if (props) {
      this.stakeAddress = props.stakeAddress;
      this.name = props.name;
      this.rewardsSum = props.rewardsSum;
      this.loyalty = props.loyalty;
      this.epoch = props.epoch;
      this.pool = props.pool;
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
    title: 'Account all time received rewards',
    example: 401171403,
  })
  rewardsSum!: number;

  @ApiProperty({
    title: 'Number of consecutive loyal epoch to member pools',
    example: 10,
  })
  loyalty!: number;

  @ApiProperty({
    title: 'Last updated epoch',
    type: 'number',
    nullable: true,
  })
  epoch!: number | null;

  @ApiProperty({
    type: PoolDto,
    nullable: true,
  })
  pool!: PoolDto | null;
}
