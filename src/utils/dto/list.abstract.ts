import { ApiProperty } from '@nestjs/swagger';

export abstract class ListAbstract {
  @ApiProperty({
    title: 'Total count without limits',
    example: 250,
  })
  count!: number;
}
