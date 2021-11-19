import { Request } from 'express';
import * as fs from 'fs';
import { Cron } from '@nestjs/schedule';
import { ensureProgram } from 'ts-loader/dist/utils';

export function generateUrl(request: Request, ...args: string[]) {
  return `${request.protocol}://${request.get('host')}/${args.join('/')}`;
}

/**
 * Return download URL of requested file
 *
 * @param {Request} req - ExpressJs Request object
 * @returns {object} - Download url to file symlink
 */
// const initDownload = (req) => {
//   let filePath = req.query.filePath;
//   let fileName = Date.now() + "_" + path.basename(filePath);
//   let url = generateUrl(req, PUBLIC_TMP, fileName);
//
//   createSymlink(filePath, fileName);
//
//   return url;
// };

/**
 * Return download URL of requested file
 */
// router.get("/getDownloadUrl", function (req, res, next) {
//   res.setHeader('content-type', 'text/plain');
//   res.send(initDownload(req));
// });

export function dateFromUnix(unixTimestamp): Date {
  return new Date(unixTimestamp * 1000);
}

export function dateToUnix(date: Date): number {
  return Math.floor(date.valueOf() / 1000);
}

export function createTimestamp(date): string {
  const zeroLead = (str) => ('0' + str).slice(-2);

  return `${date.getFullYear()}-${zeroLead(date.getMonth() + 1)}-${zeroLead(
    date.getDate(),
  )} ${zeroLead(date.getHours())}:${zeroLead(date.getMinutes())}:${zeroLead(
    date.getSeconds(),
  )}`;
}
