const STORAGE_KEY = 'dft-av-contracts.pat';

export class MissingTokenError extends Error {
  constructor() {
    super('No GitHub Personal Access Token configured. Open Settings to add one.');
    this.name = 'MissingTokenError';
  }
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  localStorage.setItem(STORAGE_KEY, token.trim());
}

export function clearToken(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function assertToken(): string {
  const t = getToken();
  if (!t) throw new MissingTokenError();
  return t;
}
