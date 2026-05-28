# Local development

## Prerequisites

- Node.js 20+ and pnpm 9+.
- A GitHub account with push access to this repo.
- A **fine-grained Personal Access Token** scoped to *this repo only* with:
  - `Contents: Read and write`
  - `Metadata: Read-only` (auto)
  - (Optional, for tag creation) `Contents` covers it.

Create one at <https://github.com/settings/personal-access-tokens/new>.

## Run

```bash
cd web
pnpm install
pnpm dev
# → http://localhost:5173
```

Open the **Settings** page in the SPA, paste your PAT, save. The token is stored in
`localStorage` under `dft-av-contracts.pat`. You can clear it at any time from the same
page or from your browser dev tools.

## Why a PAT in `localStorage`?

This is a **PoC simplification**. A production deployment would:

- Replace the PAT with a proper OAuth App "Sign in with GitHub" flow.
- Use a tiny token-exchange backend (Cloudflare Worker, Azure Function, anything) so
  client secrets and tokens never touch the browser.
- Scope tokens per-session, with short expiry.

For a single-approver workshop demo this is overkill, so we skip it.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| `401 Bad credentials` | PAT typo or PAT expired. Regenerate. |
| `403 Resource not accessible` | PAT missing `Contents: Read and write` on this repo. |
| Approval commit fails with `409` on tree update | Another commit landed between read and write. Pull and retry. |
| Pages site 404s after first deploy | First Pages deploy needs Pages enabled in repo Settings → Pages → "GitHub Actions". |

## Build

```bash
cd web
pnpm build       # outputs to web/dist
pnpm preview     # local preview of the production build
```

## CI / deploy

- `.github/workflows/ci.yml` runs lint, typecheck, and unit tests on every PR.
- `.github/workflows/pages.yml` builds `web/` and deploys to GitHub Pages on every push
  to `main`.
