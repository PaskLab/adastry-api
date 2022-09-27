export type AddressInfoType = {
  address: string;
  amount: {
    unit: string;
    quantity: string;
  }[];
  stakeAddress: string | null;
  type: string;
  script: boolean;
};
