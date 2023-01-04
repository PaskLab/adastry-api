export type AccountInfoType = {
  active: boolean;
  stakeAddress: string;
  controlledAmount: number;
  withdrawalsSum: number;
  rewardsSum: number;
  withdrawableAmount: number;
  poolId: string | null;
};
