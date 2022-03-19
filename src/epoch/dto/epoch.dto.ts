import { ApiProperty } from '@nestjs/swagger';
import { ListAbstract } from '../../utils/dto/list.abstract';

export class EpochDto {
  constructor(props?: EpochDto) {
    if (props) {
      this.epoch = props.epoch;
      this.startTime = props.startTime;
      this.endTime = props.endTime;
    }
  }

  @ApiProperty({
    title: 'Cardano Epoch number',
    example: 208,
  })
  epoch!: number;

  @ApiProperty({
    title: 'Epoch start time',
    description: 'Unix time format',
    example: 1596923091,
  })
  startTime!: number;

  @ApiProperty({
    title: 'Epoch end time',
    description: 'Unix time format',
    example: 1597355091,
  })
  endTime!: number;
}

export class EpochListDto extends ListAbstract {
  constructor(props?: EpochListDto) {
    super();
    if (props) {
      this.count = props.count;
      this.data = props.data;
    }
  }

  @ApiProperty({
    type: [EpochDto],
  })
  data!: EpochDto[];
}
