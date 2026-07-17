# API Integration Guide — EB New Business Journey

This document is for the **engineering team** replacing this demo's in-memory mock
layer (`js/data.js`) with real backend services. The frontend (`index.html`,
`css/`, `js/views-*.js`, `js/app.js`) is built so that only the data layer needs to
change — screens read from `window.DB` and write through `window.ACTIONS`, never
touching a server directly today. Point those same call sites at real HTTP calls and
the UI keeps working unmodified.

> This is a functional/behavioral spec extracted from a working prototype, not a
> formal OpenAPI contract. Field names, entity boundaries and business rules below
> are all real and already enforced in the UI — use them as the source of truth for
> designing the actual API surface, request/response shapes, and auth model.

## 1. How the frontend currently "talks" to data

- `window.DB` (`js/data.js`) is a single in-memory object: seed collections, lookup
  tables, and a `DB.calc` namespace of pure business-rule functions. Every screen
  renderer reads from `DB.CASES`, `DB.CURRENT_USER`, `DB.BROKERS`, etc.
- `window.ACTIONS[name]` (`js/views-*.js`) is a registry of every mutating
  interaction — form saves, decisions, uploads, downloads. `js/app.js` has one
  delegated click/change listener that dispatches to `ACTIONS[el.dataset.action]`.
  **Every entry in this registry is a candidate API endpoint** (see §4).
- There is no persistence beyond the page's lifetime — a refresh resets the book to
  its seed state. No auth, no network calls, no server. This is intentional: the
  demo runs from a static file with zero backend so it can be opened by anyone
  instantly (see "Run it locally" in the main `README.md`).

## 2. Core entities

The single most important object is the **Case** (`DB.CASES[]`) — one EB opportunity
as it moves lead → policy issued. Its shape, as used throughout the code:

```
Case {
  id                 // "EB-2026-0004" — display + routing key
  status             // one of the 12-stage Status Flow (see §5)
  geography          // "Oman" | "UAE" | "Qatar" | "India"
  currency           // "OMR" | "AED" | "QAR" | "INR"
  brokerId           // → Broker.id, null if direct/RM-led
  salesExecId        // → SALES_EXECS[].id, the owning rep
  createdAt, updatedAt

  lead: {
    companyName, industryCode, employeeCountBand, source,
    products,            // ["GMC","GTL"]
    duplicateOf          // set by fuzzy duplicate-detection, null otherwise
  }

  opportunity: {
    products, expectedPremium, probability, aiWinProbability,  // AI score, advisory only
    expectedCloseDate, ownerId
  }

  employer: {
    companyName, crNumber/tradeLicense/panGst (geography-dependent),
    vatinOrTaxCard, hqAddress, hrContactName, hrContactEmail, hrContactPhone,
    industryCode, employeeCountDeclared
  }

  policyRequirements: { effectiveDate, renewalType /* Fresh|Portability|Migration */,
    productsRequired, planDesignPreferences, specialTerms }

  census: {
    rows: [ { employeeId, name, dob, gender, salary, coverage, status, reason } ],
    uploadedAt, fileName, reconciliation: { declaredCount, uploadedCount, variancePct, withinTolerance }
  }

  benefitsGMC / benefitsGTL: { sumInsured, planTier, ridersSelected, corporateBuffer, coPay, ... }

  previousInsurance: { currentInsurer, currentPremium, claimsHistory[], lossRatio }  // Portability/Migration only

  underwriting: {
    decision,           // Pending | Approve | Refer | Reject
    trafficLight,        // Green | Amber | Red — DB.calc.trafficLight(kase)
    riskScore, fclBreaches[], loadingPct, comments, decidedBy, decidedAt
  }

  quote: { options[], selectedOptionId, premium, indicativeQuote }

  proposal: { generatedAt, sentAt, coverNote, pdfUrl }

  negotiation: { discountRequested, reducePremiumRequested, increaseSI, benefitChanges,
    riskImpact, salesComments, uwComments, financeComments, status }

  approval: { steps: [ { role, status, required, decidedAt } ], needsBH, needsFH, reason }
              // computed by DB.calc.approvalRoute — see Approval Matrix in Playbook page

  payment: { amountDue, amountPaid, isPartialPayment, reconciledAt,
    partialApprovedBy, slaBreachNotified }

  issuance: { policyNumber, issuedAt, documentsSent, sentTo[] }

  notifications: [ { event, kind, text, go, createdAt, read } ]
}
```

Supporting reference collections (all in `js/data.js`, all static/seed today —
these become their own resources or lookup tables server-side):

| Collection | Purpose |
|---|---|
| `DB.PERSONAS` / `DB.CURRENT_USER` | The 13 demo users across 10 roles — becomes real auth/user-profile + RBAC role claims |
| `DB.BROKERS` | Broker firms, contact, negotiated commission rate per firm |
| `DB.INDUSTRIES` | Industry code → risk class (Low/Medium/High), used by underwriting risk scoring |
| `DB.APPROVAL_MATRIX`, `DB.NOTIFICATION_MATRIX` | Verbatim from the FRD — who approves what, who gets notified on what event; rendered on the **Playbook** page for reference |
| `DB.SALES_EXECS`, `DB.UNDERWRITERS`, `DB.FINANCE`, etc. | Role-scoped user directories |

## 3. Business logic to port (`DB.calc.*`)

These are pure functions today (`js/data.js`) — no DOM access, no side effects
beyond the case object handed in. They are the actual business rules and should
become server-side logic (not left client-side) once real money/compliance is on
the line:

| Function | Purpose |
|---|---|
| `computeAge(dob, asOf)` | Age from DOB, geography-aware date parsing |
| `validateCensus(rows, asOf, minAge, maxAge, salaryRequired)` | Row-level census validation: duplicate Employee IDs, blank names, age-band breach, missing salary |
| `reconciliation(kase, tolerancePct)` | Uploaded census count vs. declared employer headcount, default 5% tolerance |
| `lossRatio(prev)` | Claims / premium from prior-insurer history (Portability/Migration only) |
| `fclBreaches(kase)` | Free Cover Limit breaches per employee (age/SI thresholds) |
| `computeRiskScore(kase)` | Composite score from industry risk, loss ratio, FCL breaches, age profile |
| `trafficLight(kase)` | Green/Amber/Red underwriting signal — **the core UW decision input** |
| `calcGMCPremium(kase, siOverride, overrides)`, `calcGTLPremium(kase)` | Premium calculators |
| `brokerageFor(kase, premium)` | Commission at the broker's individually negotiated rate |
| `quoteOptions(kase)` | Generates the 2–3 comparison quote tiers shown on Screen 12 |
| `approvalRoute(kase)` | Determines which roles must sign off (discount >5% → Business Head; >10% → Business Head **and** Finance Head jointly), per the Approval Matrix |
| `pushNotif(kase, event, kind, txt, go)` | Fires a notification per the Notification Matrix |

**Recommendation:** stand these up as a business-rules/underwriting service with
the same function signatures and semantics — the frontend's screen logic (which
fields show/lock/require) already assumes these exact outputs (e.g. `trafficLight`
being one of exactly `"Green"|"Amber"|"Red"`, `approvalRoute` returning
`{steps, needsBH, needsFH, reason}`).

## 4. Actions → candidate endpoints

Every `ACTIONS["..."]` entry is a real mutating operation triggered by a button or
form in the UI today. Grouped by resource, with suggested REST verb/shape — adjust
to your org's API conventions, but keep the **request payload fields identical**
to what's listed, since the frontend forms already collect exactly these fields:

### Lead / Opportunity
| Action | Suggested endpoint | Notes |
|---|---|---|
| `submit-new-lead` | `POST /leads` | Runs fuzzy duplicate check server-side (Levenshtein-based today, `js/ai.js`) before create |
| `save-opportunity` | `PATCH /cases/{id}/opportunity` | |
| `pick-lead-for-opportunity` | `POST /cases/{id}/opportunity` (from existing lead) | |

### Employer / Policy Requirements
| Action | Suggested endpoint |
|---|---|
| `save-employer` | `PATCH /cases/{id}/employer` |
| `stub-moc-fetch` | `POST /cases/{id}/employer/moc-lookup` — **Tier 2, not implemented**: needs live Oman MOC/MOL government API integration (see §6) |
| `save-policyreq` | `PATCH /cases/{id}/policy-requirements` |

### Census
| Action | Suggested endpoint | Notes |
|---|---|---|
| `upload-census-file` | `POST /cases/{id}/census/upload` (multipart) | Client parses `.xlsx`/`.csv` today via vendored SheetJS; server should re-validate, never trust client-parsed rows |
| `validate-census` | `POST /cases/{id}/census/validate` | Returns per-row status/reason — logic in `DB.calc.validateCensus` |
| `edit-census-row` / `save-census-row` | `PATCH /cases/{id}/census/rows/{employeeId}` | Inline correction flow |
| `confirm-census-variance` | `POST /cases/{id}/census/confirm-variance` | HR-confirmed override of the reconciliation-tolerance block |
| `download-census-template` | `GET /census-template.xlsx` (static asset) | |
| `download-census-full`, `download-census-errors`, `download-uploaded-census` | `GET /cases/{id}/census/export?scope=full\|errors\|as-uploaded&format=xlsx` | **Must apply the same PII-masking rule server-side** (see §7) — the client currently masks these correctly, but a real API must not rely on the client to redact data |
| `generate-sample-census` | dev/demo-only tool — no production endpoint needed |

### Benefits / Previous Insurance
| Action | Suggested endpoint |
|---|---|
| `save-benefit-gmc`, `save-benefit-gtl` | `PATCH /cases/{id}/benefits/{gmc\|gtl}` |
| `save-previous-insurance` | `PATCH /cases/{id}/previous-insurance` |
| `ai-extract-loss-run` | `POST /cases/{id}/previous-insurance/extract-loss-run` — **Tier 2, not implemented**: needs an OCR/LLM document-extraction service (see §6) |

### Underwriting
| Action | Suggested endpoint |
|---|---|
| `uw-decide` | `POST /cases/{id}/underwriting/decision` — body: `{decision, loadingPct, comments}`; server must independently recompute `trafficLight` and reject a decision payload that doesn't match the role's Approval Matrix permissions (e.g. only Senior Underwriter can decide Red) |
| `uw-request-info`, `uw-respond` | `POST /cases/{id}/underwriting/request-info`, `POST /cases/{id}/underwriting/respond` |
| `ai-draft-uw-comments` | `POST /cases/{id}/underwriting/draft-comments` — Tier 1 logic (template from risk score/loss ratio/FCL breaches), portable as-is, no LLM required |
| `generate-indicative-quote` | `POST /cases/{id}/underwriting/indicative-quote` — only valid while `trafficLight === "Amber"` and decision is `Pending` |

### Quote / Proposal / Negotiation
| Action | Suggested endpoint |
|---|---|
| `select-quote` | `POST /cases/{id}/quote/select` |
| `generate-proposal`, `recalc-proposal` | `POST /cases/{id}/proposal` |
| `ai-draft-cover-note` | `POST /cases/{id}/proposal/draft-cover-note` — Tier 1, template-based |
| `send-proposal` | `POST /cases/{id}/proposal/send` — triggers HR-facing notification/email |
| `generate-pdf` | `GET /cases/{id}/proposal/pdf` |
| `resubmit-negotiation` | `POST /cases/{id}/negotiation` — server should independently derive `riskImpact` from `increaseSI`/`benefitChanges` rather than trust a client flag, same rule the frontend already applies |
| `stub-whatsapp-negotiation` | **Tier 2, not implemented** — needs WhatsApp Business API integration (see §6) |
| `microsite-send-request`, `recalc-microsite` | `POST /cases/{id}/microsite/request` — see §8, Proposal Microsite |

### Approval / Payment / Issuance
| Action | Suggested endpoint |
|---|---|
| `approval-decide`, `approval-sendback`, `continue-approval` | `POST /cases/{id}/approval/{stepRole}/decide` |
| `submit-payment`, `reconcile-payment`, `approve-partial-payment` | `POST /cases/{id}/payment/submit`, `/reconcile`, `/approve-partial` |
| `issuance-send`, `issuance-finish`, `issuance-download` | `POST /cases/{id}/issuance/send`, `/finish`, `GET /cases/{id}/issuance/document` |

### Cross-cutting
| Action | Suggested endpoint |
|---|---|
| `run-copilot-query` | `POST /copilot/query` — today a deterministic keyword parser (`AI.queryCases`, `js/ai.js`); a real build would swap in an LLM backend behind the same request/response shape (`{query} → {answer, matchedCaseIds}`) |
| `filter-pipeline` | `GET /pipeline?...filters` |

## 5. Status flow (12 stages)

`Lead → Qualified → Opportunity Created → Employer Profile Completed →
Census Uploaded → Underwriting → Quote Generated → Proposal Shared →
Negotiation → Approved → Paid → Policy Issued`

Each transition is currently inferred client-side from which fields on the Case
are populated (`js/journey.js`'s `isDone`/`isLocked`). A real backend should make
`status` an explicit, server-owned field advanced only by successful writes to the
endpoints above — never trust a client-sent `status` value directly.

## 6. Features that need real backend/external services (not implemented server-side today)

These are UI-complete, clearly-labeled prototypes in the demo (toast/button copy
says "prototype"/"demo" explicitly) — they are **not** wired to any real service and
must not be treated as functioning integrations when scoping backend work:

| Feature | Screen | What a real build needs |
|---|---|---|
| Loss-run PDF data extraction | Previous Insurance | OCR/LLM document-extraction service |
| Oman MOC/MOL auto-fetch (CR Number/VATIN) | Employer Profile | Live government API access + PDPL-compliant consent flow |
| WhatsApp-driven negotiation | Negotiation | WhatsApp Business API |
| Free-form Copilot search | Topbar AI Copilot | LLM backend (current version is a keyword/regex parser, genuinely functional but not full NLU) |

Everything else in `js/ai.js` (fuzzy duplicate detection, census anomaly detection,
win-probability scoring, smart task prioritization) is deterministic/statistical
logic with no model dependency — portable to the backend as ordinary business
logic, no ML infra required.

## 7. Access control & data governance — must be enforced server-side

The frontend demonstrates these rules but **cannot enforce them** — it's a static
page with no auth. A real API must re-implement all of the following as
server-side checks, not just replicate the UI behavior:

- **Role-gated decisions**: Underwriting decisions on Red cases require Senior
  Underwriter; discount >5% requires Business Head sign-off; discount >10%
  requires **both** Business Head and Finance Head (`DB.calc.approvalRoute`).
- **PII masking (PDPL / NFR 10.3)**: Business Head, Finance Head, and Operations
  roles see employee names/DOBs masked and salary/ID fields redacted in every
  census view **and every export** (`download-census-full`, `-errors`,
  `-uploaded-census`). This must be enforced by the API response itself for those
  roles/tokens — never rely on the client to redact data it already received in
  full.
- **Read-only after Policy Issued**: a Finished case blocks all further mutation
  except through a (currently out-of-scope) endorsement journey — the frontend
  enforces this with a disabled `<fieldset>`, but the API must reject writes to a
  finished case regardless of what the client sends.
- **Broker scoping**: a Broker-role user's Pipeline/Broker-Book views scope to only
  their own firm's cases and commission — must be a server-side query filter tied
  to the authenticated broker's ID, not a client-side list filter.

## 8. Proposal Microsite (`#/proposal-microsite/:caseId`)

A separate, employer-facing surface (HR contact drags co-pay/corporate-buffer
sliders, sees premium update live, submits a change request that lands on the
Negotiation screen). In a real deployment this is a **distinct, unauthenticated
(link-secured) external page**, not part of the internal portal's auth boundary —
plan for a signed/expiring link token per case, separate from staff SSO, and rate
limiting since it's externally reachable.

## 9. Suggested next steps for the backend team

1. Stand up the Case resource and sub-resources per §2, with `status` as a
   server-owned field.
2. Port `DB.calc.*` (§3) as a business-rules module — these are already pure
   functions, straightforward to unit test 1:1 against the existing JS behavior.
3. Implement the Actions table (§4) as real endpoints; keep request field names
   identical so the existing frontend forms need no changes beyond swapping the
   `ACTIONS[name]` implementation from "mutate `DB.CASES` in memory" to "call the
   endpoint, then update local state from the response."
4. Add real auth + RBAC enforcing §7 — this is the biggest gap between the demo
   and a production system, since none of it exists yet in the static frontend.
5. Scope the Tier 2 integrations (§6) as separate workstreams — each needs an
   external vendor/API decision the frontend team can't make alone.
