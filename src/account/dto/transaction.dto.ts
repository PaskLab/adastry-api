import { ApiProperty } from '@nestjs/swagger';
import { ListAbstract } from './list.abstract';

export class BlockfrostAmountDto {
  constructor(props?: BlockfrostAmountDto) {
    if (props) {
      this.unit = props.unit;
      this.quantity = props.quantity;
    }
  }

  @ApiProperty({
    title: 'Asset name',
    example:
      'bb024f986a145377d4767a2dbbadaaa630bb76c741c8efc6479dbb9e5363686d65636b6c63',
  })
  unit!: string;

  @ApiProperty({
    title: 'Asset Quantity',
    example: '1',
  })
  quantity!: string;
}

export class TransactionDto {
  constructor(props?: TransactionDto) {
    if (props) {
      this.addresses = props.addresses;
      this.txHash = props.txHash;
      this.txIndex = props.txIndex;
      this.blockHeight = props.blockHeight;
      this.blockTime = props.blockTime;
      this.received = props.received;
      this.sent = props.sent;
      this.fees = props.fees;
      this.deposit = props.deposit;
      this.withdrawalCount = props.withdrawalCount;
      this.mirCertCount = props.mirCertCount;
      this.delegationCount = props.delegationCount;
      this.stakeCertCount = props.stakeCertCount;
      this.poolUpdateCount = props.poolUpdateCount;
      this.poolRetireCount = props.poolRetireCount;
      this.assetMintCount = props.assetMintCount;
      this.redeemerCount = props.redeemerCount;
      this.validContract = props.validContract;
      this.tags = props.tags;
      this.needReview = props.needReview;
    }
  }

  @ApiProperty({
    title: 'Account implicated addresses',
    example: [
      'addr1fxh87fkuvcd0s4aejrnf44640fuf6un2u3ysfwqg0rrmt6xjdfcjf3azel78n8yyc6us0lq5u5y8endcl2g3j2kut9wscxnetq',
    ],
  })
  addresses!: string[];

  @ApiProperty({
    title: 'Cardano Tx Hash',
    example: 'ce0384ddc32304c15bcab483323c95bac28b2154289ac769a12b4418c8b012c3',
  })
  txHash!: string;

  @ApiProperty({
    title: 'Cardano Tx Index',
    example: 1,
  })
  txIndex!: number;

  @ApiProperty({
    title: 'Block height',
    example: 387765,
  })
  blockHeight!: number;

  @ApiProperty({
    title: 'Block added time (Unix timestamp)',
    example: 1616889945,
  })
  blockTime!: number;

  @ApiProperty({
    title: 'Assets amount received',
    type: [BlockfrostAmountDto],
  })
  received!: BlockfrostAmountDto[];

  @ApiProperty({
    title: 'Assets amount sent',
    type: [BlockfrostAmountDto],
  })
  sent!: BlockfrostAmountDto[];

  @ApiProperty({
    title: 'Transaction fees',
    example: 178000,
  })
  fees!: number;

  @ApiProperty({
    title: 'Certificate Registration deposit',
    example: 2000000,
  })
  deposit!: number;

  @ApiProperty({
    title: 'Number of withdraw',
    example: 0,
  })
  withdrawalCount!: number;

  @ApiProperty({
    title: 'Number of MIR certs',
    example: 0,
  })
  mirCertCount!: number;

  @ApiProperty({
    title: 'Number of delegation cert',
    example: 0,
  })
  delegationCount!: number;

  @ApiProperty({
    title: 'Number of stake registration certs',
    example: 0,
  })
  stakeCertCount!: number;

  @ApiProperty({
    title: 'Number of pool update certs',
    example: 0,
  })
  poolUpdateCount!: number;

  @ApiProperty({
    title: 'Number of pool retirement certs',
    example: 0,
  })
  poolRetireCount!: number;

  @ApiProperty({
    title: 'Number of assets minted/burnt',
    example: 1,
  })
  assetMintCount!: number;

  @ApiProperty({
    title: 'Number of contract redeemer',
    example: 0,
  })
  redeemerCount!: number;

  @ApiProperty({
    title: 'Contract Validity',
    example: true,
  })
  validContract!: boolean;

  @ApiProperty({
    title: 'Informative tags',
    example: 1,
  })
  tags!: string[];

  @ApiProperty({
    title: 'Transaction need verification',
    example: true,
  })
  needReview!: boolean;
}

export class TransactionListDto extends ListAbstract {
  constructor(props?: TransactionListDto) {
    super();
    if (props) {
      this.count = props.count;
      this.data = props.data;
    }
  }

  @ApiProperty({
    type: [TransactionDto],
    nullable: true,
  })
  data!: TransactionDto[];
}
