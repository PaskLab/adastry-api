export type ConfigType = {
  api: { pageLimit: number };
  provider: SyncConfigProviderType;
  pools: SyncConfigPoolsType;
  accounts: SyncConfigAccountsType;
  currencies: SyncConfigCurrenciesType;
};

export type SyncConfigProviderType = {
  [key: string]: {
    url: string;
    limit?: number;
  };
};

export type SyncConfigPoolsType = {
  name: string;
  id: string;
}[];

export type SyncConfigAccountsType = {
  name: string;
  stakeAddress: string;
  currency: string;
}[];

export type SyncConfigCurrenciesType = {
  code: string;
  name: string;
}[];
