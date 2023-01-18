import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, Length, Matches } from 'class-validator';

export class NewInvoiceDto {
  @IsString()
  @Length(10, 10)
  @ApiProperty({
    title: 'Invoice Id',
    minLength: 10,
    maxLength: 10,
    example: 'p0ZoB1FwH6',
  })
  invoiceId!: string;

  @IsString()
  @Length(64, 64)
  @ApiProperty({
    title: 'Transaction hash/id',
    example: '26524fb341571fba35c07ee2ba29e5589b2211cfa00d76f1f4918ddb048091f5',
  })
  txHash!: string;

  @IsArray()
  @Matches('^stake1[a-z0-9]{53}$', '', {
    each: true,
    message: 'string must be a valid mainnet bech32 stake address',
  })
  @ApiProperty({
    title: 'Accounts stake addresses',
    example: ['stake1ux9r7qjwtczc6g8qvfd2p4fntk30ffemghcwa8h7qm8vacsers3g8'],
  })
  accounts: string[] = [];

  @IsArray()
  @Matches('^pool1[a-z0-9]{51}$', '', {
    each: true,
    message: 'string must be a valid mainnet bech32 pool id',
  })
  @ApiProperty({
    title: 'Pool Ids',
    example: ['pool19f6guwy97mmnxg9dz65rxyj8hq07qxud886hamyu4fgfz7dj9gl'],
  })
  pools: string[] = [];
}
