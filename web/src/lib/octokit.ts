import { Octokit } from '@octokit/rest';
import { assertToken, getToken } from './token';

let cached: { token: string; client: Octokit } | null = null;

export function getOctokit(): Octokit {
  const token = assertToken();
  if (cached && cached.token === token) return cached.client;
  const client = new Octokit({ auth: token, userAgent: 'dft-av-contracts-web/0.1' });
  cached = { token, client };
  return client;
}

export function invalidateOctokit(): void {
  cached = null;
}

export function hasToken(): boolean {
  return getToken() !== null;
}
