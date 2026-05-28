# APIM handoff

> The APIM team owns the intake validation layer. **This repo is the upstream source** of
> data contracts they consume. Nothing in this repo provisions, configures, or talks to
> APIM directly.

## What the APIM team consumes

Two raw HTTPS endpoints, both served by `raw.githubusercontent.com` with no auth required
(provided this repo is public; if private, GitHub raw URLs require a token):

### 1. Index of latest approved versions

```
https://raw.githubusercontent.com/joebent23/dft-av-contract-management/main/contracts/approved/index.json
```

Shape:

```json
{
  "generatedAt": "2026-05-30T14:05:47Z",
  "contracts": {
    "av-incident-report": {
      "latest": "1.1.0",
      "url": "https://raw.githubusercontent.com/joebent23/dft-av-contract-management/main/contracts/approved/av-incident-report/1.1.0.yaml",
      "sha": "<git-blob-sha>",
      "approvedAt": "2026-05-30T14:05:47Z"
    },
    "r155-cyber-notification": { "latest": "1.0.0", "url": "...", "sha": "...", "approvedAt": "..." }
  }
}
```

### 2. Specific contract version (immutable)

```
https://raw.githubusercontent.com/joebent23/dft-av-contract-management/main/contracts/approved/<contractId>/<version>.yaml
```

Once published, this URL's content **never changes** — the file is treated as immutable
by convention (a new version means a new file path). APIM-side caches can be aggressive.

## Recommended patterns for the APIM team

### Polling

- Poll `index.json` on a short interval (e.g. every 1–5 minutes).
- Use the GitHub raw `ETag` or the embedded `sha` to detect changes cheaply.
- When `<contractId>.latest` changes, fetch the new versioned YAML and pin it.

### Webhooks (better, post-PoC)

A repo webhook on `push` to `main` filtered to paths under `contracts/approved/**` would
notify the APIM team in seconds. Not implemented in the PoC.

### Validation contract

- APIM-side parsers should treat unknown ODCS fields as forwards-compatible.
- The `pocMeta` block is **stripped** from approved files before publishing (only
  `pocMeta.submittingAgency` and `pocMeta.submissionType` are retained for downstream
  routing).
- Validate against the published ODCS JSON Schema for `apiVersion`.

## Caching gotchas

- `raw.githubusercontent.com` has its own CDN cache (~5 minutes typically). Reads
  immediately after an approval may serve the previous version briefly.
- For low-latency rollouts, switch to a webhook or pull from the GitHub API
  (`/repos/.../contents/...`) which bypasses the raw CDN.

## SHA / integrity

Every entry in `index.json` includes the git blob SHA of the YAML file. Consumers can
verify they fetched the exact bytes the approver signed off by recomputing the git blob
SHA locally (`git hash-object <file>`) and comparing.
