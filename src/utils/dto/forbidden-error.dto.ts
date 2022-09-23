import { ApiProperty } from '@nestjs/swagger';

export class ForbiddenErrorDto {
  constructor(message: string) {
    if (message) {
      this.message = message;
    }
  }

  @ApiProperty({
    title: 'Http status code',
    default: 403,
  })
  statusCode = 403;

  @ApiProperty({
    title: 'Informational message',
    default: 'Forbidden',
  })
  message = 'Forbidden';
}
