export class UpdateAccountDto {
  stakeAddress: string = '';
  name: string = '';
  currency?: null = null;
  rewardsSum?: number;
  loyalty?: number;
  epoch?: number | null;
  pool?: string | null;
}
