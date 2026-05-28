# Workshop demo script

> **Status:** placeholder. To be expanded once the SPA is functional.
> **Target:** Monday 1 June 2026, ~10–12 attendees (DfT / Kainos / Arup).
> **Time budget:** 8–10 minutes of live demo inside a longer discussion session.

## Run-of-show (draft)

1. **Frame** (30s) — "Data contracts are the agreement between submitters and the
   intake layer. This PoC shows the *authoring and approval* half. The APIM team owns
   what happens once a contract is published."
2. **Show the repo** (30s) — open the GitHub repo, point at `contracts/approved/`. Two
   seeded contracts: `av-incident-report`, `r155-cyber-notification`.
3. **Open the SPA** (15s) — Pages URL.
4. **List view** (30s) — show two approved, zero drafts. Click into one.
5. **Edit** (90s) — open `av-incident-report` as a new draft, add an optional field
   (`vehicleVin`), watch live ODCS validation.
6. **Submit for approval** (30s) — click button, status flips to *pending approval*,
   commit visible in repo.
7. **Approve** (60s) — open approve dialog, show suggested **minor** bump with the
   one-line rationale "added optional field `vehicleVin`", confirm.
8. **Show the published artefact** (45s) — copy raw URL, open in new tab, paste into
   chat for attendees.
9. **Audit log** (30s) — show the audit page, point at the two new lines.
10. **Boundary slide** (60s) — `docs/apim-handoff.md`: this is what the APIM team
    consumes. We're done at the raw URL.
11. **Q&A handoff** (remainder).

## Backup plan if Wi-Fi is bad

- Pages site cached locally via `pnpm preview`.
- A pre-recorded 90s screen capture as fallback.
- Print-out of `docs/apim-handoff.md` for the APIM contact.

## Pre-flight checklist (Sunday night)

- [ ] PAT generated, tested, saved to demo laptop's `localStorage`.
- [ ] Two seed contracts present and approved on `main`.
- [ ] Pages site loads on demo laptop and on phone hotspot.
- [ ] Repo is on the latest `main` and CI is green.
- [ ] `docs/apim-handoff.md` URL handy in clipboard manager.
