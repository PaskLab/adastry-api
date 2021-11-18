import path, { resolve } from 'path';
import fs from 'fs';

export function generateUrl(request, ...args) {
  return `${request.protocol}://${request.get('host')}${args.join('/')}`;
}

export function createSymlink(filePath, symlinkName) {
  const { resolve } = require('path');
  const fs = require('fs');
  const absBasePath = resolve(config.cli.dir);
  const absFilePath = resolve(filePath);

  // Security: Allow only download from 'config.cli.dir'
  if (
    0 === absFilePath.indexOf(absBasePath) &&
    fs.existsSync(absFilePath) &&
    fs.statSync(absFilePath).isFile()
  ) {
    fs.symlink(
      absFilePath,
      `${ABSOLUTE_TMP}/${symlinkName}`,
      (err) => err && console.log(err),
    );
  } else {
    throw new Error('Access denied!');
  }
}

export function cleanTMPFiles() {
  const cron = require('node-cron');
  const tmpFileTTL = config.helper.tmpFileTTL;

  cron.schedule('*/2 * * * *', () => {
    let files = fs.readdirSync(ABSOLUTE_TMP);
    let result = [];

    files.forEach((fileName) => {
      if ('.gitkeep' !== fileName) {
        let filePath = `${ABSOLUTE_TMP}/${fileName}`;
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
      let timestamp = new Date(Date.now());
      console.log(
        `[${timestamp.toISOString()}] Deleted ${count} expired file(s) in /public${PUBLIC_TMP} :`,
      );
      console.log(result);
    }
  });
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
