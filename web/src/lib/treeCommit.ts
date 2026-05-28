import yaml from 'js-yaml';
import { getOctokit } from './octokit';
import {
  OWNER,
  REPO,
  BRANCH,
  approvedPath,
  auditPath,
  draftPath,
  indexPath,
  rawUrl,
  emptyIndex,
  type ApprovedIndex,
} from './repoPaths';
import type { BumpKind } from './semverBump';

export interface ApproveInput {
  contractId: string;
  version: string;
  bump: BumpKind;
  rationale: string;
  actor: string;
  draftYaml: string;
}

export interface ApproveResult {
  commitSha: string;
  tagCreated: boolean;
  tagName: string;
}

function stripWorkflowMeta(yamlStr: string): string {
  const doc = yaml.load(yamlStr);
  if (!doc || typeof doc !== 'object') return yamlStr;
  const obj = doc as Record<string, unknown>;
  const pocMeta = obj.pocMeta as Record<string, unknown> | undefined;
  if (pocMeta && typeof pocMeta === 'object') {
    const { agency, type } = pocMeta;
    // Keep only agency + type; strip workflow fields (status, submittedBy, approvedBy, etc.).
    const trimmed: Record<string, unknown> = {};
    if (agency !== undefined) trimmed.agency = agency;
    if (type !== undefined) trimmed.type = type;
    if (Object.keys(trimmed).length === 0) {
      delete obj.pocMeta;
    } else {
      obj.pocMeta = trimmed;
    }
  }
  return yaml.dump(obj, { lineWidth: 120, noRefs: true });
}

function markDraftPublished(yamlStr: string, actor: string, ts: string): string {
  const doc = yaml.load(yamlStr);
  if (!doc || typeof doc !== 'object') return yamlStr;
  const obj = doc as Record<string, unknown>;
  const pocMeta = (obj.pocMeta && typeof obj.pocMeta === 'object'
    ? (obj.pocMeta as Record<string, unknown>)
    : {}) as Record<string, unknown>;
  pocMeta.status = 'published';
  pocMeta.approvedBy = actor;
  pocMeta.approvedAt = ts;
  obj.pocMeta = pocMeta;
  return yaml.dump(obj, { lineWidth: 120, noRefs: true });
}

async function readIndex(): Promise<{ index: ApprovedIndex; sha?: string }> {
  const octokit = getOctokit();
  try {
    const res = await octokit.repos.getContent({
      owner: OWNER,
      repo: REPO,
      path: indexPath(),
      ref: BRANCH,
    });
    const data = res.data as { type?: string; content?: string; encoding?: string; sha?: string };
    if (data.type !== 'file' || !data.content) return { index: emptyIndex() };
    const decoded = atob(data.content.replace(/\n/g, ''));
    try {
      const parsed = JSON.parse(decoded) as Partial<ApprovedIndex>;
      if (!parsed.contracts || typeof parsed.contracts !== 'object') {
        return { index: emptyIndex(), sha: data.sha };
      }
      return {
        index: {
          generatedAt: parsed.generatedAt ?? null,
          contracts: parsed.contracts as ApprovedIndex['contracts'],
        },
        sha: data.sha,
      };
    } catch {
      return { index: emptyIndex(), sha: data.sha };
    }
  } catch (err) {
    const e = err as { status?: number };
    if (e.status === 404) return { index: emptyIndex() };
    throw err;
  }
}

async function readAuditTail(): Promise<string> {
  const octokit = getOctokit();
  try {
    const res = await octokit.repos.getContent({
      owner: OWNER,
      repo: REPO,
      path: auditPath(),
      ref: BRANCH,
    });
    const data = res.data as { type?: string; content?: string };
    if (data.type !== 'file' || !data.content) return '';
    return atob(data.content.replace(/\n/g, ''));
  } catch (err) {
    const e = err as { status?: number };
    if (e.status === 404) return '';
    throw err;
  }
}

function updateIndex(
  index: ApprovedIndex,
  contractId: string,
  version: string,
  ts: string,
): ApprovedIndex {
  const existing = index.contracts[contractId];
  const versions = existing ? Array.from(new Set([...existing.versions, version])) : [version];
  // Sort versions semver-ish; fallback to string.
  versions.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const latest = versions[versions.length - 1];
  index.contracts[contractId] = {
    latest,
    versions,
    updatedAt: ts,
    rawUrl: rawUrl(approvedPath(contractId, latest)),
  };
  index.generatedAt = ts;
  return index;
}

/**
 * Approve a contract by committing 4 files in a single tree:
 *  1) contracts/approved/<id>/<version>.yaml (workflow meta stripped)
 *  2) contracts/approved/index.json (updated)
 *  3) audit/approvals.jsonl (one line appended)
 *  4) contracts/drafts/<id>.yaml (status: published)
 * Then best-effort creates lightweight tag <contractId>@<version>.
 */
export async function approveContract(input: ApproveInput): Promise<ApproveResult> {
  const { contractId, version, bump, rationale, actor, draftYaml } = input;
  const octokit = getOctokit();
  const ts = new Date().toISOString();

  // 1. Read current ref & commit.
  const refRes = await octokit.git.getRef({
    owner: OWNER,
    repo: REPO,
    ref: `heads/${BRANCH}`,
  });
  const parentSha = refRes.data.object.sha;

  const parentCommitRes = await octokit.git.getCommit({
    owner: OWNER,
    repo: REPO,
    commit_sha: parentSha,
  });
  const baseTreeSha = parentCommitRes.data.tree.sha;

  // 2. Build file contents.
  const approvedYaml = stripWorkflowMeta(draftYaml);
  const { index } = await readIndex();
  const newIndex = updateIndex(index, contractId, version, ts);
  const indexJson = JSON.stringify(newIndex, null, 2) + '\n';

  const auditPrev = await readAuditTail();
  const auditLine =
    JSON.stringify({
      ts,
      event: 'approve',
      contractId,
      version,
      bump,
      rationale,
      actor,
      commit: parentSha,
      tag: `${contractId}@${version}`,
    }) + '\n';
  const auditContent = (auditPrev.endsWith('\n') || auditPrev === '' ? auditPrev : auditPrev + '\n') + auditLine;

  const publishedDraft = markDraftPublished(draftYaml, actor, ts);

  // 3. Create blobs (in parallel).
  const [approvedBlob, indexBlob, auditBlob, draftBlob] = await Promise.all([
    octokit.git.createBlob({ owner: OWNER, repo: REPO, content: approvedYaml, encoding: 'utf-8' }),
    octokit.git.createBlob({ owner: OWNER, repo: REPO, content: indexJson, encoding: 'utf-8' }),
    octokit.git.createBlob({ owner: OWNER, repo: REPO, content: auditContent, encoding: 'utf-8' }),
    octokit.git.createBlob({ owner: OWNER, repo: REPO, content: publishedDraft, encoding: 'utf-8' }),
  ]);

  // 4. Build tree with 4 entries off base_tree.
  const treeRes = await octokit.git.createTree({
    owner: OWNER,
    repo: REPO,
    base_tree: baseTreeSha,
    tree: [
      { path: approvedPath(contractId, version), mode: '100644', type: 'blob', sha: approvedBlob.data.sha },
      { path: indexPath(), mode: '100644', type: 'blob', sha: indexBlob.data.sha },
      { path: auditPath(), mode: '100644', type: 'blob', sha: auditBlob.data.sha },
      { path: draftPath(contractId), mode: '100644', type: 'blob', sha: draftBlob.data.sha },
    ],
  });

  // 5. Create commit.
  const message = `approve(${contractId}): v${version} (${bump}) — ${rationale}`;
  const commitRes = await octokit.git.createCommit({
    owner: OWNER,
    repo: REPO,
    message,
    tree: treeRes.data.sha,
    parents: [parentSha],
  });

  // 6. Update ref (no force).
  await octokit.git.updateRef({
    owner: OWNER,
    repo: REPO,
    ref: `heads/${BRANCH}`,
    sha: commitRes.data.sha,
    force: false,
  });

  // 7. Best-effort lightweight tag.
  const tagName = `${contractId}@${version}`;
  let tagCreated = false;
  try {
    await octokit.git.createRef({
      owner: OWNER,
      repo: REPO,
      ref: `refs/tags/${tagName}`,
      sha: commitRes.data.sha,
    });
    tagCreated = true;
  } catch {
    tagCreated = false;
  }

  return { commitSha: commitRes.data.sha, tagCreated, tagName };
}

export interface SubmitInput {
  contractId: string;
  version: string;
  actor: string;
  draftYaml: string;
}

/**
 * Submit a draft by writing the draft file with pocMeta.status=pending_approval
 * and appending a submit event to audit/approvals.jsonl, in one tree commit.
 */
export async function submitContract(input: SubmitInput): Promise<{ commitSha: string }> {
  const { contractId, version, actor, draftYaml } = input;
  const octokit = getOctokit();
  const ts = new Date().toISOString();

  // Patch the draft.
  const doc = (yaml.load(draftYaml) ?? {}) as Record<string, unknown>;
  const pocMeta = (doc.pocMeta && typeof doc.pocMeta === 'object'
    ? (doc.pocMeta as Record<string, unknown>)
    : {}) as Record<string, unknown>;
  pocMeta.status = 'pending_approval';
  pocMeta.submittedBy = actor;
  pocMeta.submittedAt = ts;
  doc.pocMeta = pocMeta;
  const patched = yaml.dump(doc, { lineWidth: 120, noRefs: true });

  const refRes = await octokit.git.getRef({
    owner: OWNER,
    repo: REPO,
    ref: `heads/${BRANCH}`,
  });
  const parentSha = refRes.data.object.sha;
  const parentCommitRes = await octokit.git.getCommit({
    owner: OWNER,
    repo: REPO,
    commit_sha: parentSha,
  });
  const baseTreeSha = parentCommitRes.data.tree.sha;

  const auditPrev = await readAuditTail();
  const auditLine =
    JSON.stringify({
      ts,
      event: 'submit',
      contractId,
      version,
      actor,
      commit: parentSha,
    }) + '\n';
  const auditContent = (auditPrev.endsWith('\n') || auditPrev === '' ? auditPrev : auditPrev + '\n') + auditLine;

  const [draftBlob, auditBlob] = await Promise.all([
    octokit.git.createBlob({ owner: OWNER, repo: REPO, content: patched, encoding: 'utf-8' }),
    octokit.git.createBlob({ owner: OWNER, repo: REPO, content: auditContent, encoding: 'utf-8' }),
  ]);
  const treeRes = await octokit.git.createTree({
    owner: OWNER,
    repo: REPO,
    base_tree: baseTreeSha,
    tree: [
      { path: draftPath(contractId), mode: '100644', type: 'blob', sha: draftBlob.data.sha },
      { path: auditPath(), mode: '100644', type: 'blob', sha: auditBlob.data.sha },
    ],
  });
  const commitRes = await octokit.git.createCommit({
    owner: OWNER,
    repo: REPO,
    message: `submit(${contractId}): pending approval`,
    tree: treeRes.data.sha,
    parents: [parentSha],
  });
  await octokit.git.updateRef({
    owner: OWNER,
    repo: REPO,
    ref: `heads/${BRANCH}`,
    sha: commitRes.data.sha,
    force: false,
  });
  return { commitSha: commitRes.data.sha };
}

/**
 * Save a draft (no audit, no status change) via a single Contents API PUT.
 */
export async function saveDraft(contractId: string, yamlContent: string): Promise<{ commitSha: string }> {
  const octokit = getOctokit();
  const path = draftPath(contractId);
  let sha: string | undefined;
  try {
    const cur = await octokit.repos.getContent({ owner: OWNER, repo: REPO, path, ref: BRANCH });
    const data = cur.data as { sha?: string; type?: string };
    if (data.type === 'file') sha = data.sha;
  } catch (err) {
    const e = err as { status?: number };
    if (e.status !== 404) throw err;
  }
  // btoa requires latin1; encode UTF-8 safely.
  const utf8 = new TextEncoder().encode(yamlContent);
  let binary = '';
  utf8.forEach((b) => (binary += String.fromCharCode(b)));
  const b64 = btoa(binary);

  const res = await octokit.repos.createOrUpdateFileContents({
    owner: OWNER,
    repo: REPO,
    path,
    message: `chore(${contractId}): save draft`,
    content: b64,
    branch: BRANCH,
    sha,
  });
  return { commitSha: res.data.commit.sha ?? '' };
}
