export type LastPoolCertType = {
  txHash: string;
  certIndex: number;
  action: 'registered' | 'deregistred';
};
