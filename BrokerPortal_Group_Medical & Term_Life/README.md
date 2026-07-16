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
python -m http.server 4622 --directory "BrokerPortal_Group_Medical & Term_Life"
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

## Excel/CSV census upload

Screen 6 (Employee Census Upload) accepts a **real** `.xlsx`/`.csv` file — parsed client-side
with a vendored copy of [SheetJS](https://github.com/SheetJS/sheetjs) (`js/vendor/xlsx.mini.min.js`,
Apache-2.0), not simulated. Column headers are matched flexibly (`js/xlsx-import.js`) — "Emp
Name", "Full Name", and "Employee Name" all resolve to the same field — but a file missing a
recognisable mandatory column (Employee ID, Name, DOB, or Gender) is still blocked, per the
FRD's template-mismatch rule. Files over the configurable row limit (default 50,000) are
truncated with a warning rather than silently dropped. No file handy? "Generate a sample
census" on the same screen produces synthetic data instead.

## AI features (Tier 1 — client-side, no backend)

All of `js/ai.js` runs in the browser against data already on the case — no external model
calls, nothing fabricated as ground truth. Every drafted output is explicitly labeled and
meant for human review before it's submitted anywhere:

- **Fuzzy duplicate-lead detection** (Screen 2) — a Levenshtein-based similarity check layered
  on top of the FRD's exact-match rule, so "Al Bahja Power LLC" vs. "Al Bahja Power & Energy
  L.L.C." still gets flagged for Sales Manager review.
- **Census anomaly detection** (Screen 7) — informational, non-blocking flags for accepted rows
  that look like the same person under two Employee IDs (name similarity + matching DOB), and
  salary values that are statistical outliers (IQR method) versus the rest of the group.
- **AI-drafted underwriting narrative** (Screen 11) — "Draft with AI" on the Underwriter
  Comments field generates a starting rationale from the case's own risk score, loss ratio, FCL
  breaches, and age profile; always prefixed `[AI-drafted — review before submitting]`.
- **AI-drafted proposal cover note** (Screen 13) — same pattern, summarising the proposal terms
  for the HR contact before it's sent.
- **Smart prioritization** — a 0–100 urgency score (deal size, case staleness, proximity to
  expected close, underwriting risk) ranks the Pipeline by default and breaks ties within each
  High/Medium/Low tier of the Dashboard's Pending Tasks.
- **AI Copilot** (topbar, all screens) — a role-aware panel that recombines existing computed
  data (tasks, traffic light, reconciliation, commission) into a short briefing per acting
  persona: urgent tasks for Sales, queue risk for Underwriters, reconciliation blockers for
  Finance, commission summary for Brokers, approval/pipeline health for Business Head/Ops.
- **Lead Win-Probability score** (Screen 3) — a separate, AI-suggested 0–100% signal alongside
  the rep's own manually-entered Probability field (never overwrites it), weighted from
  industry risk, lead source, deal size band and broker involvement.
- **Interactive Proposal Microsite** (Screen 13 → `#/proposal-microsite/:caseId`) — a preview of
  the secure, employer-facing link an HR contact would use to drag co-pay/corporate-buffer
  sliders and toggle riders, seeing the premium update live, clamped to a guardrail band around
  the already-underwritten configuration. Submitting writes a request straight onto the
  Negotiation screen (Screen 14) — real premium math via `DB.calc.calcGMCPremium`, no fakery.
- **AI-assisted column mapping preview** (Screen 6) — after a real upload, shows exactly which
  of your file's headers were matched to which system field (e.g. `"Emp Code" → Employee ID`).
- **PDPL data minimization** (Screen 7) — Business Head / Finance Head / Operations, who work
  from aggregate figures rather than administering individual coverage, see employee names and
  DOBs masked (`A**** A* S****`, `1985-**-**`) in the Census Records table; Sales, Underwriting,
  Broker and Policy Admin — who operationally need it — see it in full. Real, role-driven, not a
  stub.

## Futuristic feature prototypes (simulated — need a real backend/LLM/external API)

These illustrate the intended UX for capabilities this static HTML/CSS/JS shell (no server, no
LLM access) cannot genuinely implement. Every touchpoint below is explicitly labeled
"prototype"/"demo" in its own UI and toast copy — nothing here is presented as if it were real:

- **GenAI loss-run PDF extraction** (Screen 10, "Try AI extraction from a loss-run PDF") —
  pre-fills Current Insurer/Premium/Claims from a canned response; a real build needs an
  OCR/LLM document-extraction backend.
- **Oman Ministry of Commerce / Ministry of Labour auto-fetch** (Screen 4, Oman cases only) —
  pre-fills CR Number/VATIN from a canned response; a real build needs live government API
  access and PDPL-compliant consent handling.
- **WhatsApp-driven negotiation** (Screen 14) — a stub touchpoint for exchanging quote approval
  or missing census data in-chat; a real build needs the WhatsApp Business API (out of scope
  per FRD §1.4's current channel list).
- **Keyword-assisted Copilot search** (topbar → AI Copilot → "Ask about your book") — a
  deterministic regex/keyword parser (`AI.queryCases` in `js/ai.js`) recognising a fixed
  vocabulary (industry names, "renewal", "next month", "loss ratio under/over N%", traffic-light
  colors), with a fuzzy company-name fallback. This one is genuinely functional, just not true
  natural-language understanding — a real build would swap the parser for an LLM backend to
  handle arbitrary free-form phrasing.

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
