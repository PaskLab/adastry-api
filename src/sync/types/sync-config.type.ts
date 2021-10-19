export type SyncConfigType = {
  provider: SyncConfigProvider;
  pools: SyncConfigPools;
  accounts: SyncConfigAccounts;
};

export type SyncConfigProvider = {
  url: string;
  limit: number;
};

export type SyncConfigPools = {
  name: string;
  id: string;
}[];

export type SyncConfigAccounts = {
  name: string;
  stakeAddress: string;
  currency: string;
}[];
