# DFT-AV Contract Management — Discovery Research

**Audience:** planning agent + Joe (human).
**Generated:** read-only analysis of `C:\Users\joebent\OneDrive - Microsoft\Documents\Customers\DFT\DFT-AV\discovery\`.
**Proposed solution under assessment:** Next.js + TS editor on Azure Static Web Apps with Functions API; CRUD JSON Schema data contracts; browse by submission type / submitting agency; version history; single-approver flow; publish to versioned GitHub Gist via GitHub App; APIM + ingest Function pull contracts from the Gist and validate inbound submitter payloads against them; Entra ID for editors, APIM subscription keys for submitting agencies.

---

## 1. Executive summary

- **Workshop is Monday 1 June 2026** (briefing's "Monday 1st" + repeated "June 1 PoC" deadline across the data-contract packs). Audience ~10–12 from DfT, Kainos and Arup: Josh & Isabelle morning only, technical delivery team all day.
- **Microsoft has no productised "data contract" object.** Discovery's consistent line: assemble Purview data products + Purview DQ + Fabric Git + workflows. A business-user CRUD editor for contracts is therefore a **genuine gap**, and the proposed app legitimately fills it.
- **Scope frame is the "orange box" of Figure 1**: Data Contract Management, DQ, Transformation, Integration. The proposed app targets capability 1 (Data Contract Management) only; that is intentional and consistent with the brief.
- **Discovery's prescribed contract format is ODCS YAML** (Bitol / Open Data Contract Standard), not raw JSON Schema. JSON Schema is treated as one of several *generated artefacts* (alongside Soda contracts, view DDL, GraphQL manifests). Storing the **raw schema body as JSON Schema is workable for PoC but diverges from the strategic line**.
- **APIM `validate-content` against JSON Schema is on-pattern** — it is exactly the Lane 1 ingest control described in `push-intake-architecture.md` (max 4 MB schema, max 4 MB payload, action `prevent` in prod / `detect` in sandbox).
- **Gist-as-distribution is novel and unsupported by discovery.** No mention of Gist anywhere. Discovery's distribution path is Git (Azure DevOps or GitHub) + `fabric-cicd` + Purview surfacing. Gist works mechanically but bypasses the Purview/Soda/Fabric assembly the workshop will pitch.
- **Five named submitting agencies**: VCA, CCAV (inside DfT), DVSA, DVLA, NUiCOs + ASDEs (treated as a co-equal pair for runtime data). Plus police (s.40), MIB, local authorities and Strategic Highways Co. for the in-use regime.
- **Submission types fall into seven canonical scenarios** (per `push-intake-architecture.md` §1): per-incident crash report, R155 cyber notification, police s.40 report, quarterly operational return, annual disengagement/safety report, live location telemetry, partner CDC push.
- **Single-approver PoC is reasonable**; Purview's native workflows are now GA (Jan 2026) but require domain-scoping and have approver limits that don't fit a 3-day demo.
- **Auth split (Entra for editors, APIM subscription keys for submitters) is the *fallback* discovery names** — acceptable for PoC, but discovery's preferred submitter auth is OAuth2 (large ASDE), mTLS (police RMS) or HMRC-MTD-style Approved Software Supplier. Sub-keys should be framed as "PoC simplification".
- **Workshop fit: AMBER** — the app addresses a real gap and the APIM-validate angle lands one of the four orange-box capabilities, but JSON Schema (not ODCS) and Gist (not Git/Purview) put it slightly off the strategic line, and there are ≈3 calendar days to build it.

## 2. Workshop fit assessment

| Dimension | Detail |
|---|---|
| Date | **Monday 1 June 2026** (briefing) |
| Audience | ~10–12 from DfT / Kainos / Arup. Josh & Isabelle leave at lunch; technical delivery team all day. |
| Hero artefact | `SI-INV-2025-0001` (M4 incident, Pennine NUiCO, NB25 XKT). |
| Orange-box capability addressed by this app | **A — Data Contract Management** (the others — DQ, Transformation, Integration — are covered by Purview DQ + Fabric medallion + the four-lane intake highway already drawn elsewhere). |
| Format | Live demonstrator + report. App can be a 5–10 minute slot inside Act 3 ("How do partners actually get data in?") or Act 5 ("What are you still deciding?"). |

### MUST-demo (to land a credible "Data Contract Management" story)

- Create / edit / version a contract for one DfT-recognisable submission type (recommend **NUiCO Quarterly Operational Return** — it is the highest-volume regular submission and DfT will recognise it from the Pennine/M4 narrative).
- Single approver sign-off → status moves to `approved` with semver bump captured.
- Publish artefact (the Gist write, or whatever distribution mechanism replaces it) — show version pin and immutability.
- Submitter call: a curl to APIM declaring `X-Contract-Version` → APIM resolves schema → `validate-content` accepts a good payload (HTTP 202 + correlation ID) and rejects a malformed one (HTTP 400 with field-level error).
- View version history side-by-side; show the diff that caused the bump.

### Stretch (only if MUST works two days before the workshop)

- Browse by submission type *and* by submitting agency (e.g. filter to DVSA-issued contracts only).
- Show a generated artefact alongside the JSON Schema (e.g. a Soda contract or view DDL) to bridge into the broader assembly story.
- Pre-stage a "live breaking change" moment — same flow as the soda-fabric-purview pattern's Step 4.6.
- Power BI / Purview surface showing the published contract and its consumers (lands M1 + L3 from the brief).

### Verdict — **AMBER**

Rationale (two lines):

1. The app fills a real gap (Microsoft has no contract-editor product) and APIM `validate-content` is exactly the Lane 1 control the workshop will pitch — so the demo will land *if* the build is in time.
2. Two strategic frictions: **JSON Schema vs ODCS** (discovery's source-of-truth choice) and **Gist vs Git+Purview/fabric-cicd** (discovery's distribution path); plus ≈3 calendar days of build for an end-to-end editor + GitHub App + APIM policy + ingest function — schedule is the dominant risk, not architecture.

To move to GREEN: pick one canonical submission type, bake the JSON Schema body inside a wrapper that can later be regenerated from ODCS, and have a recorded fallback video for every demo step.

## 3. Submitting agencies and submission types

Compiled from `workshop-briefing-for-joe.md` §2.5, `push-intake-architecture.md` §1, `data-analysis/data-catalogue.md`, and `international-reporting-cross-walk.md`.

| Agency / actor | Role (DE-relevant) | Submission types (DfT-direction) | Payload shape | Frequency | Key pain points / data risks | Source(s) |
|---|---|---|---|---|---|---|
| **VCA** | Product registry — type approvals & recalls | Type Approval Certificate (`VCA-TAC-*`); R155 cyber notification, incident report, periodic CSMS report; recall notices (`VCA-REC-*`) | Header JSON + PDF sidecar; small structured event for R155 | Event-driven on approval/recall; quarterly/annual for CSMS | Free-text fields (`Weather Exclusions`); recall references must thread to all downstream surfaces | `data-catalogue.md` CSV-3, IN-04/05/06; `workshop-briefing-for-joe.md` §2.5 |
| **CCAV** (inside DfT) | Policy / rules engine — authorisations & ODD bounds | Authorisation records; ODD condition updates (SCD2); KPI publications; cross-process transaction log | Header JSON + PDF (auth); CSV (KPI / TXN log); JSON summary | Event-driven (auth); quarterly (KPI / TXN) | KPI percentages sum to 100.1 (rounding); DT-reference list uses both en-dash ranges and comma lists — silver needs normalisation | `data-catalogue.md` CSV-1, CSV-2, JSON-1 |
| **DVSA** | Operator management — NUiCO licences, APS permits, fleet audits, route performance | NUiCO Operator Licence; APS Permit Application + Operating Centre Form + Checklist; annual fleet audit; per-route performance | PDF + header (licence, permits); CSV (fleet audit, route perf) | Annual (audit); event-driven (licence, permit); periodic (perf) | Pennine `Recall Exposure="Yes (resolved)"` with `Status=ACTIVE` is the keystone DQ poison row; permit register only covers 4 of 6 NUiCOs | `data-catalogue.md` CSV-4, CSV-5, CSV-6, IN-01/02/03 |
| **DVLA** | Vehicle instance registry — V5C, type-approval mirror | Type Approval Register mirror; AV-flag updates per s.10 register link | CSV (TA register); structured push events | Continuous mirror; event-driven (flag) | Date column is UK long-form; needs `to_date(..., 'd MMMM yyyy')` in Silver | `data-catalogue.md` CSV-3; `push-intake-architecture.md` Lane 1 |
| **NUiCOs** (6 named) | Runtime producers — operator-side data | Quarterly Operational Return (CPUC-style: VMT, deadhead miles, dwell time, occupancy, stoppages, disaggregated incidents); per-incident report; APS permit application | Bulk Excel / CSV; structured JSON for incidents | Quarterly (return); event-driven (incident); annual | Multi-MB Excel; schema-stable across periods; CPUC GO 66-D-style "preserve schema, mask cells" required for confidential cells | `push-intake-architecture.md` §1 row 4; `international-reporting-cross-walk.md` §1.2 |
| **ASDEs** (4 named: Novaris, Meridian, Solaris, Crestline) | Runtime producers — AI-driver vendors | Per-incident crash report (NHTSA-SGO-style 107-col); annual disengagement / safety report; ADS software-version updates; ISMR Annex 4 short-term + Annex 5 periodic; behavioural competency framework | Structured JSON (incident, R155); PDF + supporting binaries (disengagement); Parquet CDC (org-scale operators); telemetry streams | Event-driven (incident, R155); annual (disengagement); periodic (ISMR); real-time (telemetry per APS Regs reg.10) | High-volume; Activator cannot email external addresses → GOV.UK Notify bridge needed; Open Mirroring schema-evolution restrictions on type changes | `push-intake-architecture.md` §1 rows 1, 5, 6, 7; `international-reporting-cross-walk.md` §1.1; addendum `IN-04..09` |
| **Police** (43 forces) | s.40 reporter — collisions, stops, seizures (s.58) | s.40 incident report | Structured form (RMS-integrated forces) or manual entry (smaller forces) | Event-driven | Mixed IT maturity (NICHE/STORM at large forces; nothing at smaller); legacy systems need mTLS not OAuth | `push-intake-architecture.md` §1 row 3 |
| **MIB / Insurers** (consumers, but also filers) | Insurance claim filings; DSSAD/EDR requests | Structured filings | Periodic / event-driven | Confidentiality + cross-tenant governance gap (External Data Sharing) | `workshop-briefing-for-joe.md` §2.2 |
| **Local Authorities / Strategic Highways Co. / Devolved Ministers** | s.40 reporting under in-use regime | Structured / form-based incident & infrastructure reports | Event-driven | Heterogeneous IT maturity | `push-intake-architecture.md` §1 row 3 |

**Catalogue counts** (from `data-analysis/data-catalogue.md`): 4 ASDEs, 6 NUiCOs, 8 vehicle models, 40 vehicles, 8 APS routes, 576 transactions, 1 hero incident. **Markup folder is canonical** (129 files); `Service_Design` archive is *not* a pipeline source.

## 4. Data contract requirements

What a contract record in this app needs to capture, mapped to discovery prescriptions.

| Field / capability | Why required | Discovery source | JSON-Schema-only risk? |
|---|---|---|---|
| **Contract ID** (e.g. `dft.av.nuico_quarterly_return.v1`) | Stable handle across versions; used in `X-Contract-Version` header | `data-contract-deep-dive.md` Q5 ODCS example | None |
| **Schema body** (JSON Schema 2020-12 or Draft-07) | Runtime validation at APIM via `validate-content` | `push-intake-architecture.md` Lane 1 §2.2 | OK — but document the mapping path to ODCS so the schema body is not a one-way street |
| **Submission type** (incident / quarterly / cyber / disengagement / telemetry / CDC / police s.40) | Browse + routing key; ties to the seven canonical scenarios | `push-intake-architecture.md` §1 | None |
| **Submitting agency** (VCA / CCAV / DVSA / DVLA / NUiCO / ASDE / Police / MIB / LA) | Browse + governance; per-agency rate limits and onboarding state | `workshop-briefing-for-joe.md` §2.5; `push-intake-architecture.md` §2.3 auth tree | None |
| **Semver version** (`MAJOR.MINOR.PATCH`) | Breaking-change discipline; consumers pin by version | `data-contract-deep-dive.md` Q5 — *"refuse to issue breaking changes without `--allow-breaking` flag"* | None |
| **Breaking-change flag + rationale** | Forces explicit MAJOR bumps; audit trail | `data-contract-deep-dive.md` Q5 versioning section | None |
| **Change log per version** (free text + diff) | M2 traceability requirement from the customer brief | `workshop-master-pack-v2.md` §1.3 | None |
| **Owner / steward** (Entra user or group) + **producer team** | ODCS `team.members` with `role: owner` drives notification routing | `data-contract-deep-dive.md` Q6 — *"ODCS v3+ has a structured `team` block"* | None — but JSON Schema has no native `team` notion; carry it in the wrapper outside the `schema` field |
| **Status** (`draft` / `in_review` / `approved` / `superseded` / `deprecated`) | Approval gate + lifecycle | `workshop-master-pack-v2.md` §2.1 row "Endorsement" | None |
| **Approver + approval timestamp** | Audit + accountability (brief M2) | Brief M2 | None |
| **Quality rules** (per column + table-level: NotNull, unique, range, regex, valid values, freshness, custom SQL) | Drive Soda contract generation; not validatable purely via JSON Schema | `data-contract-deep-dive.md` Q6 + `soda-fabric-purview-pattern.md` ODCS→Soda mapping | **YES** — JSON Schema is too thin for `freshness`, `customRule: SQL`, `referentialIntegrity`. Store outside the schema body or in `x-*` extensions and flag in report. |
| **SLA / refresh frequency / max latency** | ODCS metadata; not enforceable by JSON Schema | `soda-fabric-purview-pattern.md` Soda contract YAML example; addendum §1 (workflows) | **YES** — same as above; carry as sidecar metadata |
| **Critical Data Element (CDE) mappings** (Vehicle Registration Mark, VIN, ASDE Reference, NUiCO Licence Reference, DT Reference) | Cross-process identifiers — Purview CDE Preview, directly answers brief M3 | `data-contracts-addendum.md` §2 | **YES** for pure JSON Schema. Treat as separate metadata fields the app holds. |
| **Sensitivity classification** (PUBLIC / OFFICIAL / OFFICIAL-SENSITIVE + secondary flags SAFETY-CRITICAL, COMMERCIAL-CONFIDENTIAL, PERSONAL) | Required for access control + Release Zone projection decisions | `data-analysis/data-catalogue.md` columns include `primary_sensitivity_tier` + `secondary_sensitivity_flags` | None — sidecar field |
| **Retention policy** (e.g. APS-aligned 7-year audit retention) | Brief L2 "retention/disposal" | `workshop-master-pack-v2.md` Exec Summary L2 | None |
| **Distribution pointer** (Gist URL + commit SHA, or raw Git URL) | Lets APIM / ingest Function resolve schema by version | This research | Important to expose explicitly, not derive at request time |

### Conflicts with the JSON Schema choice — summarised

- JSON Schema can express **structural** validity but not **operational** quality (freshness, referential integrity within a data source, custom SQL, anomaly thresholds). Discovery's prescribed contract language is ODCS YAML precisely because it bundles `schema`, `quality`, `team`, `sla`, `customProperties`.
- Recommendation for the planning agent: model the database row as `{ id, version, status, agency, submission_type, owner, change_log, sensitivity, retention, schema_body (JSON Schema), quality_rules[], sla, cde_mappings[], distribution }`. The `schema_body` field is the JSON Schema; everything else is sidecar metadata the editor app owns. This preserves a clean upgrade path to ODCS later — the app's record is essentially an ODCS document with the schema slot pre-filled in JSON Schema.

## 5. Versioning & Gist strategy — confirm or challenge

The proposed shape: approved contracts published to a versioned GitHub Gist via a GitHub App installation token; APIM and the ingest Function pull contracts from the Gist.

**Mechanical viability (confirmed):**

- A Gist is just a Git repo with a small filename limit and a single owner. It supports versioning, raw HTTPS access (`https://gist.githubusercontent.com/.../raw/<sha>/<filename>`), and atomic file updates per commit.
- APIM `<choose>` policy can read a header (`X-Contract-Version`) and `<send-request>` to fetch the schema raw URL, then pipe into `<validate-content>`.

**Risks and friction (worth challenging):**

| Concern | Detail | Mitigation |
|---|---|---|
| **Atomicity across multiple files** | A "publish" of contract `nuico.v2` is one Gist file update; if you change two contracts at once and one push fails, you have a torn state. | Treat each contract as a single Gist; or use one Git repo and never multi-write atomically. |
| **Rate limits** | Authenticated GitHub API: 5,000 req/hour per token; raw Gist HTTPS via the unauth CDN has no public RPS cap but is **not SLA-backed**. APIM would hit raw URLs on every request unless cached. | Cache schemas in APIM via `<cache-store>` keyed on `(contract-id, version)`; pre-warm on publish. |
| **Size** | Single Gist file cap is 1 MB by web UI / 100 MB raw. APIM `<validate-content>` max schema is **4 MB** (per `data-contract-deep-dive.md` cited Learn doc on `validate-content`), so even APIM is the smaller cap. | Reject schemas > 4 MB at editor save-time. |
| **Distribution is opaque to Purview/Soda/Fabric** | Discovery's whole assembly pattern (Purview data products, Soda Cloud, Fabric Git, fabric-cicd) reads from Git repos and ODCS YAML — none of it natively knows about Gist. | OK for PoC (gist is a fast distribution sidecar); flag in report that production should be Git + fabric-cicd + Purview. |
| **GitHub App auth at runtime** | APIM in production should not be calling out to GitHub on every request. Cold cache + GitHub outage = ingest outage. | Always cache; consider mirroring the active version set into an APIM Named Value or Azure Blob with SAS for a defence-in-depth fallback. |
| **Audit / immutability** | Gist commits are mutable by the owner (history is preserved but the head can move). Brief L3 wants immutable logs. | Snapshot each approved version to Blob with WORM (immutable storage policy) at publish-time as the evidential copy. |
| **Cross-tenant access** | Gist auth uses the GitHub App's installation token; APIM principal is service identity. Submitting agencies don't read the Gist directly. | Acceptable. |
| **Single-owner SPOF** | The GitHub App installation is tied to one GitHub org. Loss of GitHub access = no new publishes. | Document break-glass: a manual upload to Blob fallback that APIM also checks. |

**Verdict:** Gist works for PoC and is fast to wire. For production, recommend pivoting distribution to a proper Git repo + Blob mirror + APIM cache, and the schema source-of-truth from JSON Schema to ODCS YAML.

## 6. APIM validation pattern

Reference flow the workshop should be able to walk:

1. Submitter calls `POST https://<apim>/ingest/{submission-type}` with header `X-Contract-Version: 1.4.0` and APIM subscription key.
2. APIM inbound policy:
   - `<validate-jwt>` (skipped for PoC — sub-key only) **or** `<rate-limit-by-key>` keyed on subscription / org claim. Per `push-intake-architecture.md` §2.2 the canonical pattern keys on `orgId` from JWT — sub-key fallback is acceptable but should be flagged.
   - `<cache-lookup-value>` on `(submission-type, version)` to retrieve the schema body. On miss, `<send-request>` to Gist raw URL using the GitHub App installation token, then `<cache-store-value>` for ≥1 hour.
   - `<validate-content>` policy: `unspecified-content-type-action="prevent"`, `max-size="<= 4194304>"`, `<content type="application/json" validate-as="json" schema-id="resolved-schema" action="prevent"/>`. (Per `data-contract-deep-dive.md` Q1 referenced Learn doc on `validate-content`.)
   - On success: forward to ingest Function (or Event Grid topic per the canonical push-pattern architecture); return HTTP 202 + `Location` header for status polling + correlation ID.
   - On failure: HTTP 400 with field-level error per JSON Schema; record into a quarantine / DLQ for the submitting agency to inspect.
3. Ingest Function writes raw payload + `X-Contract-Version` + `submission_id` to Bronze quarantine path (per `data-contract-deep-dive.md` Q2 hybrid A+B quarantine pattern), then merges PASS rows to Bronze main.

### Risks

| Risk | Detail | Mitigation |
|---|---|---|
| **Schema resolution failure** | Gist outage / token expiry mid-request. | Pre-warm cache on publish; APIM falls back to last-known-good cached version with header `X-Contract-Stale: true`. |
| **Version drift between APIM and ingest Function** | If they cache independently with different TTLs, APIM might validate against v1.4.0 while Function thinks the body is v1.3.0. | Single canonical source; Function reads the `X-Contract-Version` from the inbound header (echoed by APIM) and validates a *second* time on the Function side from the same cache for defence in depth. |
| **`validate-content` performance** | Per Microsoft docs, schema and payload each capped at 4 MB; JSON Schema with deep refs slows validation. | Keep schemas compact; flatten `$ref` at publish time; reject large schemas at editor save. |
| **Multi-region APIM cache divergence** | `rate-limit-by-key` counters are per-regional gateway (verbatim from `push-intake-architecture.md` §2.2). The same applies to `<cache-store-value>` unless using an external Redis cache. | Use Azure Cache for Redis as APIM external cache for cross-region consistency, or accept per-region warm-up for PoC. |
| **No JWT in PoC** | Sub-key only loses the per-org claim used for fine-grained rate-limit. | Acceptable for PoC; flag as production gap with HMRC-MTD-style OAuth2 / Approved Software Supplier as the upgrade. |
| **Contract version pinning** | If a submitter never updates, deprecated contracts must still resolve. | Editor should support `deprecated` status (still resolvable, returns `Warning` header) and `withdrawn` (resolves to 410 Gone). |
| **No deep DQ at the gate** | JSON Schema catches shape; freshness / referential integrity / business rules don't run at APIM. | Pair with the Soda gate / Purview DQ in Bronze (already in `data-contract-deep-dive.md` Q2). |

## 7. Gaps & assumptions for the planning agent

1. **Contract format**: planning to assume **JSON Schema body + sidecar metadata** in the app's data model, with a documented future migration to ODCS YAML (a ~150–250 LOC generator could later emit Soda contracts and view DDL from the same record — pattern from `soda-fabric-purview-pattern.md`).
2. **Storage**: assume a small relational store (Cosmos DB SQL API or Azure SQL serverless) for contract records and version history; the editor's Functions API reads/writes here. The Gist is just the *published* artefact mirror.
3. **Distribution**: assume **Gist for PoC, with Blob WORM mirror** for evidential audit. Production should be Git + fabric-cicd + APIM external cache.
4. **Auth**: assume **Entra ID app registration** for editor users (Azure Static Web Apps built-in auth), **GitHub App installation** for Gist writes (token in Key Vault), **APIM subscription keys** for submitters (two keys per sub for rotation). JWT/OAuth2 path documented as production upgrade.
5. **Approval**: assume **single approver = any user in an Entra "Contract Approver" group**; approval action records `(approver_oid, ts, comment, semver_bump)` against the version. No multi-stage workflow.
6. **Submission types**: assume the **seven canonical scenarios** from `push-intake-architecture.md` §1 as the master enum, plus a free-text label per contract for fine-grained naming.
7. **Submitting agencies**: assume the **nine actors** from §3 above as the seed enum.
8. **Demo data**: assume **NUiCO Quarterly Operational Return** as the headline contract for the workshop (richest submission, ties to Pennine/M4 narrative, smallest validatable JSON Schema).
9. **Out of scope for PoC**: Purview/Soda/Fabric integration; multi-approver workflows; cross-tenant publication; consumer subscription/notification routing; non-JSON payload formats.
10. **Workshop role of this app**: a **5–10 minute slot** inside Act 3 ("partners actually get data in") or as a stand-alone Act 5 deep-dive on Data Contract Management. Not the whole workshop.

## 8. Open questions for Joe

1. **Workshop date confirm** — discovery has both *"Monday 1st (December 2025 — confirm month)"* in the briefing and *"June 1 PoC"* repeated across `data-contract-deep-dive.md` and `soda-fabric-purview-pattern.md`. Is the live workshop **Monday 1 June 2026** as treated here? (Affects schedule risk read.)
2. **JSON Schema vs ODCS** — happy to ship JSON-Schema-only for PoC and frame ODCS as the production upgrade path, or do you want the data model authored ODCS-first from day one (slower build, better strategic alignment)?
3. **Gist vs Git repo** — Gist is faster but invisible to Purview/Soda/fabric-cicd. Do you want the PoC distribution to be a **Gist + Blob WORM mirror** as proposed, or a **dedicated GitHub repo** (still GitHub App, still raw URL into APIM, but consumable by the broader assembly pattern later)?
4. **Approver identity** — single approver = "any member of an Entra group"? Or do you want the approver to be pinned per submission type (so e.g. DVSA contracts can only be approved by a DVSA-nominated person)?
5. **Submitter auth for the demo** — APIM subscription keys only, or do you want one demo path showing JWT/OAuth2 (e.g. a Wayve-flavoured stand-in)? Sub-key only is faster but discovery flags it as a PoC simplification, not the recommended pattern.

## 9. References

| File | One-line takeaway |
|---|---|
| `workshop-briefing-for-joe.md` | Workshop is Monday; orange-box scope; M4 incident is the hero artefact; presenter rhythm rules; cut list. |
| `workshop-master-pack-v2.md` | Maps the four orange-box capabilities to first-party Microsoft components; reconfirms the brief's four "must" and four "learn" themes. |
| `workshop-deep-research-pack.md` | (Skimmed; superseded by `workshop-master-pack-v2.md`.) |
| `data-contract-deep-dive.md` | Six implementation questions answered with citations — quarantine pattern, RTI feasibility, CI/CD via fabric-cicd, ODCS→GraphQL, granular blocking. **Strongest single reference for contract architecture.** |
| `data-contracts-addendum.md` | Five Microsoft shifts since Ignite 2025 (workflows GA, CDEs, DQ REST API, self-serve metadata model, bulk ops); three gaps unchanged (no contract object, consent-only access, no cross-tenant). |
| `data-contracts-internal-research.md` | Internal Microsoft Work IQ findings; the term "data contract" is internally used (MCS pattern) but not productised; Databricks-UC last-mile preview is the closest roadmap answer. |
| `push-intake-architecture.md` | The four-lane intake highway; seven canonical submission scenarios; APIM `validate-content` pattern (Lane 1); auth decision tree; UK gov precedents (HMRC MTD, DVSA OCI, NHS MESH, NUAR). |
| `soda-fabric-purview-pattern.md` | End-to-end Soda 4.0 + Fabric + Purview pattern; ODCS as Git source of truth, Soda generated at CI; native Soda→Purview integration exists (concierge Enterprise). |
| `international-reporting-cross-walk.md` | NHTSA SGO 107-col schema, CPUC quarterly, CA DMV OL 316/311R, Waymo Safety Hub — the shapes UK CFE is presumably consulting toward. |
| `data-analysis/data-catalogue.md` | Canonical Markup folder (129 files); 7 CSVs + 2 JSONs + ~60 PDF/header pairs; full column-level catalogue + sensitivity tiers; Pennine recall row identified as keystone DQ poison row. |
| `data-analysis/dt-mapping.csv` | (Listed, not deeply read — DT-reference mapping table.) |
| `data-analysis/join-graph.md`, `synthesis-specs.md` | (Listed, not deeply read — supporting modelling artefacts.) |
| `data-analysis/data-analysis-expert-prompt.md`, `organise-markup-by-agency.ps1` | (Listed, not deeply read — tooling.) |
