export type AccountHistoryQueryType = {
  stakeAddress: string;
  page?: number | undefined;
  limit?: number | undefined;
  from?: number | undefined;
  order?: 'ASC' | 'DESC' | undefined;
};
