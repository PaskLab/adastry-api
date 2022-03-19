import { ApiProperty } from '@nestjs/swagger';
import { ListAbstract } from '../../utils/dto/list.abstract';

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

export class RateListDto extends ListAbstract {
  constructor(props?: RateListDto) {
    super();
    if (props) {
      this.count = props.count;
      this.data = props.data;
    }
  }

  @ApiProperty({
    type: [RateDto],
  })
  data!: RateDto[];
}
