import { ApiProperty } from '@nestjs/swagger';

export class CurrencyDto {
  @ApiProperty({
    title: 'Currency Symbol',
    minLength: 3,
    maxLength: 3,
    example: 'USD',
  })
  code!: string;

  @ApiProperty({
    title: 'Currency full name',
    example: 'United States Dollar',
  })
  name!: string;
}
