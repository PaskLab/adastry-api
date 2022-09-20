import { ApiProperty } from '@nestjs/swagger';

export class UserAccountDto {
  constructor(props?: UserAccountDto) {
    if (props) {
      this.stakeAddress = props.stakeAddress;
      this.name = props.name;
      this.syncing = props.syncing;
      this.createdAt = props.createdAt;
      this.updatedAt = props.updatedAt;
    }
  }

  @ApiProperty({
    title: 'Account stake address',
    example: 'stake1ux9r7qjwtczc6g8qvfd2p4fntk30ffemghcwa8h7qm8vacsers3g8',
  })
  stakeAddress!: string;

  @ApiProperty({
    title: 'Account name',
    example: 'Alice primary account',
  })
  name!: string;

  @ApiProperty({
    title: 'Synchronization Status',
    example: true,
  })
  syncing!: boolean;

  @ApiProperty({
    title: 'Created at',
    example: '2021-11-13T01:50:15.000Z',
  })
  createdAt!: string;

  @ApiProperty({
    title: 'Last update',
    example: '2021-11-13T01:50:15.000Z',
  })
  updatedAt!: string;
}
