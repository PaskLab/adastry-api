export type PoolUpdateType = {
  txHash: string;
  active: boolean;
  epoch: number;
  margin: number | null;
  fixed: number | null;
  rewardAccount: string | null;
  owners: string[] | null;
};
