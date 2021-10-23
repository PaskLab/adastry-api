import fetch from 'node-fetch';

export async function request(
  providerUrl: string,
  endpoint: string,
  headers?: any,
  body?: any,
): Promise<any | null> {
  return await fetch(providerUrl + endpoint, {
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
