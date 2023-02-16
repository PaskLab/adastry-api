import { ListAbstract } from '../../../utils/dto/list.abstract';
import { ApiProperty } from '@nestjs/swagger';

export class AssetMappingDto {
  constructor(props?: AssetMappingDto) {
    if (props) {
      this.name = props.name;
      this.hexId = props.hexId;
      this.fingerprint = props.fingerprint;
      this.koinlyId = props.koinlyId;
      this.activeKoinlyId = props.activeKoinlyId;
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
    title: 'Koinly ID',
    example: 'ID:5212',
  })
  koinlyId!: string;

  @ApiProperty({
    title: 'Koinly ID state',
    example: true,
  })
  activeKoinlyId!: boolean;
}

export class AssetMappingListDto extends ListAbstract {
  constructor(props?: AssetMappingListDto) {
    super();
    if (props) {
      this.count = props.count;
      this.data = props.data;
    }
  }

  @ApiProperty({
    type: [AssetMappingDto],
  })
  data!: AssetMappingDto[];
}
