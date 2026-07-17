# AI in This Portal — What's Used, Why, and What's Not Built Per the FRD

This document answers two questions plainly: **(1) where does the portal actually
use "AI," why was each one chosen, and what does it mean in practice for the
person using it** — and **(2) what does the Functional Requirements Document
call for that this prototype does *not* build**, and why.

---

## 1. The AI plays — what's real, why it's there, what it means for the user

Every item below runs as ordinary deterministic/statistical code in the browser
(`js/ai.js`) — no model call, nothing invented. They're labeled "AI" because each
one automates a judgment call a person would otherwise make manually, using the
same signals a person would look at. None of them make a final decision on their
own; every output is either advisory (a score, a flag, a suggestion) or explicitly
marked as a draft that needs human review before it goes anywhere.

### Fuzzy duplicate-lead detection
**Where:** New Lead screen.
**How:** Levenshtein (edit-distance) similarity on company name, layered on top
of the FRD's exact-match duplicate rule.
**Why it's there:** Sales reps and brokers retype company names inconsistently —
"Al Bahja Power LLC" vs. "Al Bahja Power & Energy L.L.C." are the same employer,
but an exact-match check misses that, and the FRD's own duplicate-detection
requirement is worthless if punctuation defeats it. This is what an exact match
alone silently lets through.
**What it means for the user:** A Sales Manager gets flagged on likely-duplicate
leads even when the spelling differs slightly, instead of the account
accidentally getting double-worked by two reps or two brokers.

### Census anomaly detection
**Where:** Census Validation screen.
**How:** Two checks — near-duplicate person detection (name similarity + matching
DOB across two different Employee IDs) and salary outlier detection (IQR/
interquartile-range method) — both informational, non-blocking.
**Why it's there:** The FRD's own census validation only catches hard errors
(blank fields, out-of-range ages, exact duplicate IDs). It says nothing about
softer signals — the same employee entered twice under two IDs, or a salary
figure that's a typo (one extra zero). Those are exactly the errors a careful
human reviewer would catch by eye, and exactly the ones that slip through
mechanical validation.
**What it means for the user:** The Underwriter or Sales Executive doing final
census review sees a short list of "worth a second look" rows before the case
moves on — it doesn't block progress, it just narrows where a human should look.

### AI-drafted underwriting narrative
**Where:** Underwriting Workbench, Underwriter Comments field.
**How:** A template fills in from the case's own computed risk score, loss
ratio, FCL breaches and age profile.
**Why it's there:** Underwriters write broadly similar rationale for broadly
similar risk profiles — "moderate loss ratio + one FCL breach + high-risk
industry → refer for pricing review" is a sentence an underwriter writes from
the same numbers every time. Auto-drafting the boilerplate frees the
underwriter's time for the judgment part, not the writing part.
**What it means for the user:** Clicking "Draft with AI" fills the comment box
with a starting paragraph, always prefixed `[AI-drafted — review before
submitting]` — it's a first draft the underwriter edits and owns, never
something that gets submitted un-reviewed.

### AI-drafted proposal cover note
**Where:** Proposal Review screen.
**Same pattern as above**, applied to the HR-facing cover note that accompanies
a sent proposal — summarizes the proposal's own terms (SI, premium, riders) into
readable prose instead of the rep writing the same kind of note from scratch
every time.

### Smart prioritization (task and pipeline ranking)
**Where:** Dashboard "Pending Tasks," Pipeline default sort.
**How:** A 0–100 urgency score from deal size, how long the case has sat idle,
proximity to expected close date, and underwriting risk.
**Why it's there:** The FRD specifies a Pending Tasks list with priority and due
date, but "priority" on paper is usually just High/Medium/Low set once and never
revisited. A live score means the same case gets more urgent automatically as its
close date approaches or it sits untouched longer — the ranking reflects current
reality, not a stale label.
**What it means for the user:** Whoever opens the Dashboard sees their most
time-sensitive work at the top without having to manually triage 20 open cases
themselves.

### AI Copilot panel
**Where:** Topbar, every screen.
**How:** Recombines data the portal already computed (open tasks, traffic-light
distribution, reconciliation blockers, commission totals) into a short,
role-specific briefing — a Sales Executive sees their urgent tasks, an
Underwriter sees queue risk, Finance sees reconciliation blockers, a Broker sees
their commission summary.
**Why it's there:** Each role already has to check 2–3 different screens to
answer "what needs my attention right now." The Copilot is that answer,
pre-assembled, from data that already exists — it's a summarization layer, not a
new data source.
**What it means for the user:** One click gets a one-paragraph "here's what
matters to you today" instead of a manual scan across the Dashboard, Pipeline,
and Approvals pages.

### Lead Win-Probability score
**Where:** Opportunity screen.
**How:** A separate, AI-suggested 0–100% figure — weighted from industry risk,
lead source, deal size band, and whether a broker is involved — shown *alongside*
the rep's own manually-entered Probability field. It never overwrites the rep's
number.
**Why it's there:** The FRD already has a rep-entered Probability field; this adds
a second, independent signal so a Sales Manager can see when a rep's gut-feel
number and the data-driven number disagree — that gap is itself useful
information (either the rep knows something the model doesn't, or they're being
overly optimistic).
**What it means for the user:** A Sales Manager reviewing the pipeline gets an
early flag on deals where confidence looks inflated relative to the deal's actual
risk profile, without the tool ever silently changing what the rep reported.

### Interactive Proposal Microsite
**Where:** a separate link, `#/proposal-microsite/:caseId`, reachable from the
Proposal Review screen.
**How:** A real, working premium calculator (the same `calcGMCPremium` function
used everywhere else) exposed as sliders — co-pay, corporate buffer, rider
toggles — that recompute the premium live, clamped to a guardrail band around
the already-underwritten configuration.
**Why it's there:** Today, "the HR contact wants to see three what-if
scenarios" means three round-trips through the Sales Executive. Letting the
employer's HR contact explore configurations themselves, within pre-approved
bounds, shortens that loop — and because it's clamped to a guardrail, it can't be
used to self-approve a configuration underwriting hasn't actually cleared.
**What it means for the user:** An HR contact can self-serve "what if we raised
the corporate buffer 10%?" and submit the configuration they actually want,
which lands as a real, ready-to-review request on the Negotiation screen — not a
mockup number that has to be manually re-entered.

### AI-assisted column mapping preview
**Where:** Census Upload screen, after a real file upload.
**How:** Shows exactly which of the uploaded file's column headers were matched
to which system field (e.g. `"Emp Code" → Employee ID`), using flexible
header-matching rather than requiring an exact template.
**Why it's there:** Every employer's HR team exports census data slightly
differently — "Emp Code," "Employee No," "Staff ID" are all the same field. A
rigid template match would reject most real-world files; this makes the matching
visible so a user can trust (or correct) what the system inferred instead of it
happening silently.

### PDPL data minimization (masking)
**Where:** Census Validation table and every census export/download, for
Business Head / Finance Head / Operations roles.
**How:** Not really "AI" in the pattern-matching sense — it's a straightforward
rule (mask names/DOB/salary/ID fields for roles that only need aggregate
figures) — grouped here because it's the portal's other genuinely-implemented
"smart" behavior tied to role context.
**Why it's there:** These three roles work from totals and risk aggregates, not
individual employee records, so showing them full PII is unnecessary exposure —
exactly what PDPL's data-minimization principle asks for.
**What it means for the user:** A Business Head sees `A**** A* S****` and
`1985-**-**` instead of a real name and birth date, everywhere that data
appears — on screen and in every downloaded file — while Underwriting, Sales,
Broker and Policy Admin (who administer individual coverage) see it in full.

---

## 2. AI touchpoints that are prototypes, not real integrations

These exist in the UI — a real button, a real toast, a pre-filled form — so the
intended interaction is demoable, but each one needs infrastructure a static
HTML/CSS/JS demo genuinely cannot provide. **Every one of these is labeled
"prototype"/"demo"/"simulated" in its own on-screen copy** — nothing here could
be mistaken for a working result:

| Feature | What it needs to become real |
|---|---|
| GenAI loss-run PDF extraction (Previous Insurance screen) | An OCR/LLM document-extraction backend |
| Oman MOC/MOL auto-fetch (Employer Profile, Oman cases) | Live government API access + PDPL-compliant consent handling |
| WhatsApp-driven negotiation (Negotiation screen) | WhatsApp Business API integration |
| Free-form Copilot search ("Ask about your book") | Currently a genuinely working keyword/regex parser recognizing a fixed vocabulary (industry names, "renewal," loss-ratio thresholds, traffic-light colors) with a fuzzy company-name fallback — real code, real answers, just not true natural-language understanding. A real build swaps in an LLM behind the same input/output shape. |

---

## 3. What the FRD calls for that this prototype does not build

The FRD (§1.2 and §12) explicitly scopes these **out of the New Business
Journey** — they're not gaps in this build, they're a different journey/system
the FRD itself says is separate:

- **Mid-term policy endorsements** — changing a policy after issuance (adding/
  removing employees, changing SI) is its own journey, not covered here. The
  portal enforces this directly: a Policy Issued case is locked read-only
  precisely because endorsement is out of scope, not because the case is simply
  "done."
- **Claims** — claims intake, adjudication, and payout are a separate system.
- **The renewal journey itself** — only a dashboard *alert* that a policy is
  approaching renewal is in scope; actually working a renewal through the
  journey again is not built.
- **Employee self-service portal** — individual employees enrolling, viewing, or
  managing their own coverage has no UI here; this build is exclusively the
  Sales/Broker/Underwriter/Finance-facing side.
- **Broker onboarding portal** — bringing a *new* broker firm on board (KYC,
  agreement, credentialing) isn't built; brokers exist here as pre-seeded
  reference data.
- **Formal API specifications** — this build's `API_INTEGRATION.md` documents
  the *shape* of what a real API should look like based on how the frontend
  actually uses data, but it's a reverse-engineered integration guide, not the
  formal API spec deliverable the FRD lists separately.
- **Error-message catalogue** — a canonical, numbered list of every system error
  message isn't built as a standalone artifact; error/validation copy exists
  inline on each screen where it's needed.
- **Wireflow diagrams** — the FRD's visual wireflow deliverable isn't
  reproduced; the working screens are the substitute.
- **Formal Given/When/Then acceptance criteria** — the FRD's business rules are
  implemented and enforced in code (e.g. the census reconciliation tolerance, the
  Approval Matrix routing), but a separate formal GWT test-case document wasn't
  authored.
- **MIS / regulatory reporting** — no reporting/export layer beyond the
  operational CSV/XLSX exports already in the app (census, errors, uploaded
  file) — statutory or management-information reporting is a distinct
  deliverable the FRD scopes separately.

None of the above were silently dropped — they're the FRD's own stated boundary
for this journey. Everything the FRD scopes *inside* the New Business Journey —
all 17 screens, the field-level specs, business rules, the Approval Matrix, and
the Notification Matrix — is implemented as live, working interactions, not
static mockups (see the main `README.md`'s screen-by-screen table for the full
list, and `API_INTEGRATION.md` §7 for exactly which of those rules are only
enforced client-side today and need to move server-side in a real build).
