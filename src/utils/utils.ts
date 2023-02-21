import { Request } from 'express';
import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';
import { EncryptedTextType } from './types/encrypted-text.type';
import { ValueTransformer } from 'typeorm';
import * as CSL from '@emurgo/cardano-serialization-lib-nodejs';
import { BadRequestException } from '@nestjs/common';

export function generateUrl(request: Request, ...args: string[]) {
  return `http${
    process.env.NODE_ENV === 'development' ? '' : 's'
  }://${request.get('host')}/${args.join('/')}`;
}

export function dateFromUnix(unixTimestamp): Date {
  return new Date(unixTimestamp * 1000);
}

export function dateToUnix(date: Date): number {
  return Math.floor(date.valueOf() / 1000);
}

export const zeroLead = (str) => ('0' + str).slice(-2);

export function createTimestamp(date): string {
  return `${date.getUTCFullYear()}-${zeroLead(
    date.getUTCMonth() + 1,
  )}-${zeroLead(date.getUTCDate())} ${zeroLead(date.getUTCHours())}:${zeroLead(
    date.getUTCMinutes(),
  )}:${zeroLead(date.getUTCSeconds())}Z`;
}

export function generateUnixTimeRange(
  year: number,
  startMonth?: number,
  quarter?: number,
): { startTime: number; endTime: number } {
  const endDay = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  // Use 0-11 month notation for modulo support
  let _startMonth = startMonth ? startMonth - 1 : 0;
  let endMonth = _startMonth === 0 ? 11 : _startMonth - 1;

  if (quarter) {
    endMonth = ((quarter - 1) * 3 + 2 + _startMonth) % 12;
    _startMonth = ((quarter - 1) * 3 + _startMonth) % 12;
  }

  return {
    startTime: dateToUnix(
      new Date(
        `${
          startMonth && _startMonth < startMonth - 1 ? year + 1 : year
        }-${zeroLead(_startMonth + 1)}-01T00:00:00Z`,
      ),
    ),
    endTime: dateToUnix(
      new Date(
        `${
          startMonth && endMonth < startMonth - 1 ? year + 1 : year
        }-${zeroLead(endMonth + 1)}-${endDay[endMonth]}T23:59:59Z`,
      ),
    ),
  };
}

export function roundTo(num: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(num * factor) / factor;
}

export function toAda(amount: number): number {
  return amount / 1000000;
}

export function parseAssetHex(hex: string): {
  policy: string;
  hexName: string;
  name: string;
} {
  return {
    policy: hex.slice(0, 56),
    hexName: hex.slice(56),
    name: Buffer.from(hex.slice(56), 'hex').toString(),
  };
}

export const StrToBigInt: ValueTransformer = {
  to: (entityValue: number) => entityValue,
  from: (databaseValue: string): number => parseInt(databaseValue, 10),
};

export function randNumber(): number {
  return Math.floor(Math.random() * Date.now());
}

export function randomString(length: number, chars: string): string {
  let mask = '';
  if (chars.indexOf('a') > -1) mask += 'abcdefghijklmnopqrstuvwxyz';
  if (chars.indexOf('A') > -1) mask += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (chars.indexOf('#') > -1) mask += '012345678901234567890123456789';
  if (chars.indexOf('!') > -1) mask += '~`!@#$%^&*()_+-={}[]:";\'<>?,./|\\';
  let result = '';
  for (let i = length; i > 0; --i) {
    result += mask[Math.floor(Math.random() * mask.length)];
  }

  return result;
}

export function extractStakeAddress(hexAddress: string): CSL.Address {
  const baseAddress = CSL.BaseAddress.from_address(
    CSL.Address.from_bytes(Buffer.from(hexAddress, 'hex')),
  );
  const stakeCred = baseAddress?.stake_cred();

  if (!stakeCred) {
    throw new BadRequestException('Invalid address.');
  }

  const bytesStakeAddress = new Uint8Array(29);
  bytesStakeAddress.set([0xe1], 0);
  bytesStakeAddress.set(stakeCred.to_bytes().slice(4, 32), 1);

  const stakeAddress = CSL.RewardAddress.from_address(
    CSL.Address.from_bytes(bytesStakeAddress),
  );

  if (!stakeAddress) {
    throw new BadRequestException(
      'Could not extract stake address from the provided address.',
    );
  }

  return stakeAddress.to_address();
}

export function hexToBech32(
  address: string,
  type: 'payment' | 'reward' = 'payment',
): string {
  const builder = type === 'payment' ? CSL.BaseAddress : CSL.RewardAddress;

  const addressObject = builder.from_address(
    CSL.Address.from_bytes(Buffer.from(address, 'hex')),
  );

  if (!addressObject)
    throw new BadRequestException(`Wrong ${type} address format`);

  return addressObject.to_address().to_bech32();
}

/**
 * General encryption helper
 * @param data
 * @param secret
 * @param encoding
 * @param hardenedMode - Improve security with tradeoff, hardened data cannot be queried
 */
export async function encrypt(
  data: string,
  secret: string,
  encoding: BufferEncoding = 'base64',
  hardenedMode = false,
): Promise<EncryptedTextType> {
  const iv = randomBytes(16);

  // The key length is dependent on the algorithm.
  // In this case for aes256, it is 32 bytes.
  const key = (await promisify(scrypt)(secret, 'salt', 32)) as Buffer;
  const cipher = createCipheriv(
    'aes-256-ctr',
    key,
    hardenedMode ? iv : Buffer.from('6ff5ebc8af72c6603f48d16109975ac4', 'hex'),
  );

  const encryptedText = Buffer.concat([cipher.update(data), cipher.final()]);

  return {
    encoding: encoding,
    encrypted:
      (hardenedMode ? iv.toString(encoding) : '') +
      encryptedText.toString(encoding),
  };
}

export async function decrypt(
  data: string,
  secret: string,
  encoding: BufferEncoding = 'base64',
): Promise<string> {
  let hardened = false;
  let iv = '';
  let encrypted = data;

  const match = data.match(RegExp('^(.*==)(.*==)$'));

  if (match) {
    hardened = true;
    iv = match[1];
    encrypted = match[2];
  }

  // The key length is dependent on the algorithm.
  // In this case for aes256, it is 32 bytes.
  const key = (await promisify(scrypt)(secret, 'salt', 32)) as Buffer;
  const decipher = createDecipheriv(
    'aes-256-ctr',
    key,
    hardened
      ? Buffer.from(iv, encoding)
      : Buffer.from('6ff5ebc8af72c6603f48d16109975ac4', 'hex'),
  );
  const decryptedText = Buffer.concat([
    decipher.update(Buffer.from(encrypted, encoding)),
    decipher.final(),
  ]);

  return decryptedText.toString();
}
