import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import fs from 'fs';

@Injectable()
export class CronService {
  // @Cron('*/2 * * * *', { name: 'Temporary folder cleanup' })
  // async cleanTMPFiles(): Promise<void> {
  //   const cron = require('node-cron');
  //   const tmpFileTTL = config.helper.tmpFileTTL;
  //
  //   cron.schedule('*/2 * * * *', () => {
  //     let files = fs.readdirSync(ABSOLUTE_TMP);
  //     let result = [];
  //
  //     files.forEach((fileName) => {
  //       if ('.gitkeep' !== fileName) {
  //         let filePath = `${ABSOLUTE_TMP}/${fileName}`;
  //         let fileStat = fs.lstatSync(filePath);
  //         let now = new Date(Date.now());
  //         let expireAt = new Date(
  //           new Date(fileStat.mtime).getTime() + tmpFileTTL * 1000,
  //         );
  //
  //         if (expireAt < now) {
  //           fs.unlinkSync(filePath);
  //           result.push(fileName);
  //         }
  //       }
  //     });
  //
  //     let count = result.length;
  //
  //     if (count) {
  //       let timestamp = new Date(Date.now());
  //       console.log(
  //         `[${timestamp.toISOString()}] Deleted ${count} expired file(s) in /public${PUBLIC_TMP} :`,
  //       );
  //       console.log(result);
  //     }
  //   });
  // }
}
