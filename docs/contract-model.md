# Contract model

We use the [Open Data Contract Standard (ODCS)](https://bitol-io.github.io/open-data-contract-standard/)
as the canonical contract format, stored as YAML.

For the PoC we add a small extension block, `pocMeta`, to carry workflow state.
`pocMeta` is **not part of ODCS** — production tooling should strip it before publishing
to downstream consumers, or migrate it to a separate sidecar file.

## Top-level fields we use

| Field | ODCS? | Purpose |
|---|---|---|
| `apiVersion` | yes | ODCS spec version (e.g. `v3.0.1`) |
| `kind` | yes | `DataContract` |
| `id` | yes | Stable contract identifier (e.g. `av-incident-report`) |
| `version` | yes | SemVer of this contract version |
| `status` | yes | ODCS lifecycle status (`draft`, `active`, `deprecated`, `retired`) |
| `name` | yes | Human title |
| `description.purpose` | yes | Why this contract exists |
| `description.usage` | yes | How consumers should use it |
| `description.limitations` | yes | Known caveats |
| `team` | yes | Owners and stewards |
| `schema` | yes | Logical schema (tables/columns/types) |
| `quality` | yes | Quality rules (free-form or SodaCL/Great Expectations) |
| `servers` | yes | Where the data lives (logical) |
| `pocMeta` | **no — PoC extension** | Workflow state (see below) |

## `pocMeta` extension

```yaml
pocMeta:
  status: draft | pending_approval | published
  submittingAgency: VCA | CCAV | DVSA | DVLA | NUiCO | ASDE | other
  submissionType: incident-report | r155-cyber-notification | in-use-safety | ...
  submittedBy: <github-login>
  submittedAt: <ISO-8601>
  approvedBy: <github-login>     # set on approval
  approvedAt: <ISO-8601>         # set on approval
  bumpReason: major | minor | patch — <one-line rationale>
```

## Worked example — `av-incident-report@1.0.0`

See [`contracts/approved/av-incident-report/1.0.0.yaml`](../contracts/approved/av-incident-report/1.0.0.yaml)
once seeded.

## Validation

The SPA validates drafts in-browser against the ODCS JSON Schema using `ajv`, and
additionally enforces:

- `id` matches `^[a-z0-9][a-z0-9-]*$`
- `version` is valid SemVer
- `pocMeta.submittingAgency` and `pocMeta.submissionType` are present
- Approved files are immutable — re-publishing the same `<id>/<version>` is rejected
  client-side and would also fail server-side because the file already exists.

## SemVer bump heuristic

Used by the *Approve* dialog to **suggest** a bump (always overridable):

| Change between latest-approved and current draft | Suggested bump |
|---|---|
| Removed field, changed required-ness to required, type change | **major** |
| Added optional field, added quality rule, added server | **minor** |
| Description-only, ownership change, `pocMeta` change | **patch** |
