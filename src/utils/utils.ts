import { Request } from 'express';
import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';
import { EncryptedTextType } from './types/encrypted-text.type';

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

export async function encrypt(
  data: string,
  secret: string,
  encoding: BufferEncoding = 'base64',
): Promise<EncryptedTextType> {
  const iv = randomBytes(16);

  // The key length is dependent on the algorithm.
  // In this case for aes256, it is 32 bytes.
  const key = (await promisify(scrypt)(secret, 'salt', 32)) as Buffer;
  const cipher = createCipheriv('aes-256-ctr', key, iv);

  const encryptedText = Buffer.concat([cipher.update(data), cipher.final()]);

  return {
    encoding: encoding,
    encrypted: iv.toString(encoding) + encryptedText.toString(encoding),
  };
}

export async function decrypt(
  data: string,
  secret: string,
  encoding: BufferEncoding = 'base64',
): Promise<string> {
  const match = data.match(RegExp('^(.*[=]{2})(.*)$'));

  if (!match) {
    return '';
  }

  const iv = match[1];
  const encrypted = match[2];

  // The key length is dependent on the algorithm.
  // In this case for aes256, it is 32 bytes.
  const key = (await promisify(scrypt)(secret, 'salt', 32)) as Buffer;
  const decipher = createDecipheriv(
    'aes-256-ctr',
    key,
    Buffer.from(iv, encoding),
  );
  const decryptedText = Buffer.concat([
    decipher.update(Buffer.from(encrypted, encoding)),
    decipher.final(),
  ]);

  return decryptedText.toString();
}
