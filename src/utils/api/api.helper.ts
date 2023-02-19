import fetch from 'node-fetch';

export async function silentFailRequest(
  providerUrl: string,
  endpoint: string,
  headers?: any,
  body?: any,
): Promise<any | null> {
  return fetch(providerUrl + endpoint, {
    headers: {
      ...headers,
      'User-Agent': 'rewards-tracker',
    },
    method: body ? 'POST' : 'GET',
    body,
  })
    .then((res) => {
      if (res.ok) {
        return res.json();
      } else {
        console.log(res.status, res.url, res.statusText);
        return null;
      }
    })
    .catch(console.log);
}

export async function request(
  providerUrl: string,
  endpoint: string,
  headers?: any,
  body?: any,
): Promise<any | null> {
  return fetch(providerUrl + endpoint, {
    headers: {
      ...headers,
      'User-Agent': 'rewards-tracker',
    },
    method: body ? 'POST' : 'GET',
    body,
  })
    .then((res) => res.json())
    .catch((e) => {
      throw e;
    });
}
