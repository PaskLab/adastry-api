export type RateHistoryType = {
  code: string;
  page?: number | undefined;
  limit?: number | undefined;
  from?: number | undefined;
  order?: 'ASC' | 'DESC' | undefined;
};
