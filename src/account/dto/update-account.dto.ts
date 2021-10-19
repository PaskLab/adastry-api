export class UpdateAccountDto {
  stakeAddress = '';
  name = '';
  currency?: null = null;
  rewardsSum?: number;
  loyalty?: number;
  epoch?: number | null;
  pool?: string | null;
}
