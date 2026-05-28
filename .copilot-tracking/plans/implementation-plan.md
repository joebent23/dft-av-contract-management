# Implementation Plan — DFT-AV Contract Management PoC

**Workshop:** Monday 1 June 2026. **Working days remaining:** ~3 (Fri / weekend buffer / Mon AM).
**Cut-throat rule:** if it isn't in MVP, it doesn't ship for the workshop.

---

## 1. MVP vs Stretch vs Post-workshop — cut-line

**MVP (must demo on Monday):**

1. Sign in by pasting a fine-grained GitHub PAT once on a Settings page; token persisted in `localStorage`.
2. List all contracts (drafts + approved) read from the repo via octokit.
3. Open a draft in a Monaco YAML editor with **live ODCS validation** (ajv against the ODCS JSON Schema) and inline error markers.
4. **Submit for approval** — UI rewrites `contracts/drafts/<id>.yaml` with `pocMeta.status: pending_approval`, `submittedAt`, `submittedBy`, commits to `main`.
5. **Approve flow** — UI diffs the draft against the latest approved version, **suggests a SemVer bump** (major/minor/patch) with a one-line reason, lets Joe confirm or override.
6. **Atomic approve commit** via the GitHub git tree API in a single commit that:
   a) writes `contracts/approved/<id>/<version>.yaml`,
   b) updates `contracts/approved/index.json`,
   c) appends a line to `audit/approvals.jsonl`,
   d) updates `contracts/drafts/<id>.yaml` to `pocMeta.status: published` with `approvedAt`/`approvedBy`.
7. Creates the git tag `<id>@<version>` after the commit.
8. **Audit log page** — renders `audit/approvals.jsonl` newest-first with actor/timestamp/event/version.
9. **External view** — copy-link button gives the raw URL; demo opens it in a new tab to prove the handoff.
10. Two seeded approved contracts in the repo: `av-incident-report@1.0.0`, `r155-cyber-notification@1.0.0`.
11. GitHub Pages deploy via `actions/deploy-pages` workflow on push to `main`.

**Stretch (nice on Monday, skip if running late):**

- GitHub Release per approved version with the YAML attached.
- Side-by-side YAML diff view in the approve dialog.
- Status badges and filtering on the list page.
- "Copy raw URL" works for the latest-pointer (`index.json` lookup) as well as version-pinned.
- Basic dark mode (shadcn default).

**Post-workshop (explicitly deferred):**

- Replace PAT with OAuth App + a tiny token-exchange backend.
- Multiple approvers / approval policies (CODEOWNERS-driven).
- Branch-and-PR approval mode for an audit trail without the SPA.
- Webhook out to the APIM team.
- Schema linting beyond ODCS (e.g. naming conventions, PII tags).
- Contract authoring wizards for non-technical users.
- Tests beyond happy path; e2e with Playwright.

---

## 2. Workstreams

### WS-A — Repo scaffold & seed contracts

| # | Task                                                           | Acceptance                                                                                          | Effort | Deps | Specialist           |
|---|----------------------------------------------------------------|-----------------------------------------------------------------------------------------------------|--------|------|----------------------|
| A1 | Create top-level folders per `repo-layout.md`                  | `contracts/drafts/.gitkeep`, `contracts/approved/index.json` (empty `{}`), `audit/approvals.jsonl` (empty) all committed. | S | — | contracts/ODCS |
| A2 | Seed `av-incident-report@1.0.0.yaml`                            | Valid ODCS YAML; included in `index.json`; one bootstrap line in `approvals.jsonl`.                 | S | A1   | contracts/ODCS       |
| A3 | Seed `r155-cyber-notification@1.0.0.yaml`                       | Same as A2.                                                                                         | S | A1   | contracts/ODCS       |
| A4 | `CODEOWNERS` + `.gitattributes` + `.editorconfig`              | `*.yaml` LF, `joebent23` owns `contracts/**`.                                                       | S | A1   | devops               |

### WS-B — SPA scaffold

| # | Task                                                                 | Acceptance                                                                                              | Effort | Deps   | Specialist |
|---|----------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------|--------|--------|------------|
| B1 | Vite + React + TS + Tailwind + shadcn/ui init under `web/`           | `npm run dev` serves a blank shell with shadcn theme; `npm run build` produces `web/dist`.              | S      | —      | frontend   |
| B2 | App shell — router, layout, nav (Contracts / Audit / Settings)       | Three routes render placeholder pages; nav highlights current.                                          | S      | B1     | frontend   |
| B3 | Settings page — PAT paste, validate, store in `localStorage`         | Pasting a token, clicking "Test", calls `GET /user` via octokit and shows the login. Clear/reset works. | M      | B2     | frontend   |
| B4 | `lib/octokit.ts` — singleton octokit configured from stored PAT      | Throws a typed error if no token. Used by all routes.                                                   | S      | B3     | frontend   |

### WS-C — Contract list, view, edit

| # | Task                                                                            | Acceptance                                                                                                       | Effort | Deps  | Specialist     |
|---|---------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------|--------|-------|----------------|
| C1 | Contracts list — read `contracts/drafts/` + `contracts/approved/index.json`     | Table shows id, name, current version (if approved), status badge, last modified. Loading + empty states.        | M      | B4,A2 | frontend       |
| C2 | Edit page — load draft (or empty draft from approved), Monaco YAML editor       | Editor shows YAML; line numbers; syntax highlight via `monaco-yaml`.                                             | M      | C1    | frontend       |
| C3 | `lib/odcs.ts` — ajv compiled against ODCS JSON Schema                            | `validate(yamlString)` returns `{valid, errors[]}` with line numbers mapped back to the source.                  | M      | —     | contracts/ODCS |
| C4 | Wire validation into Monaco — markers + side panel of human-readable errors     | Typing invalid YAML produces red squiggles within 300ms.                                                         | M      | C2,C3 | frontend       |
| C5 | "Save draft" — write `contracts/drafts/<id>.yaml` via octokit `PUT contents`     | Commit appears on `main`; on success, draft list reflects new `submittedAt` is unchanged.                        | S      | C4    | frontend       |

### WS-D — Submit & approve flow

| # | Task                                                                                                       | Acceptance                                                                                                                                                                   | Effort | Deps         | Specialist     |
|---|------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------|--------------|----------------|
| D1 | "Submit for approval" button — sets `pocMeta.status: pending_approval`, `submittedAt`, `submittedBy`, commits | New commit on `main` updates only the draft; UI status badge flips.                                                                                                          | S      | C5           | frontend       |
| D2 | `lib/semverBump.ts` — ODCS-aware diff returning suggested bump + reason                                     | Unit tests: added optional field ⇒ minor; removed required ⇒ major; description-only edit ⇒ patch; first ever version ⇒ `1.0.0`.                                             | M      | C3           | contracts/ODCS |
| D3 | Approve dialog — show diff summary, suggested bump, allow override, confirm                                 | Cannot approve unless `pocMeta.status == pending_approval` and the YAML validates.                                                                                           | M      | D1,D2        | frontend       |
| D4 | `lib/treeCommit.ts` — atomic commit writing 4 paths via git tree API                                       | One commit appears on `main` containing all four file changes; commit message `approve(<id>): <version>`.                                                                    | L      | D3           | frontend       |
| D5 | Create tag `<id>@<version>` immediately after D4 succeeds                                                  | `git ls-remote --tags` shows the new tag pointing at the approve commit.                                                                                                     | S      | D4           | frontend       |
| D6 | Surface failure paths — partial commit retry guidance, network errors, 409s                                | If D4 fails, the UI shows the error and a "Retry" button; nothing is half-written.                                                                                           | M      | D4           | frontend       |

### WS-E — Audit log & external view

| # | Task                                                            | Acceptance                                                                                          | Effort | Deps    | Specialist |
|---|-----------------------------------------------------------------|-----------------------------------------------------------------------------------------------------|--------|---------|------------|
| E1 | Audit page — fetch `audit/approvals.jsonl`, parse, render table | Newest first; columns ts/event/id/version/actor/bump; link to commit SHA on github.com.             | S      | A1      | frontend   |
| E2 | "Copy raw URL" actions on the contract detail page              | Buttons for version-pinned + index-latest raw URLs; toast on copy.                                  | S      | C1      | frontend   |

### WS-F — Deploy & CI

| # | Task                                                                | Acceptance                                                                                                                       | Effort | Deps   | Specialist     |
|---|---------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------|--------|--------|----------------|
| F1 | `.github/workflows/pages.yml` — build `web/`, deploy via `actions/deploy-pages` | Push to `main` builds and publishes; Pages URL loads the SPA.                                                                    | M      | B1     | devops/Pages   |
| F2 | `.github/workflows/ci.yml` — typecheck, lint, unit tests on PR      | Required check on PRs; runs in <2 min.                                                                                           | S      | B1     | devops         |
| F3 | Repo settings — enable Pages (GitHub Actions source), branch protection on `main` (optional for PoC) | Pages enabled; Joe can still push to `main` for the demo (rules off or admin-bypass for PoC).                                    | S      | F1     | devops         |

### WS-G — Docs & demo

| # | Task                                                          | Acceptance                                                                          | Effort | Deps  | Specialist |
|---|---------------------------------------------------------------|-------------------------------------------------------------------------------------|--------|-------|------------|
| G1 | `docs/overview.md`, `docs/architecture.md` (public mirror)    | Mirrors `.copilot-tracking/plans/architecture.md` minus internal notes.             | S      | —     | docs       |
| G2 | `docs/contract-model.md` — ODCS + `pocMeta`                   | Tables + worked example.                                                            | S      | A2    | docs       |
| G3 | `docs/approval-workflow.md` — annotated screenshots           | Captures the 2-step workflow with timestamps.                                       | M      | D5    | docs       |
| G4 | `docs/apim-handoff.md` — boundary doc for APIM team           | Raw URL patterns, polling vs webhook options, caveats.                              | S      | —     | docs       |
| G5 | `docs/demo-script.md` — 7-minute Monday walkthrough           | Step-by-step script: paste PAT → edit → submit → approve → open raw URL.            | S      | G3    | docs       |

### Suggested order of attack (3 days)

- **Day 1 (Fri):** A1–A4, B1–B4, F1, C1, C3.
- **Day 2 (weekend buffer / Sun):** C2, C4, C5, D1, D2, D3, E1, E2, G4.
- **Day 3 (Mon AM):** D4, D5, D6, G5, rehearsal.

---

## 3. Risks & mitigations

| Risk                                                                                                  | Likelihood | Impact | Mitigation                                                                                                                              |
|-------------------------------------------------------------------------------------------------------|-----------|--------|-----------------------------------------------------------------------------------------------------------------------------------------|
| PAT scope/UX is confusing or attendees worry about security                                            | High      | Med    | Settings page shows the *exact* fine-grained PAT scopes required + screenshot; doc clearly labels this as a PoC shortcut and lists the production path (OAuth App). |
| ODCS JSON Schema is not stable / hosted under a churning URL                                          | Med       | High   | Vendor the schema into `web/src/assets/odcs.schema.json` at a pinned version; `lib/odcs.ts` uses the vendored copy. Re-pull only on purpose. |
| raw.githubusercontent.com CDN cache delays the APIM team seeing the new version                       | High      | Low    | Document the ~5-min cache in `apim-handoff.md`; recommend they prefer the immutable `<version>.yaml` URL over `index.json`.             |
| Tree-API atomic commit fails mid-flight (network, 409, rate limit)                                    | Low       | High   | All-or-nothing semantics by design — tree API either commits all four files or none. UI surfaces error + Retry; no partial state on disk. |
| Two browser tabs approving the same contract collide                                                  | Low       | Med    | Single-user PoC. Octokit `PUT` uses the latest blob SHA; on 409, UI shows "out of date, refresh" instead of clobbering.                  |
| Monaco bundle size blows out the Pages build                                                          | Med       | Low    | Use `@monaco-editor/react` with on-demand worker loading; accept first-load weight for the PoC.                                          |
| GitHub Pages workflow misconfigured (404 on refresh of SPA routes)                                    | Med       | Med    | Ship a `404.html` that loads the SPA; or use `HashRouter` for the PoC to side-step the issue entirely.                                   |
| SemVer heuristic flags the wrong bump and Joe accepts it during the demo                              | Med       | Low    | Always show a one-line *reason* for the suggestion next to the override radios; default to the heuristic but require explicit click.    |

---

## 4. Open questions for Joe

1. **Repo visibility for the workshop:** can `joebent23/dft-av-contract-management` be **public** (so the APIM team can read raw URLs without a token and the Pages URL is shareable), or must it stay private?
2. **PAT acceptance:** are you comfortable demoing with a fine-grained PAT pasted into `localStorage`, or do we need to hide the token field and pre-load it via a build-time env var for the demo only?
3. **Seed contracts beyond the two examples:** confirm `av-incident-report` and `r155-cyber-notification` are the right two for Monday — or name two others from VCA/CCAV/DVSA/DVLA/NUiCO/ASDE that would land better with the audience.
