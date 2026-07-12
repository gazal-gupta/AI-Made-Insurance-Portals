# Meridian MGA Portal

A Managing General Agent (MGA) portal demonstrating a **modular, API-first,
cloud-based platform built for delegated authority** — unifying policy
administration, underwriting, and accounting in one system.

## Modules

| Module | What it covers |
|---|---|
| **Dashboard** | GWP trend, capacity utilisation, loss ratio, aggregate alerts, activity feed |
| **Policy Lifecycle** | Quotes → binders → issuance → endorsements → renewals in one register, with real-time capacity checks on every bind |
| **Bordereaux** | Ingestion, validation and export of risk / premium / claims bordereaux in standard carrier formats (Lloyd's Coverholder v5.2, ACORD) |
| **Aggregates** | Line sizes, class restrictions and geographic limits tracked live against capacity treaties — binds that would breach capacity are blocked |
| **Commissions** | Base commission, carrier overrides and profit shares across multiple carriers, with distribution-hierarchy splits |
| **Claims & FNOL** | First Notice of Loss intake with automatic TPA routing, plus TPA integration health |
| **API Reference** | The REST surface every screen is built on — the "API-first" contract |

## Try these flows

1. **Aggregate blocking** — on *Policy Lifecycle*, bind quote `Q-10244`
   (Professional Lines): it is **blocked** because the Hannover Re treaty is at
   97.3% capacity. Bind `Q-10241` instead and watch utilisation update on the
   *Aggregates* page.
2. **Bordereau validation** — on *Bordereaux*, validate `BDX-2026-06-R`: it
   fails with one schema error and two warnings; apply auto-corrections to
   revalidate and unlock CSV export.
3. **FNOL** — on *Claims & FNOL*, submit the form: the claim is created and
   auto-routed to the correct TPA for the policy's line of business.

## Running locally

Static app, no build step:

```
python -m http.server 4519 --directory mga-portal
# then open http://localhost:4519
```

## Architecture notes

- Plain HTML/CSS/JS — `js/data.js` is the mock data layer; each collection maps
  1:1 to a REST resource listed in the API Reference view, so the UI can be
  re-pointed at live endpoints (e.g. InsureMO iComposer APIs) without
  structural changes.
- Light and dark theme via `prefers-color-scheme`; chart and status colors use
  a CVD-validated palette.
