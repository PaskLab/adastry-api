export type LastPoolUpdateType = {
  txHash: string;
  certIndex: number;
  action: 'registered' | 'deregistred';
};
