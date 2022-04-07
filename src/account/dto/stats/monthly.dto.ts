import { ApiProperty } from '@nestjs/swagger';

export class MonthlyDto {
  constructor(props: MonthlyDto) {
    if (props) {
      this.month = props.month;
      this.value = props.value;
    }
  }

  @ApiProperty({
    title: 'Year and Month',
    example: '2022-12',
  })
  month!: string;

  @ApiProperty({
    title: 'Monthly value',
    example: 3943010786,
  })
  value!: number;
}

export class MonthlyListDto {
  constructor(props: MonthlyListDto) {
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
    title: 'Monthly values',
    type: [MonthlyDto],
  })
  data!: MonthlyDto[];
}
