import { ApiProperty } from '@nestjs/swagger';

export class CsvFileDto {
  constructor(props: CsvFileDto) {
    if (props) {
      this.filename = props.filename;
      this.fileExpireAt = props.fileExpireAt;
      this.url = props.url;
      this.format = props.format;
      this.stakeAddress = props.stakeAddress;
      this.year = props.year;
    }
  }

  @ApiProperty({
    title: 'Filename',
    example: '2021-stake3ux9r4qjwt.csv',
  })
  filename!: string;

  @ApiProperty({
    title: 'File expire time',
    example: 'Tue, 23 Nov 2021 19:46:41 GMT',
  })
  fileExpireAt!: string;

  @ApiProperty({
    title: 'Filename',
    example: 'https://example.com/public/tmp/2021-stake1ux9r7qjwt.csv',
  })
  url!: string;

  @ApiProperty({
    title: 'CSV target format',
    example: 'koinly',
  })
  format!: string;

  @ApiProperty({
    title: 'Account stake address',
    example: 'stake1ux9r7qjwtczc6g8qvfd2p4fntk30ffemghcwa8h7qm8vacsers3g8',
  })
  stakeAddress!: string;

  @ApiProperty({
    title: 'Exported year',
    example: '2021',
  })
  year!: string;
}
