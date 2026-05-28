# Overview

## Problem

The UK Department for Transport's Autonomous Vehicles programme will receive structured
data submissions from many agencies (VCA, CCAV, DVSA, DVLA, NUiCOs, ASDEs, police, MIB,
local authorities, Strategic Highways Co.) across **seven canonical submission types**
(incident reports, R155 cyber notifications, in-use safety performance, etc.).

Each submission type needs a **data contract** — a machine-readable, versioned
specification of the schema, quality expectations, ownership, and service levels.
Producers and consumers must agree, the contract must be reviewable by humans, and
downstream systems (notably the APIM-fronted intake) must be able to validate against it.

## Why GitHub-native for the PoC

For the workshop demo we need to prove the **workflow** — author → review → approve →
publish → consume — not the production platform. A pure-GitHub PoC:

- Zero cloud spend, zero infra to provision, zero credentials to rotate.
- Built-in audit trail (commit history, tags, releases).
- Built-in CDN-like distribution (`raw.githubusercontent.com`).
- Familiar tooling (PRs, diffs, blame, history) if we ever want to drop into "raw" mode.
- Lets us spend our 3 days on the **UX of the approval workflow** and the **ODCS data
  model**, not on cloud plumbing.

The production target (post-PoC) is the Soda / Fabric / Purview pattern documented in the
discovery materials — that's a separate engagement.

## In scope (PoC)

- A static SPA hosted on GitHub Pages from this repo.
- ODCS YAML contracts stored in the repo.
- A 2-step approval workflow with timestamps and an audit log.
- SemVer versioning with git tags.
- Two seeded worked examples.
- Documentation of the handoff URL pattern for the APIM team.

## Out of scope (PoC)

- The APIM intake layer itself (separate team / workstream).
- Soda / Fabric / Purview integration.
- Multi-approver or policy-driven approval rules.
- Production identity (Entra, OAuth App, etc.).
- Long-term durability, backup, DR, or compliance evidence.

## Success criteria for the workshop

1. Joe demos the full lifecycle in under 10 minutes on shared Wi-Fi.
2. At least one workshop participant can navigate to a raw approved contract URL and
   describe what their team would do with it.
3. The repo + Pages URL is shareable as a take-away artefact.
