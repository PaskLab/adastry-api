import { ApiProperty } from '@nestjs/swagger';

export class CurrencyDto {
  constructor(props: CurrencyDto) {
    if (props) {
      this.code = props.code;
      this.name = props.name;
    }
  }

  @ApiProperty({
    title: 'Currency code',
    example: 'USD',
  })
  code!: string;

  @ApiProperty({
    title: 'Currency fullname',
    example: 'United States Dollar',
  })
  name!: string;
}
