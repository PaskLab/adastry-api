import { ApiProperty } from '@nestjs/swagger';

export class PoolROSDto {
  constructor(props: PoolROSDto) {
    if (props) {
      this.poolName = props.poolName;
      this.poolId = props.poolId;
      this.ros = props.ros;
      this.roo = props.roo;
    }
  }

  @ApiProperty({
    title: 'Pool Name',
    example: 'Berry Pool',
  })
  poolName!: string;

  @ApiProperty({
    title: 'Pool Id',
    example: 'pool19f6guwy97mmnxg9dz65rxyj8hq07qxud886hamyu4fgfz7dj9gl',
  })
  poolId!: string;

  @ApiProperty({
    title: 'Return on stake',
    example: 0.04,
  })
  ros!: number;

  @ApiProperty({
    title: 'Return on pool operation',
    example: 0.04,
  })
  roo!: number;
}
