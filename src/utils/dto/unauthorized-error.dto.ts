import { ApiProperty } from '@nestjs/swagger';

export class UnauthorizedErrorDto {
  constructor(message: string) {
    if (message) {
      this.message = message;
    }
  }

  @ApiProperty({
    title: 'Http status code',
    default: 401,
  })
  statusCode = 401;

  @ApiProperty({
    title: 'Informational message',
    default: 'Unauthorized',
  })
  message = 'Unauthorized';
}
