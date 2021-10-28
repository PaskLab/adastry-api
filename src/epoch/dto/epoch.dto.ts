import { ApiProperty } from '@nestjs/swagger';

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
