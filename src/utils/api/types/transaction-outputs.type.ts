export type TransactionOutputsType = {
  hash: string;
  inputs: {
    address: string;
    amount: AssetAmount[];
    txHash: string;
    outputIndex: number;
    dataHash: string | null;
    collateral: boolean;
  }[];
  outputs: {
    address: string;
    amount: AssetAmount[];
    outputIndex: number;
  }[];
};

export type AssetAmount = {
  unit: string;
  quantity: string;
};
