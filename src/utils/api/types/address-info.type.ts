export type AddressInfoType = {
  address: string;
  amount: {
    unit: string;
    quantity: number;
  }[];
  stakeAddress: string;
  type: string;
  script: boolean;
};
