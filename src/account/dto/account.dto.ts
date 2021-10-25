import { ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { EpochDto } from '../../epoch/dto/epoch.dto';
import { CurrencyDto } from '../../spot/dto/currency.dto';
import { PoolDto } from '../../pool/dto/pool.dto';

export class AccountDto {
  @ApiProperty({
    title: 'Cardano stake address',
    example: 'stake1ux9r7qjwtczc6g8qvfd2p4fetk30ffemghcwa8h7qm8vacsers3g8',
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
    type: EpochDto,
    nullable: true,
  })
  epoch!: EpochDto | null;

  @ApiProperty({
    type: PoolDto,
    nullable: true,
  })
  pool!: PoolDto | null;

  @ApiProperty({
    type: CurrencyDto,
    nullable: true,
  })
  currency!: CurrencyDto | null;
}
