export type TransactionOutputsType = {
  hash: string;
  inputs: {
    address: string;
    amount: BlockfrostAmount[];
    txHash: string;
    outputIndex: number;
    dataHash: string;
    collateral: boolean;
  }[];
  outputs: {
    address: string;
    amount: BlockfrostAmount[];
    txHash: string;
    outputIndex: number;
  }[];
};

export type BlockfrostAmount = {
  unit: string;
  quantity: string;
};
