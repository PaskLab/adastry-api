import { ApiProperty } from '@nestjs/swagger';

export class SpotDto {
  constructor(props: SpotDto) {
    if (props) {
      this.epoch = props.epoch;
      this.price = props.price;
    }
  }

  @ApiProperty({
    title: 'History epoch',
    example: 208,
  })
  epoch!: number;

  @ApiProperty({
    title: 'Epoch price in EUR',
    example: 2.3930189961005923,
  })
  price!: number;
}
