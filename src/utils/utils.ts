import { Request } from 'express';
import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';
import { EncryptedTextType } from './types/encrypted-text.type';
import { ValueTransformer } from 'typeorm';

export function generateUrl(request: Request, ...args: string[]) {
  return `${request.protocol}://${request.get('host')}/${args.join('/')}`;
}

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

export function roundTo(num: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(num * factor) / factor;
}

export function toAda(amount: number): number {
  return amount / 1000000;
}

export function parseAssetHex(hex: string): { policy: string; name: string } {
  return {
    policy: hex.slice(0, 56),
    name: Buffer.from(hex.slice(56), 'hex').toString(),
  };
}

export const StrToBigInt: ValueTransformer = {
  to: (entityValue: number) => entityValue,
  from: (databaseValue: string): number => parseInt(databaseValue, 10),
};

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

  const match = data.match(RegExp('^(.*[=]{2})(.*)$'));

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
