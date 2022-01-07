export type TransactionType = {
  txHash: string;
  blockHash: string;
  blockHeight: number;
  blockTime: number;
  slot: number;
  index: number;
  fees: number;
  deposit: number;
  withdrawalCount: number;
  mirCertCount: number;
  delegationCount: number;
  stakeCertCount: number;
  poolUpdateCount: number;
  poolRetireCount: number;
  assetMintCount: number;
  redeemerCount: number;
  validContract: boolean;
};
