# Approval workflow

A deliberately simple two-step flow with a clear audit trail.

## States

```
        ┌──────┐   Submit    ┌────────────────────┐   Approve    ┌──────────────────┐
draft → │draft │ ──────────▶ │ pending_approval   │ ───────────▶ │ published @ v    │
        └──────┘             └────────────────────┘              └──────────────────┘
```

State lives in `pocMeta.status` inside `contracts/drafts/<id>.yaml`.

## Step 1 — Submit for approval

The editor clicks **Submit for approval**. The SPA:

1. Validates ODCS + PoC rules; refuses to submit invalid YAML.
2. Sets `pocMeta.status: pending_approval`, `pocMeta.submittedBy`, `pocMeta.submittedAt`.
3. Commits to `main` with message:
   `submit(<contractId>): pending approval`

## Step 2 — Approve

The approver opens the draft and clicks **Approve**. The SPA:

1. Computes the diff against the latest approved version (if any).
2. Suggests a SemVer bump (`major`/`minor`/`patch`) with a one-line rationale.
3. The approver confirms or overrides the bump and rationale.
4. The SPA performs **one atomic commit via the git tree API** containing:
   - `contracts/approved/<id>/<version>.yaml` — new immutable file (stripped of `pocMeta`
     workflow fields; retains agency/type).
   - `contracts/approved/index.json` — updated to point `<id>` → `<version>`.
   - `audit/approvals.jsonl` — one new line appended (see schema below).
   - `contracts/drafts/<id>.yaml` — updated to `pocMeta.status: published`, with
     `approvedBy` and `approvedAt`.
5. Commit message: `approve(<contractId>): v<version> (<bump>) — <rationale>`
6. After the commit, the SPA creates a git tag `<contractId>@<version>` on that commit SHA.

Self-approval **is** permitted in the PoC (single-approver scenario).

## Audit log schema (`audit/approvals.jsonl`)

One JSON object per line. Append-only.

```json
{"ts":"2026-05-30T14:02:11Z","event":"submit","contractId":"av-incident-report","version":"1.1.0","actor":"joebent23","commit":"<sha>"}
{"ts":"2026-05-30T14:05:47Z","event":"approve","contractId":"av-incident-report","version":"1.1.0","bump":"minor","rationale":"added optional vehicleVin field","actor":"joebent23","commit":"<sha>","tag":"av-incident-report@1.1.0"}
```

The SPA's **Audit** page renders this newest-first, joined with the contract list.

## Why a single tree-API commit

Each approval is **one** GitHub commit, not four. If any part of the write fails, nothing
is half-written. The git tree API (`POST /repos/{owner}/{repo}/git/trees` +
`POST /repos/{owner}/{repo}/git/commits`) lets us bundle the four file changes plus the
new contract file into one tree and one commit pointing at it. The tag creation is a
follow-up REST call — if it fails, the approval is still durable and the tag can be
retried.
