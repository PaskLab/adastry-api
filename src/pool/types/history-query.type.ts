export type HistoryQueryType = {
  poolId: string;
  page?: number | undefined;
  limit?: number | undefined;
  from?: number | undefined;
  order?: 'ASC' | 'DESC' | undefined;
};
