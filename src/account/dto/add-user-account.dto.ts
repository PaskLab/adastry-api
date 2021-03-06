import { IsNotEmpty, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddUserAccountDto {
  @IsNotEmpty()
  @Matches('^stake1[a-z0-9]{53}|addr1[a-z0-9]{98}$', '', {
    message: 'address must be a valid mainnet payment or stake address',
  })
  @ApiProperty({
    title: 'Account stake or payment address',
    pattern: '^stake[a-z0-9]{54}|addr[a-z0-9]{99}$',
    example: 'stake1ux9r... | addr1ux9r...',
  })
  address!: string;

  @IsNotEmpty()
  @ApiProperty({
    title: 'Account name',
    example: 'Alice primary account',
  })
  name!: string;
}
