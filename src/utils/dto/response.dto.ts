import { ApiProperty } from '@nestjs/swagger';

export class ResponseDto {
  constructor(message: string) {
    if (message) {
      this.message = message;
    }
  }

  @ApiProperty({
    title: 'Http status code',
    default: 200,
  })
  statusCode: number = 200;

  @ApiProperty({
    title: 'Informational message',
  })
  message: string = '';
}
