import { ApiProperty } from '@nestjs/swagger';

export abstract class ListAbstract {
  @ApiProperty({
    title: 'Total count',
    example: 250,
  })
  count!: number;
}
