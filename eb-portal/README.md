# Parivaar Assurance — Employee Benefits Sales Portal

A self-contained demo of the **Employee Benefits (EB) New Business Journey** — Group Medical
(GMC) and Group Term Life (GTL), sold via an assisted (Sales Executive / Broker-led) model.
Plain HTML/CSS/JS, no build step. Built from the *Employee Benefits New Business Journey —
Functional Requirements Document (v1.1)*: all 17 screens, the field-level specs, business
rules, validation rules, Approval Matrix, and Notification Matrix are implemented as live
interactions against an in-memory sample book, not static mockups.

## Run it

```
python -m http.server 4622 --directory eb-portal
# then open http://localhost:4622
```

## The journey

**Screen 1 (Dashboard)** is the landing page. **Screens 2–3** (Create Lead, Opportunity) start
a case from the dashboard. Every case then runs through a 15-step case workspace (Screens
3–17) with a stepper that enforces the FRD's sequencing and gating:

| Screens | Module |
|---|---|
| 3–5 | Opportunity, Employer Profile, Policy Requirements |
| 6–7 | Employee Census Upload, Census Validation — real validation engine (duplicate IDs, blank names, age-band, employer/census reconciliation tolerance) |
| 8–9 | Benefit Configuration — Group Medical, Group Term Life (each shown only if that product was selected) |
| 10 | Previous Insurance Experience — shown only for Portability/Migration, skipped for Fresh |
| 11 | Underwriting Workbench — Green/Amber/Red traffic light computed from loss ratio, FCL breaches and industry risk |
| 12–14 | Premium Calculation & Quote Comparison, Proposal Review, Negotiation |
| 15–17 | Approval Workflow, Premium Payment, Policy Issuance |

Steps lock until their prerequisites are done, following the FRD's conditional rules (e.g.
Screen 10 only becomes reachable for Portability/Migration; discounted proposals route to
Approval before they can be sent; a negotiated change that moves risk re-opens Underwriting).

## Try these flows

1. **Underwriting Queue** — `Crestline Retail Pvt Ltd` is Red (FCL breach + high-risk
   industry = two rule breaches). Its Approve/Reject buttons are disabled for the default
   Sales Executive persona; switch the sidebar role selector to **Vikram Rao — Senior
   Underwriter** to action it, matching the Approval Matrix rule that Sales Executives
   cannot action Red cases.
2. **Reconciliation gate** — `Solaris Textiles Ltd` has an uploaded census that's 5.8% short
   of its declared Employer Profile headcount (tolerance is 5%). Screen 7 blocks progress
   until you either "Confirm variance with HR" or "Re-upload corrected census."
3. **Role-gated approvals** — `Silverline Freight Corp` is mid Approval Workflow with
   Finance's sign-off pending. Switch role to **Sunita Agarwal — Finance** to approve it,
   then to reconcile the payment on Screen 16.
4. **Full close** — `Zenith Manufacturing Ltd` has been carried all the way to Policy
   Issuance and Finished; the case is read-only, matching the FRD rule that a finished case
   can only change via a (future, out-of-scope) endorsement journey.
5. **Geography parameterisation** — `Al Bahja Power & Energy LLC` is an Oman-based lead
   introduced by RMS Insurance Brokers (Oman's oldest broker, est. 1979). Its Employer
   Profile substitutes CR/VATIN for PAN/GST and its financials render in OMR, per FRD §1.4
   ("parameterised for other geographies").

## Reference pages

- **Underwriting Queue** / **Approvals** — cross-case worklists grouped by what needs action.
- **Playbook** — the Approval Matrix (§6), Notification Matrix (§7), Status Flow (§9) and Key
  Documents (§8) rendered directly from the FRD data, for QA/config reference.

## Architecture notes

- `js/data.js` — mock DB: personas, brokers, industries (with risk class), the Approval and
  Notification Matrices verbatim from the FRD, and calculators (age, census validation,
  reconciliation, loss ratio, FCL breach, traffic light, premium, quote options, approval
  routing) — all pure functions over case state, not hard-coded per case.
- `js/journey.js` — the step sequence, conditional applicability (GMC/GTL/Portability), and
  lock/done state machine shared by the stepper and the router's default-screen resolution.
- `js/views-*.js` — one screen renderer per FRD screen, registered into a `SCREENS[key]`
  registry, plus an `ACTIONS[name]` registry for all mutating interactions (dispatched by a
  single delegated click/change listener in `app.js`).
- Role switcher (sidebar) swaps the acting persona across Sales Executive / Sales Manager /
  Underwriter / Senior Underwriter / Finance / Business Head, gating the decision buttons on
  Underwriting and Approval screens — a direct, demoable implementation of the FRD's RBAC
  non-functional requirement (§10.3).
- Nine seeded cases span the full 12-stage status flow (Lead → Policy Issued); one runs in
  OMR/Oman to exercise the geography-parameterised fields.

## Out of scope (per FRD §1.2 and §12)

Mid-term endorsements, claims, the renewal journey itself (only the dashboard alert is in
scope), employee self-service/broker/onboarding portals, API specs, error-message catalogue,
wireflow diagrams, formal Given/When/Then acceptance criteria, and MIS/regulatory reporting.
