import { ApiProperty } from '@nestjs/swagger';

export class ConflictErrorDto {
  constructor(message: string) {
    if (message) {
      this.message = message;
    }
  }

  @ApiProperty({
    title: 'Http status code',
    default: 409,
  })
  statusCode: number = 409;

  @ApiProperty({
    title: 'Informational message',
    default: 'Conflict',
  })
  message: string = 'Conflict';

  @ApiProperty({
    title: 'Error description',
    default: 'Conflict',
  })
  error: string = 'Conflict';
}
