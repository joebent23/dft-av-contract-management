export const OWNER = 'joebent23';
export const REPO = 'dft-av-contract-management';
export const BRANCH = 'main';

export function draftPath(id: string): string {
  return `contracts/drafts/${id}.yaml`;
}

export function approvedPath(id: string, version: string): string {
  return `contracts/approved/${id}/${version}.yaml`;
}

export function indexPath(): string {
  return 'contracts/approved/index.json';
}

export function auditPath(): string {
  return 'audit/approvals.jsonl';
}

export function rawUrl(filePath: string, branch: string = BRANCH): string {
  return `https://raw.githubusercontent.com/${OWNER}/${REPO}/${branch}/${filePath}`;
}

export interface ApprovedIndexEntry {
  latest: string;
  versions: string[];
  updatedAt: string;
  rawUrl: string;
}

export interface ApprovedIndex {
  generatedAt: string | null;
  contracts: Record<string, ApprovedIndexEntry>;
}

export function emptyIndex(): ApprovedIndex {
  return { generatedAt: null, contracts: {} };
}
