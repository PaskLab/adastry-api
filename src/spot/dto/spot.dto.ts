import { ApiProperty } from '@nestjs/swagger';
import { ListAbstract } from '../../utils/dto/list.abstract';

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

export class SpotListDto extends ListAbstract {
  constructor(props?: SpotListDto) {
    super();
    if (props) {
      this.count = props.count;
      this.data = props.data;
    }
  }

  @ApiProperty({
    type: [SpotDto],
  })
  data!: SpotDto[];
}
