# Architecture (public-facing)

> This is a distilled, public-facing version of the internal architecture notes at
> [`.copilot-tracking/plans/architecture.md`](../.copilot-tracking/plans/architecture.md).
> See that file for the full decision log and PoC-vs-production trade-offs.

## Assumption

The original brief said *"GitHub App hosts the UI"*. GitHub Apps cannot host UIs.
We're interpreting that as **GitHub Pages** — the simplest GitHub-native equivalent — and
treating the GitHub REST API (called from the browser via `@octokit/rest`) as the
"backend".

## Component view

```mermaid
flowchart LR
    User[Joe / approver]
    SPA["Static SPA<br/>(GitHub Pages)"]
    API[GitHub REST API]
    Repo[("This repo<br/>contracts/, audit/")]
    Raw["raw.githubusercontent.com"]
    APIM["APIM team<br/>(out of scope)"]

    User -->|browser| SPA
    SPA -->|octokit + PAT| API
    API --> Repo
    Repo -.->|served as raw files| Raw
    Raw -.->|consumed| APIM

    classDef oos stroke-dasharray: 4 4,color:#888;
    class APIM oos;
```

## Approval sequence

```mermaid
sequenceDiagram
    autonumber
    actor Joe
    participant SPA as SPA
    participant GH as GitHub API
    participant Repo as Repo files

    Joe->>SPA: Edit draft (Monaco YAML)
    SPA->>SPA: Live ODCS validation (ajv)
    Joe->>SPA: Submit for approval
    SPA->>GH: Commit drafts/<id>.yaml (status=pending_approval)
    GH->>Repo: Write
    Joe->>SPA: Approve (confirm SemVer bump)
    SPA->>GH: Single tree-API commit:<br/>approved/<id>/<v>.yaml + index.json + audit + draft status=published
    GH->>Repo: Atomic write
    SPA->>GH: Create tag <id>@<v>
    Note over Repo: Published file now at<br/>raw.githubusercontent.com/.../approved/<id>/<v>.yaml
```

## ODCS + `pocMeta`

We use [ODCS](https://bitol-io.github.io/open-data-contract-standard/) as-authored, plus
a small `pocMeta` block for workflow state. See
[contract-model.md](contract-model.md) for the full schema and a worked example.

## Boundary with APIM

The PoC ends at "published immutable YAML at a raw URL". See
[apim-handoff.md](apim-handoff.md) for the recommended consumption patterns.
