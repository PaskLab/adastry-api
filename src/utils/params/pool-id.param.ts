import { IsNotEmpty, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PoolIdParam {
  @IsNotEmpty()
  @Matches('^pool[a-z0-9]{52}$')
  @ApiProperty({
    title: 'Pool Id',
    pattern: '^pool[a-z0-9]{52}$',
    example: 'pool19f6guwy97mmnxg9dz65rxyj8hq07qxud886hamyu4fgfz7dj9gl',
  })
  poolId!: string;
}
