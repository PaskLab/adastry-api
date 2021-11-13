export type ConfigType = {
  api: { pageLimit: number };
  provider: SyncConfigProviderType;
  currencies: SyncConfigCurrenciesType;
};

export type SyncConfigProviderType = {
  [key: string]: {
    url: string;
    limit?: number;
    rate?: number;
  };
};

export type SyncConfigPoolsType = {
  name: string;
  id: string;
}[];

export type SyncConfigCurrenciesType = {
  code: string;
  name: string;
}[];
