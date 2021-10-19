export type PoolInfoType = {
  poolId: string;
  hex: string;
  name: string;
  ticker: string;
  blocksMinted: number;
  liveStake: number;
  liveSaturation: number;
  liveDelegators: number;
  rewardAccount: string;
  owners: string[];
  margin: number;
  fixed: number;
};
