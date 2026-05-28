# Repository Layout

Single repo. No backend. Everything below lives in `joebent23/dft-av-contract-management`.

```
dft-av-contract-management/
├── .github/
│   ├── workflows/
│   │   ├── pages.yml                 # Build web/ and deploy to GitHub Pages on push to main
│   │   └── ci.yml                    # Typecheck / lint / unit tests on PRs
│   └── CODEOWNERS                    # joebent23 owns contracts/** for the PoC
├── .copilot-tracking/
│   └── plans/
│       ├── architecture.md           # This PoC's architecture (see file)
│       ├── implementation-plan.md    # Workstreams, MVP cut-line, risks
│       └── repo-layout.md            # This file
├── contracts/
│   ├── drafts/
│   │   ├── .gitkeep                  # Keeps the directory tracked when empty
│   │   └── <contractId>.yaml         # Mutable draft. pocMeta.status ∈ draft|pending_approval|published
│   └── approved/
│       ├── index.json                # Generated: { id → { latest, versions[], updatedAt, rawUrl } }
│       └── <contractId>/
│           └── <version>.yaml        # Immutable approved version. Written by the atomic approve commit.
├── audit/
│   └── approvals.jsonl               # Append-only audit log. One JSON object per submit/approve event.
├── docs/
│   ├── overview.md                   # Public-facing intro to the PoC and its scope
│   ├── architecture.md               # Public mirror of the plan's architecture (minus internal notes)
│   ├── contract-model.md             # ODCS + pocMeta extension, worked example
│   ├── approval-workflow.md          # The 2-step submit → approve flow, with screenshots
│   ├── apim-handoff.md               # Raw URL contract + polling/webhook recommendations
│   └── demo-script.md                # 7-minute workshop walkthrough
├── web/                              # The SPA. Deployed by .github/workflows/pages.yml
│   ├── index.html
│   ├── package.json                  # vite, react, ts, tailwind, shadcn/ui, monaco, octokit, js-yaml, ajv, semver
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── postcss.config.js
│   ├── public/
│   │   └── 404.html                  # SPA fallback so deep-links don't 404 on GitHub Pages
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── routes/
│       │   ├── ContractsList.tsx
│       │   ├── ContractEdit.tsx
│       │   ├── Audit.tsx
│       │   └── Settings.tsx
│       ├── components/
│       │   ├── YamlEditor.tsx        # Monaco wrapper with ODCS validation markers
│       │   ├── ApproveDialog.tsx     # Diff summary + SemVer bump picker
│       │   ├── StatusBadge.tsx
│       │   └── ui/                   # shadcn-generated primitives
│       ├── lib/
│       │   ├── octokit.ts            # Singleton octokit configured from stored PAT
│       │   ├── odcs.ts               # ajv validate(yamlString) against vendored ODCS JSON Schema
│       │   ├── semverBump.ts         # ODCS-aware diff → suggested bump + reason
│       │   ├── treeCommit.ts         # Atomic 4-file git tree commit for approve
│       │   ├── repoPaths.ts          # Path helpers for drafts/approved/audit
│       │   └── token.ts              # localStorage get/set/clear + scope-check helper
│       └── assets/
│           └── odcs.schema.json      # Vendored ODCS JSON Schema, pinned version
├── .editorconfig                     # LF, UTF-8, 2-space for ts/tsx/json/yaml
├── .gitattributes                    # *.yaml text eol=lf
├── .gitignore                        # node_modules, web/dist, .env*, .DS_Store
├── LICENSE                           # MIT (PoC)
└── README.md                         # See outline below
```

## README outline

The README is the single entry point for someone landing on the repo cold. Outline (sections only — content to be written in WS-G):

- **What this is** — one paragraph: GitHub-native PoC for managing AV data contracts in ODCS YAML, with a browser SPA hosted on GitHub Pages writing directly to this repo via the GitHub API.
- **Quick start** — paste a fine-grained PAT into Settings, browse to the demo Pages URL, edit a draft, submit, approve. Local dev: `cd web && npm i && npm run dev`.
- **Contract lifecycle** — draft → pending_approval → published, with the SemVer bump step and the resulting immutable file under `contracts/approved/<id>/<version>.yaml`.
- **For consumers** — the raw URL contract (immutable per-version URL and the mutable `index.json` latest-pointer), plus a note that downstream API publication is owned by the APIM team and out of scope here.
- **Roadmap** — what's deferred post-workshop (OAuth App, multi-approver, webhooks, richer linting).
- **Discovery references** — links to the research report on UK AV regulatory actors (VCA, CCAV, DVSA, DVLA, NUiCOs, ASDEs) and to the ODCS spec.
