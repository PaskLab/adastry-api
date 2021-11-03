import { ApiProperty } from '@nestjs/swagger';

export class JwtDto {
  constructor(token: string) {
    if (token) {
      this.token = token;
    }
  }

  @ApiProperty({
    title: 'Http status code',
    default: 201,
  })
  statusCode = 201;

  @ApiProperty({
    title: 'Bearer JWT token',
  })
  token = '';
}
