# DfT-AV Contract Management — PoC

A lightweight, **GitHub-native** proof of concept for managing **data contracts** in the
UK Department for Transport's Autonomous Vehicles programme.

> **Workshop target:** Monday 1 June 2026.
> **Audience:** technical delivery team (DfT / Kainos / Arup).
> **Scope:** end-to-end demo of *contract authoring → 2-step approval → published
> immutable version at a raw GitHub URL*. The downstream APIM validation layer is owned
> by another team and is **out of scope** here; this repo defines the **handoff boundary**
> they consume from.

---

## What this is

A static single-page app, hosted on **GitHub Pages**, that uses **this repository as its
backing store** for [Open Data Contract Standard (ODCS)](https://bitol-io.github.io/open-data-contract-standard/)
contracts. There is **no server, no database, no cloud infrastructure** — just GitHub.

- **Author** contracts in a browser YAML editor with live ODCS validation.
- **Submit for approval** → status flips to `pending_approval`, timestamped and signed.
- **Approve** (single-approver PoC, self-approval permitted) → an atomic commit writes the
  immutable approved version, updates the index, appends to the audit log, and tags the release.
- **Consume** approved contracts from `raw.githubusercontent.com` URLs.

## Architecture (one-glance)

```
Browser SPA (GitHub Pages)  ──octokit──▶  GitHub REST API  ──▶  this repo
                                                                 │
                                                                 ├─ contracts/drafts/        (work in progress)
                                                                 ├─ contracts/approved/      (immutable, versioned)
                                                                 ├─ contracts/approved/index.json
                                                                 └─ audit/approvals.jsonl

                            Approved contracts surface at:
                            https://raw.githubusercontent.com/joebent23/dft-av-contract-management/main/contracts/approved/<id>/<version>.yaml
                                                                 │
                                                                 ▼
                                                       Downstream APIM team
                                                       (out of scope — separate workstream)
```

See [docs/architecture.md](docs/architecture.md) for the full picture, decisions, and
sequence diagrams.

## Quick start

```bash
# 1. Clone
git clone https://github.com/joebent23/dft-av-contract-management.git
cd dft-av-contract-management

# 2. Install (once the web/ app is scaffolded)
cd web
pnpm install
pnpm dev
# → http://localhost:5173
```

On first load, the app's **Settings** page asks for a GitHub
[fine-grained Personal Access Token](https://github.com/settings/personal-access-tokens/new)
with **`Contents: Read and write`** on this repo only. The token is stored in
`localStorage` (PoC simplification — production would use a proper OAuth App with a tiny
token-exchange backend). See [docs/local-development.md](docs/local-development.md).

## Contract lifecycle

| Stage | What happens | Where it lives |
|---|---|---|
| **Draft** | Editor saves the YAML | `contracts/drafts/<id>.yaml` (status: `draft`) |
| **Pending approval** | Editor clicks *Submit for approval*; UI writes `status`, `submittedAt`, `submittedBy` | same file |
| **Approved** | Approver confirms SemVer bump; UI commits new immutable version + updates index + appends audit + tags the release | `contracts/approved/<id>/<version>.yaml` |
| **Consumed** | Downstream services fetch the raw URL | `raw.githubusercontent.com/...` |

Detail in [docs/approval-workflow.md](docs/approval-workflow.md).

## For consumers (APIM team)

Approved contracts are served as immutable raw files. Two recommended entry points:

- **Latest-of-each list (index):**
  `https://raw.githubusercontent.com/joebent23/dft-av-contract-management/main/contracts/approved/index.json`
- **Specific version:**
  `https://raw.githubusercontent.com/joebent23/dft-av-contract-management/main/contracts/approved/<contractId>/<version>.yaml`

See [docs/apim-handoff.md](docs/apim-handoff.md) for cache-busting guidance, ETag/SHA
validation, and recommended polling vs. webhook patterns.

## Documentation

| Doc | Purpose |
|---|---|
| [docs/overview.md](docs/overview.md) | Problem framing, why GitHub-native, what's in/out of scope |
| [docs/architecture.md](docs/architecture.md) | Component + sequence diagrams, key decisions |
| [docs/contract-model.md](docs/contract-model.md) | ODCS structure + the `pocMeta` extension |
| [docs/approval-workflow.md](docs/approval-workflow.md) | 2-step approval, audit log, tagging |
| [docs/local-development.md](docs/local-development.md) | Setup, PAT, running locally, troubleshooting |
| [docs/demo-script.md](docs/demo-script.md) | Step-by-step workshop demo (to be written) |
| [docs/apim-handoff.md](docs/apim-handoff.md) | The boundary with the APIM team |

## Status & roadmap

This is an early-stage PoC. The internal planning lives under
[`.copilot-tracking/`](./.copilot-tracking) (research, architecture decisions,
implementation plan, repo layout).

## Discovery references

Background research and discovery materials for the wider DfT-AV data programme live
**outside this repo** at `../../discovery/` on the author's workstation (not redistributed
here). Key inputs that shaped this PoC:

- `workshop-briefing-for-joe.md` — workshop scope and audience
- `data-contract-deep-dive.md`, `data-contracts-addendum.md` — ODCS rationale, lifecycle
- `push-intake-architecture.md` — the seven canonical submission scenarios
- `soda-fabric-purview-pattern.md` — production-shape distribution pattern (Post-PoC)

The condensed research report consumed by this PoC's planning is at
[.copilot-tracking/research/discovery-research.md](.copilot-tracking/research/discovery-research.md).

---

*Microsoft engagement artefact for the UK Department for Transport. Not for redistribution outside DfT-AV / Microsoft engagement teams.*
