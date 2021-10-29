import { ApiProperty } from '@nestjs/swagger';

export class RateDto {
  constructor(props: RateDto) {
    if (props) {
      this.epoch = props.epoch;
      this.rate = props.rate;
    }
  }

  @ApiProperty({
    title: 'History epoch',
    example: 208,
  })
  epoch!: number;

  @ApiProperty({
    title: 'Epoch rate',
    example: 1.159676,
  })
  rate!: number;
}
