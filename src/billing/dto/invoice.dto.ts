import { ListAbstract } from '../../utils/dto/list.abstract';
import { ApiProperty } from '@nestjs/swagger';

export class InvoiceDto {
  constructor(props?: InvoiceDto) {
    if (props) {
      this.invoiceId = props.invoiceId;
      this.txHash = props.txHash;
      this.confirmed = props.confirmed;
      this.canceled = props.canceled;
      this.totalAmount = props.totalAmount;
      this.accounts = props.accounts;
      this.pools = props.pools;
      this.createdAt = props.createdAt;
      this.confirmedAt = props.confirmedAt;
    }
  }

  @ApiProperty({
    title: 'Subscription related invoice',
    example: 'p0ZoB1FwH6',
  })
  invoiceId!: string;

  @ApiProperty({
    title: 'Transaction hash/id',
    example: '26524fb341571fba35c07ee2ba29e5589b2211cfa00d76f1f4918ddb048091f5',
  })
  txHash!: string;

  @ApiProperty({
    title: 'Invoice total amount in lovelace',
    example: 50000000,
  })
  totalAmount!: number;

  @ApiProperty({
    title: 'Accounts stake addresses',
    example: ['stake1ux9r7qjwtczc6g8qvfd2p4fntk30ffemghcwa8h7qm8vacsers3g8'],
  })
  accounts: string[] = [];

  @ApiProperty({
    title: 'Pool Ids',
    example: ['pool19f6guwy97mmnxg9dz65rxyj8hq07qxud886hamyu4fgfz7dj9gl'],
  })
  pools: string[] = [];

  @ApiProperty({
    title: 'Transaction confirmation status',
    example: true,
  })
  confirmed!: boolean;

  @ApiProperty({
    title: 'Invoice status',
    example: false,
  })
  canceled!: boolean;

  @ApiProperty({
    title: 'Transaction confirmation time',
    example: '1641849529405',
  })
  confirmedAt!: string;

  @ApiProperty({
    title: 'Created at',
    example: '1641849529405',
  })
  createdAt!: string;
}

export class InvoiceListDto extends ListAbstract {
  constructor(props?: InvoiceListDto) {
    super();
    if (props) {
      this.count = props.count;
      this.data = props.data;
    }
  }

  @ApiProperty({
    type: [InvoiceDto],
  })
  data!: InvoiceDto[];
}
