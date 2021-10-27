import { ApiProperty } from '@nestjs/swagger';

export class BadRequestErrorDto {
  constructor(message: string) {
    if (message) {
      this.message = message;
    }
  }

  @ApiProperty({
    title: 'Http status code',
    default: 400,
  })
  statusCode: number = 400;

  @ApiProperty({
    title: 'Informational message',
    default: 'Bad Request',
  })
  message: string = 'Bad Request';

  @ApiProperty({
    title: 'Error description',
    default: 'Bad Request',
  })
  error: string = 'Bad Request';
}
