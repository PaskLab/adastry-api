import { ListAbstract } from '../../../utils/dto/list.abstract';
import { ApiProperty } from '@nestjs/swagger';

export class UserMappingDto {
  constructor(props?: UserMappingDto) {
    if (props) {
      this.name = props.name;
      this.hexId = props.hexId;
      this.fingerprint = props.fingerprint;
      this.userKoinlyId = props.userKoinlyId;
      this.koinlyId = props.koinlyId;
      this.useGlobalKoinlyId = props.useGlobalKoinlyId;
    }
  }

  @ApiProperty({
    title: 'Asset name',
    example: 'SpaceBud314',
  })
  name!: string;

  @ApiProperty({
    title: 'Asset hexadecimal ID',
    example:
      'bb034f986a345377d4767a2dbbadaaa632bb76c741c8efc6479dbb9e5363683d65636b6c65',
  })
  hexId!: string;

  @ApiProperty({
    title: 'Asset fingerprint',
    example: 'asset1lzj3fgrv2cdy5euhnlljyq7y3tpjn62u3spftj',
  })
  fingerprint!: string;

  @ApiProperty({
    title: 'User defined Koinly Placeholder',
    example: 'NFT1',
  })
  userKoinlyId!: string;

  @ApiProperty({
    title: 'Koinly ID',
    example: 'ID:5212',
  })
  koinlyId!: string;

  @ApiProperty({
    title: 'Override with Adastry global mapping',
    example: false,
  })
  useGlobalKoinlyId!: boolean;
}

export class UserMappingListDto extends ListAbstract {
  constructor(props?: UserMappingListDto) {
    super();
    if (props) {
      this.count = props.count;
      this.data = props.data;
    }
  }

  @ApiProperty({
    type: [UserMappingDto],
  })
  data!: UserMappingDto[];
}
