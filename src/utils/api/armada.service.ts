import { Injectable } from '@nestjs/common';
import config from '../../../config.json';
import { silentFailRequest as apiRequest } from './api.helper';
import { SyncConfigPoolsType } from '../types/config.type';

@Injectable()
export class ArmadaService {
  private readonly PROVIDER_URL: string = config.provider.armada.url;

  async getPools(): Promise<SyncConfigPoolsType | null> {
    const result = await this.request(`/pools.json`);

    return result
      ? result.map((p) => ({
          id: p.addr,
          name: p.name,
        }))
      : null;
  }
  private async request(endpoint: string, headers?: any): Promise<any | null> {
    return await apiRequest(this.PROVIDER_URL, endpoint, headers);
  }
}
