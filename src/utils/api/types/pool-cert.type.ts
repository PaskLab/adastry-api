export type PoolCertType = {
  txHash: string;
  block: number;
  active: boolean;
  epoch: number;
  margin: number | null;
  fixed: number | null;
  rewardAccount: string | null;
  owners: string[] | null;
};
