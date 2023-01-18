import { ApiProperty } from '@nestjs/swagger';

export class UserPoolDto {
  constructor(props?: UserPoolDto) {
    if (props) {
      this.poolId = props.poolId;
      this.name = props.name;
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
    title: 'Armada Alliance member',
    example: true,
  })
  isMember!: boolean;
}
