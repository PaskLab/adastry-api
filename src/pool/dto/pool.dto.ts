import {
  Column,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { PoolUpdate } from '../entities/pool-update.entity';
import { Epoch } from '../../epoch/entities/epoch.entity';
import { Account } from '../../account/entities/account.entity';
import { PoolHistory } from '../entities/pool-history.entity';
import { ApiProperty } from '@nestjs/swagger';
import { EpochDto } from '../../epoch/dto/epoch.dto';

export class PoolDto {
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
    type: EpochDto,
    title: 'Last updated epoch',
    nullable: true,
  })
  epoch!: Epoch | null;
}
