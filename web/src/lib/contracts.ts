import yaml from 'js-yaml';
import { getOctokit } from './octokit';
import { OWNER, REPO, BRANCH, draftPath, auditPath, emptyIndex, indexPath, type ApprovedIndex } from './repoPaths';

export interface ContractListItem {
  id: string;
  path: string;
  status: string;
  agency?: string;
  type?: string;
  version?: string;
  description?: string;
  latestApproved?: string;
}

interface GhTreeItem {
  path?: string;
  type?: string;
  sha?: string;
}

async function fetchPublicJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url + `?_=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function fetchPublicText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url + `?_=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

export async function fetchApprovedIndexPublic(): Promise<ApprovedIndex> {
  const url = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/${indexPath()}`;
  const data = await fetchPublicJson<Partial<ApprovedIndex>>(url);
  if (!data || !data.contracts) return emptyIndex();
  return { generatedAt: data.generatedAt ?? null, contracts: data.contracts };
}

export async function listDrafts(): Promise<ContractListItem[]> {
  const octokit = getOctokit();
  // List the drafts folder via the contents API.
  let entries: GhTreeItem[] = [];
  try {
    const res = await octokit.repos.getContent({
      owner: OWNER,
      repo: REPO,
      path: 'contracts/drafts',
      ref: BRANCH,
    });
    if (Array.isArray(res.data)) entries = res.data as unknown as GhTreeItem[];
  } catch (err) {
    const e = err as { status?: number };
    if (e.status !== 404) throw err;
    entries = [];
  }
  const yamlFiles = entries.filter((e) => e.type === 'file' && e.path?.endsWith('.yaml'));

  const approved = await fetchApprovedIndexPublic();

  const results = await Promise.all(
    yamlFiles.map(async (entry) => {
      const path = entry.path!;
      const id = path.replace(/^contracts\/drafts\//, '').replace(/\.yaml$/, '');
      const fileRes = await octokit.repos.getContent({ owner: OWNER, repo: REPO, path, ref: BRANCH });
      const data = fileRes.data as { content?: string };
      const text = data.content ? atob(data.content.replace(/\n/g, '')) : '';
      let doc: Record<string, unknown> = {};
      try {
        doc = (yaml.load(text) as Record<string, unknown>) ?? {};
      } catch {
        // Ignore parse failure; show file with unknown status.
      }
      const pocMeta = (doc.pocMeta && typeof doc.pocMeta === 'object'
        ? (doc.pocMeta as Record<string, unknown>)
        : {}) as Record<string, unknown>;
      return {
        id,
        path,
        status: String(pocMeta.status ?? 'draft'),
        agency: pocMeta.agency as string | undefined,
        type: pocMeta.type as string | undefined,
        version: typeof doc.version === 'string' ? (doc.version as string) : undefined,
        description: typeof doc.description === 'string' ? (doc.description as string) : undefined,
        latestApproved: approved.contracts[id]?.latest,
      } as ContractListItem;
    }),
  );
  results.sort((a, b) => a.id.localeCompare(b.id));
  return results;
}

export interface DraftFile {
  yaml: string;
  sha: string;
}

export async function getDraft(contractId: string): Promise<DraftFile | null> {
  const octokit = getOctokit();
  try {
    const res = await octokit.repos.getContent({
      owner: OWNER,
      repo: REPO,
      path: draftPath(contractId),
      ref: BRANCH,
    });
    const data = res.data as { content?: string; sha: string; type?: string };
    if (data.type !== 'file' || !data.content) return null;
    return { yaml: atob(data.content.replace(/\n/g, '')), sha: data.sha };
  } catch (err) {
    const e = err as { status?: number };
    if (e.status === 404) return null;
    throw err;
  }
}

export async function getApprovedYaml(contractId: string, version: string): Promise<string | null> {
  const url = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/contracts/approved/${contractId}/${version}.yaml`;
  return await fetchPublicText(url);
}

export interface AuditEntry {
  ts: string;
  event: string;
  contractId: string;
  version?: string;
  bump?: string;
  rationale?: string;
  actor?: string;
  commit?: string;
  tag?: string;
}

export async function fetchAuditPublic(): Promise<AuditEntry[]> {
  const url = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/${auditPath()}`;
  const text = await fetchPublicText(url);
  if (!text) return [];
  const lines = text.split(/\r?\n/).filter(Boolean);
  const out: AuditEntry[] = [];
  for (const line of lines) {
    try {
      out.push(JSON.parse(line) as AuditEntry);
    } catch {
      // skip bad lines
    }
  }
  return out.reverse();
}
