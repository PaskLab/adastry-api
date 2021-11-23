import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import fs from 'fs';
import config from '../../config.json';
import path from 'path';
import { SyncService } from '../account/sync.service';

@Injectable()
export class CronService {
  private readonly TMP_PATH = config.app.tmpPath;
  private readonly logger = new Logger(SyncService.name);

  @Cron('*/2 * * * *', { name: 'Temporary folder cleanup' })
  async cleanTMPFiles(): Promise<void> {
    const tmpFileTTL = config.app.tmpFileTTL;
    const absolutePath = path.join(__dirname, '../../..', this.TMP_PATH);

    let files = fs.readdirSync(absolutePath);
    let result: string[] = [];

    files.forEach((fileName) => {
      if ('.gitignore' !== fileName) {
        let filePath = `${absolutePath}/${fileName}`;
        let fileStat = fs.lstatSync(filePath);
        let now = new Date(Date.now());
        let expireAt = new Date(
          new Date(fileStat.mtime).getTime() + tmpFileTTL * 1000,
        );

        if (expireAt < now) {
          fs.unlinkSync(filePath);
          result.push(fileName);
        }
      }
    });

    let count = result.length;

    if (count) {
      this.logger.log(`Deleted ${count} expired file(s) in /${this.TMP_PATH}`);
      this.logger.log(result);
    }
  }
}
