import { ApiProperty } from '@nestjs/swagger';
import { Matches } from 'class-validator';

export class VerifyCodeParam {
  @ApiProperty({
    title: 'Verification code',
    example: '1636157422123ab25b936b5a338e99076f963015536af4b1e8405',
    pattern: '^[0-9]{13}[a-zA-Z0-9]*$',
  })
  @Matches(RegExp('^[0-9]{13}[a-zA-Z0-9]*$'), {
    message: 'Verification code invalid.',
  })
  code!: string;
}
