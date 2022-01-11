export type CsvFieldsType = {
  date: string;
  sentAmount: number | string;
  sentCurrency: string;
  receivedAmount: number | string;
  receivedCurrency: string;
  feeAmount: number | string;
  feeCurrency: string;
  netWorthAmount: number | string;
  netWorthCurrency: string;
  label: string;
  description: string;
  txHash: string;
  accountBalance: number | string;
  realRewards: number | string;
  revisedRewards: number | string;
  opRewards: number | string;
  stakeShare: number | string;
  withdrawable: number | string;
  withdrawn: number | string;
};
