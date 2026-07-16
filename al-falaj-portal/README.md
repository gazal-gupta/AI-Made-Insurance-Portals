# Al Falaj Assurance — Employee Benefits Sales Portal

A self-contained demo of the **Employee Benefits (EB) New Business Journey** — Group Medical
(GMC) and Group Term Life (GTL), sold via an assisted (Sales Executive / Broker-led) model,
built for the Gulf market. Plain HTML/CSS/JS, no build step. Built from the *Employee Benefits
New Business Journey — Functional Requirements Document (v1.1)*: all 17 screens, the
field-level specs, business rules, validation rules, Approval Matrix, and Notification Matrix
are implemented as live interactions against an in-memory sample book, not static mockups.

The sample book runs primarily on **Oman** (OMR, CR/VATIN), with active reference cases in the
**UAE** (AED, Trade License/VAT TRN) and **Qatar** (QAR, CR/Tax Card — Qatar has not yet
implemented VAT under the GCC framework), reflecting that RMS Insurance Brokers — the
flagship broker referenced throughout — operates across all three. India's identity/currency
formats (PAN/GST, INR, 10-digit mobile, NEFT/RTGS/UPI) are fully implemented per FRD §1.4's
"parameterised for other geographies" note, but kept out of the active seed data and UI
defaults rather than deleted, so the platform still demonstrates it's geography-agnostic
without India being the visible default.

## Run it

```
python -m http.server 4622 --directory al-falaj-portal
# then open http://localhost:4622
```

## The journey

**Screen 1 (Dashboard)** is the landing page. **Screens 2–3** (Create Lead, Opportunity) start
a case from the dashboard — Create Lead lets you pick the employer's geography (Oman/UAE/Qatar),
which then drives every downstream field format. Every case then runs through a 15-step case
workspace (Screens 3–17) with a stepper that enforces the FRD's sequencing and gating:

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

1. **Underwriting Queue** — `Duqm Infrastructure & Construction LLC` is Red (FCL breach +
   high-risk industry = two rule breaches). Its Approve/Reject buttons are disabled for the
   default Sales Executive persona; switch the sidebar role selector to **Khalid Al Farsi —
   Senior Underwriter** to action it, matching the Approval Matrix rule that Sales Executives
   cannot action Red cases.
2. **Reconciliation gate** — `Dhofar Al Waha Trading & Textiles LLC` has an uploaded census
   that's 5.8% short of its declared Employer Profile headcount (tolerance is 5%). Screen 7
   blocks progress until you either "Confirm variance with HR" or "Re-upload corrected census."
3. **Role-gated approvals** — `Sur Maritime Freight LLC` is mid Approval Workflow with
   Finance's sign-off pending. Switch role to **Layla Al Zadjali — Finance** to approve it,
   then to reconcile the payment on Screen 16.
4. **Full close** — `Rustaq Manufacturing Industries LLC` has been carried all the way to
   Policy Issuance and Finished; the case is read-only, matching the FRD rule that a finished
   case can only change via a (future, out-of-scope) endorsement journey.
5. **Multi-geography** — `Al Bahja Power & Energy LLC` and `Nizwa Pharma & Healthcare LLC` are
   Oman leads brokered by RMS; `Marina Heights Construction LLC` (UAE, Trade License/VAT TRN,
   AED) and `Lusail Energy Solutions WLL` (Qatar, CR/Tax Card, QAR — no VAT yet) are RMS's UAE
   and Doha-office leads. Compare their Employer Profile screens to see the identity fields,
   currency, and tax treatment all shift per FRD §1.4.
6. **Broker's-eye view** — switch role to **Yousuf Al Balushi — Broker** (RMS). The New Lead
   button (locked to Sales Executive/Broker roles per the Screen 1 business rule) lets a
   broker co-create a lead directly, auto-attributed to their own firm; the dashboard's "Cases
   You've Introduced" and the **Broker Book** page (sidebar) then scope to just their book,
   with commission computed at their firm's own negotiated rate — RMS's spans three
   currencies (OMR/AED/QAR) since they place business in Oman, UAE and Qatar. Switch back to
   an internal role to see Broker Book as a full relationship/commission overview across all
   three brokers instead.

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
  Underwriter / Senior Underwriter / Finance / Business Head / **Broker**, gating the decision
  buttons on Underwriting and Approval screens, the New Lead action, and pipeline/Broker Book
  scoping — a direct, demoable implementation of the FRD's RBAC non-functional requirement
  (§10.3) and its Screen 1/3 broker co-creation rules.
- **Broker Book** (`js/views-case-shell.js`) — each broker's own commission, computed at their
  individually negotiated rate (`DB.calc.brokerageFor`) and grouped by currency, since a broker
  like RMS places business across Oman/UAE/Qatar in the same book.
- Twelve seeded cases span the full 12-stage status flow (Lead → Policy Issued) across Oman,
  UAE and Qatar; India's formats stay live in code (`js/ui.js`, `js/views-employer.js`) behind
  a `geography`/`currency` field on each case, ready to activate without further changes.

## Out of scope (per FRD §1.2 and §12)

Mid-term endorsements, claims, the renewal journey itself (only the dashboard alert is in
scope), employee self-service/broker/onboarding portals, API specs, error-message catalogue,
wireflow diagrams, formal Given/When/Then acceptance criteria, and MIS/regulatory reporting.
