import { ApiProperty } from '@nestjs/swagger';

export class MonthlyRewardsDto {
  constructor(props: MonthlyRewardsDto) {
    if (props) {
      this.month = props.month;
      this.rewards = props.rewards;
    }
  }

  @ApiProperty({
    title: 'Year and Month',
    example: '2022-12',
  })
  month!: string;

  @ApiProperty({
    title: 'Monthly rewards',
    example: 3943010786,
  })
  rewards!: number;
}

export class MonthlyRewardsListDto {
  constructor(props: MonthlyRewardsListDto) {
    if (props) {
      this.from = props.from;
      this.data = props.data;
    }
  }

  @ApiProperty({
    title: 'From date',
    example: '2022-01-01T00:00:00.000Z',
  })
  from!: string;

  @ApiProperty({
    title: 'Monthly rewards',
    type: [MonthlyRewardsDto],
  })
  data!: MonthlyRewardsDto[];
}
