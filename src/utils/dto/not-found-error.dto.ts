import { ApiProperty } from '@nestjs/swagger';

export class NotFoundErrorDto {
  constructor(message: string) {
    if (message) {
      this.message = message;
    }
  }

  @ApiProperty({
    title: 'Http status code',
    default: 404,
  })
  statusCode: number = 404;

  @ApiProperty({
    title: 'Informational message',
    default: 'Not Found',
  })
  message: string = 'Not Found';

  @ApiProperty({
    title: 'Error description',
    default: 'Not Found',
  })
  error: string = 'Not Found';
}
