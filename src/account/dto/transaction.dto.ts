import { BlockfrostAmount } from '../../utils/api/types/transaction-outputs.type';
import { ApiProperty } from '@nestjs/swagger';

export class TransactionDto {
  constructor(props?: TransactionDto) {
    if (props) {
      this.address = props.address;
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
    }
  }

  @ApiProperty({
    title: 'Cardano address',
    example:
      'addr2q3apu4wdtw75k3g5j6lecj7sufyml0ysw8j3tst93yls9c7jd0cjf3azel78n1yw26us03q5u5y8endc22g3j23ut9ws4rpu56',
  })
  address!: string;

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
  })
  received!: BlockfrostAmount[];

  @ApiProperty({
    title: 'Assets amount sent',
  })
  sent!: BlockfrostAmount[];

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
}
