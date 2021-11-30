import { Request } from 'express';

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
