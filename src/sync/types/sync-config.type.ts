export type SyncConfigType = {
  provider: SyncConfigProvider;
  pools: SyncConfigPools;
  accounts: SyncConfigAccounts;
  currencies: SyncConfigCurrencies;
};

export type SyncConfigProvider = {
  [key: string]: {
    url: string;
    limit: number;
  };
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

export type SyncConfigCurrencies = {
  code: string;
  name: string;
}[];
