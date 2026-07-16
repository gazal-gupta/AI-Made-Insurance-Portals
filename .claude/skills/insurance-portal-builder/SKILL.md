---
name: insurance-portal-builder
description: Build a new self-contained demo insurance portal (broker, MGA, carrier, EB/GMC-GTL, claims, UW workbench, etc.) in this repo from a requirements document or a plain description. Use whenever the user asks to build, add, or scaffold a new portal under AI-Made-Insurance-Portals, or to extend one of the existing ones (broker-portal, mga-portal, BrokerPortal_Group_Medical & Term_Life) with a new screen or capability.
---

# Insurance Portal Builder

This repo is a collection of **self-contained demo insurance portals** — plain
HTML/CSS/JS, no build step, no backend, no framework. Each portal is a single
folder at the repo root with its own `index.html`, `css/styles.css`, and
`js/*.js`. This skill captures the conventions all of them share (and where
they've diverged) so a new portal is a natural sibling, not a one-off.

Three portals exist today — read one before starting a new one:

| Portal | Domain | Notable pattern |
|---|---|---|
| `broker-portal/` | UK/Europe broker (Albright & Hayes) | Simplest — `switch(d.action)` dispatch, no persona/RBAC |
| `mga-portal/` | Managing General Agent (Meridian) | Light/dark theme via `prefers-color-scheme`, API-first framing (mock data = REST resource shape) |
| `BrokerPortal_Group_Medical & Term_Life/` | Employee Benefits GMC/GTL (Al Falaj Assurance) | Most evolved — `SCREENS[key]`/`ACTIONS[name]` registries, `JOURNEY` step state machine, RBAC persona switcher, multi-geography/currency, AI features, real file upload |

For a **new portal**, follow the `BrokerPortal_Group_Medical & Term_Life`
pattern (registries + journey engine) — it scales better than the earlier
`switch` statement as screen count grows. For a **small addition** to an
existing portal, match that portal's own existing pattern; don't refactor its
architecture as a side effect of a feature request.

## 1. Process

1. **Read the requirements document end-to-end first.** If a FRD/BRD is
   provided, extract explicitly: user roles/personas, the screen-by-screen
   field list (required vs optional, formats, validation rules), business
   rules and conditional logic (what shows/hides/locks based on what), the
   approval matrix / notification matrix if any, and what's explicitly out of
   scope. Summarize this understanding back before building anything — it's
   cheap to catch a misread requirement here and expensive to unwind later.
2. **Confirm scope with the user** before generating a full app — "build the
   whole thing" is a big, hard-to-partially-undo action. A short go-ahead is
   enough; don't over-ask.
3. **Scaffold the file skeleton** (see §2) and build the data layer first
   (`data.js`) — screens are just renderers over that data, so getting the
   mock DB and calculators right up front avoids rework.
4. **Build screens incrementally**, gating each behind the journey/state
   machine rather than hard-coding navigation order.
5. **Test with real browser interaction**, not just code review — see §7.
   This caught two real bugs in the EB portal that unit-level reasoning
   missed entirely.
6. **Never alter what the requirements doc actually specifies** while adding
   polish or new capability. "Enhance holistically" means add screens/fields/
   calculators that close real gaps or fix bugs — not rewrite specified
   business rules, field lists, or validation logic because you think it
   could be better. If a rule seems wrong, ask; don't silently "fix" it.

## 2. File skeleton

```
<portal-name>/
  index.html          # shell: sidebar nav, topbar, #view mount point, script tags
  css/styles.css       # design tokens + component styles, single file
  js/
    data.js            # mock DB + pure calculator functions (DB.calc.*)
    ui.js               # formatters, lookups, toast/modal/CSV helpers (window.UI)
    journey.js          # (multi-step portals only) step sequence + gating state machine
    ai.js                # (optional) client-side AI heuristics, see §6
    views-*.js           # one file per related screen group, registers into
                          # SCREENS[key] and ACTIONS[name]
    app.js               # router + delegated event dispatch, boots last
  README.md             # what it demonstrates, how to run it, flows to try
```

Script load order in `index.html` matters: `data.js` → `ui.js` →
`journey.js` → `ai.js` → any vendored libraries → `views-*.js` (in screen
order) → `app.js` last (it boots the router and expects everything above
already registered on `window`).

## 3. `index.html` shell

- `<div class="app">` containing a `<aside class="sidebar">` (brand mark,
  nav links with `data-route`, optional role switcher, user block) and a
  `.main-col` with a `<header class="topbar">` (global search, notification
  bell, optional AI Copilot button) and `<main id="view">` — the router's
  mount point.
- A `<div class="modal-overlay" id="modalOverlay"><div class="modal" id="modalBox"></div></div>`
  and `<div class="toast-stack" id="toastStack"></div>` outside `.app`, used
  by `UI.openModal`/`UI.toast`.
- Don't link a Google Fonts (or any external) stylesheet if this portal will
  ever be bundled for the Artifact tool — its CSP blocks font CDNs. Define a
  `--sans` CSS variable with system-font fallbacks (`"Inter", "Segoe UI",
  system-ui, -apple-system, sans-serif`) so the page still looks fine
  whether or not the webfont loads.

## 4. Design system conventions

- CSS custom properties on `:root` for the full palette — teal/deep primary,
  amber accent, semantic green/amber/red, ink/ink-2/ink-3 text scale, page/
  card/line neutrals. Reuse an existing portal's token names when extending
  it; don't invent parallel ones.
- Support light/dark via `@media (prefers-color-scheme: dark)` redefining
  the same tokens (see `mga-portal/css/styles.css`) — the EB portal skipped
  this; add it for new portals unless told otherwise.
- Shared component classes across all three portals: `.card`/`.card-head`/
  `.card-title`/`.card-body`, `.kpi`/`.kpi-grid`/`.kpi-value`, `.tbl`/
  `.tbl-wrap`/`.rowlink`, `.pill` (status chips, color keyed off a
  `PILL_MAP` object), `.btn`/`.btn-amber`/`.btn-teal`/`.btn-danger`/
  `.btn-ghost`/`.btn-sm`, `.field-row`/`.screen-grid`/`.screen-foot`,
  `.dropzone` (file-upload affordance), `.skip-note` (business-rule callout
  box), `.empty` (empty-state block).
- Native `<input type="range">` needs explicit `-webkit-appearance: none`
  styling — browsers render it invisibly plain otherwise; see the EB
  portal's slider CSS for a themed version.

## 5. Data layer, screens, and router

**`data.js`** exports a single `window.DB` object: seed collections (roles,
personas, the mock book of records), reference tables straight from the
requirements doc (approval matrix, notification matrix, rate/limit tables)
verbatim, and a `DB.calc` namespace of **pure functions** — nothing in
`calc` should read the DOM or mutate global state beyond the record object
it's handed. This is what makes screens testable and swappable: MGA's README
explicitly frames `data.js` collections as 1:1 with REST resources so the
mock layer can be replaced by real endpoints without touching the views.

**`ui.js`** exports `window.UI`: currency/date/number formatters (build one
per currency if the portal spans geographies — see §6 — with both a compact
and full-precision variant), record lookups (`kase`/`clientName`/etc.),
`pill()`, `toast()`, `openModal()`/`closeModal()`, `exportCSV()` (build a
**real** CSV via Blob + `<a download>`, not a stub), `downloadStub()` (for
genuinely out-of-scope downloads — see §6 on being honest about what's real).

**Screens/Actions registry** (recommended pattern, from the EB portal):

```js
// in a views-*.js file
window.SCREENS = window.SCREENS || {};
window.VIEWS = window.VIEWS || {};   // page-level views (dashboard, queues, standalone pages)
SCREENS["screen-key"] = function (record) { return `<div>...</div>`; };
ACTIONS["save-thing"] = function (d /* dataset */, el, evt) { /* mutate + navigate */ };
```

`app.js` owns one delegated `click` listener and one delegated `change`
listener; both look up `window.ACTIONS[d.action]` and call it. **Exclude
`SELECT`/`INPUT` tag names from the click listener** — those elements fire
their action on `change`, and letting a click also dispatch through the same
path re-renders mid-interaction and closes native dropdowns before the user
can pick anything (a real bug hit and fixed in the EB portal; see §7).

**Router** (`app.js`): hash-based, `#/page/a/b` parsed into parts, a
`render()` that looks up `VIEWS[page]` or falls back to a case-shell/detail
renderer when an id segment is present, re-runs on `hashchange`, and calls
`VIEWS[page](a, b)` so page-level views can read path segments.

## 6. Multi-step journeys: the `journey.js` state machine

For any portal where a record moves through an ordered sequence of screens
(lead → underwriting → issuance, or quote → bind → claims), centralize the
sequence and gating logic in one module rather than scattering `if` checks
across views:

- `STEP_DEFS`: ordered list of `{ key, num, label, conditional?, optional? }`.
  `conditional(record)` — a predicate — makes a step apply only when true
  (e.g. a GTL benefit screen only if GTL was selected); `optional: true`
  means the step can be skipped without blocking downstream steps (e.g. a
  Negotiation screen).
- `isDone(record, key)`: a `switch` over step keys returning whether that
  step's data is complete — this is the single source of truth other code
  should call, never re-derive.
- `isLocked`/`currentStepKey`/`nextStepKey`: derived from `isDone` +
  `STEP_DEFS`, walking forward and **skipping optional steps** when
  computing what's next (a real bug: `nextStepKey` initially didn't skip
  optional steps the way `currentStepKey` did).
- Guard direct URL navigation to a locked or inapplicable step — show a
  "not available yet" / "not applicable" message with a link back to the
  current step, rather than letting the screen renderer crash on missing
  data.
- A `deriveTasks()` function that walks every open record and returns a
  prioritized worklist doubles as both the Dashboard's "Pending Tasks" and
  the input to any later "smart prioritization" feature.

## 7. Testing: real interaction, not just `selectOption()`

Playwright's `page.selectOption()` sets a `<select>`'s value via the DOM API
directly — it bypasses real rendering and event dispatch. In this repo, two
genuine UI bugs (invisible dropdown options due to a CSS color collision, and
a click-triggered premature re-render that closed a dropdown before the user
could choose) were **both invisible to `selectOption()`-based tests** and
only surfaced once testing switched to real `page.click()` + keyboard
navigation. When testing anything involving `<select>`/dropdown interaction,
drive it the way a user would, not just through the state-setting shortcut.

Standard sweep to run after any nontrivial change, headless via the
pre-installed Chromium (`/opt/pw-browsers/chromium`,
`NODE_PATH=/opt/node22/lib/node_modules node script.js` since Playwright is a
global install, not a project dependency): every persona × every top-level
route, and every record × every screen key, asserting zero console/page
errors. This catches crashes from missing-data assumptions cheaply, before
manual spot-checks of the actual feature.

## 8. Geography / currency parameterization

If a portal needs to demonstrate it's not hard-coded to one country (the EB
portal's Oman-default-with-UAE/Qatar/India pattern):

- Put `geography` and `currency` fields directly on each record, with
  `U.geographyOf(record)`/`U.currencyOf(record)` helpers defaulting to the
  active market.
- Build one formatter per currency (`fmtOMR`, `fmtAED`, `fmtQAR`, `fmtCr` for
  INR-lakh/crore notation, etc.) plus a dispatcher (`fmtMoney(n, currency)`)
  so call sites never hard-code a symbol.
- Keep a market's identity/format fields (India's PAN/GST vs. Oman's CR/
  VATIN vs. UAE's Trade License/VAT TRN) **fully implemented and switchable
  on the record's geography**, even if only one market is the active seed
  default — "hidden from the default UI" (not shown unless a record opts
  into that geography) is different from "deleted." A user may explicitly
  ask to make one geography the visible default while keeping others live in
  code; that's a UI-default change, not a scope cut.
- **Never hard-code a formatter call to the wrong currency.** This was a real
  bug: a table kept calling `fmtINR()` unconditionally after the portal's
  default market moved to Oman, showing ₹ for OMR figures. Grep for bare
  currency-specific formatter calls (`fmtINR(`, `fmtCr(`, literal `"₹"` or
  `"$"`) whenever the portal is multi-currency — they should almost always
  go through the `fmtMoney(n, currencyOf(record))` dispatcher instead.

## 9. Role-based access control / persona switching

A sidebar `<select>` populated from `DB.PERSONAS`, wired to overwrite
`DB.CURRENT_USER` on `change` and re-render. Gate mutating actions (approve/
reject, create-lead, etc.) on `DB.CURRENT_USER.role`, and disable (not hide)
the control with a `title` tooltip explaining why, so the RBAC rule is
demoable rather than invisible. **Style the closed `<select>` box and its
open `<option>` list separately** — a light-on-dark closed-box style
inherited into the native (light-background) option popup made every option
invisible in the EB portal; give `select option` its own explicit
dark-on-light rule regardless of the closed box's color scheme.

## 10. AI features: a tiering framework

When a requirements pitch includes "AI-powered" capabilities, sort every one
of them into exactly one of two tiers before writing any code — mixing them
without labeling is the failure mode to avoid:

- **Tier 1 — genuinely implementable client-side.** Deterministic
  heuristics, statistics, and template-based generation that need no model
  call and no backend: fuzzy/typo-tolerant duplicate detection
  (Levenshtein-based similarity), statistical anomaly detection (IQR
  outliers, near-duplicate matching), rules-based priority/risk scoring,
  template-filled narrative drafts. **Build these for real** — they're
  ordinary code, just framed as "AI" because they replace a manual judgment
  call. Always label generated *text* (not scores/flags) as
  human-review-required (e.g. prefix `[AI-drafted — review before
  submitting]`) and never auto-apply it without an explicit user action.
- **Tier 2 — genuinely needs a backend, LLM, or external API.** True
  natural-language understanding, OCR/document extraction, live third-party
  or government API integration, messaging-platform integrations (WhatsApp/
  SMS Business APIs). A static HTML/CSS/JS demo **cannot** genuinely
  implement these. Two honest options, never a third:
  1. **Build a labeled prototype** — a real UI touchpoint (button, toast,
     pre-filled form) that shows the intended interaction, with copy that
     explicitly says "prototype"/"demo"/"simulated" and names what a real
     build would need. This is legitimate for a sales pitch or roadmap demo
     as long as no one could mistake the output for a genuine result.
  2. **Document it as roadmap only**, no UI touchpoint, if the user prefers
     not to build mockups at all.
  Never silently fake one of these as if it were real — that's the one
  thing this tiering exists to prevent.
- A small in-between: a **deterministic keyword/regex parser** dressed as a
  "natural language" search (recognizing a fixed vocabulary — industry
  names, comparison operators, date-range phrases) is honestly Tier 1 *if
  labeled as keyword-assisted, not full NLU* — it's real code doing a real,
  if narrow, job. Don't let "not full NLU" become an excuse to skip the
  label.
- If the user asks for a long list of "futuristic" features in one go, don't
  build blind — sort the list into the two tiers first and ask which
  treatment they want for the Tier 2 half (build prototypes vs. document
  only vs. skip) before writing code. It's a real product decision, not one
  to default silently.

## 11. Data governance features are worth building for real

Where a requirements doc mentions a real compliance concept (PDPL, GDPR,
data minimization), look for a genuinely implementable version rather than
treating it as pure documentation. Example from the EB portal: roles that
only need aggregate figures (Business Head, Finance Head, Operations) get
employee names/DOBs masked in the census table (`A**** A* S****`,
`1985-**-**`), while roles that administer individual coverage keep full
visibility — a real, role-driven feature, not a stub, built from the RBAC
mechanism that already exists in §9.

## 12. Bundling for browser preview (Artifact tool)

The Artifact tool renders a single self-contained HTML file with a strict
CSP (no external scripts/styles/fonts). To let someone view a multi-file
portal without a local server:

1. Read `index.html`, strip any external font `<link>` tags (CSS already
   falls back to system fonts — see §3).
2. Replace `<link rel="stylesheet" href="css/styles.css">` with an inline
   `<style>` block containing the file's contents.
3. Replace every `<script src="...">` tag with an inline `<script>` block,
   in the same order, preserving load order exactly.
4. **Test the bundle itself** in headless Chromium before publishing — string
   substitution can subtly break something even when the source files are
   fine. Check for zero console/page errors, exercise a few real
   interactions (role switch, a screen navigation, any vendored library
   that needs its global to be present).
5. Publish with the Artifact tool, passing the **same URL** as any earlier
   publish of this bundle so it updates in place rather than minting a new
   link each time.

A vendored third-party library (e.g. a spreadsheet parser) inlines the same
way — it just makes the bundle bigger (hundreds of KB is fine).

## 13. Naming and branding — hard constraints

- **Never name a demo portal, its folder, or its UI brand after a real
  company** the user references as inspiration or a source of sample data.
  A real company can appear *inside* the mock data (e.g. as a referenced
  broker/carrier on a sample record) but never as the portal's own identity,
  logo, or folder name — that's impersonation, not a demo. Use or invent a
  clearly fictional brand name instead, and say so if asked to do otherwise.
- Folder/file renames are otherwise fine to do literally as asked (including
  unusual names with spaces/punctuation) — just verify the app still loads
  from the new path before treating the rename as done, and grep the whole
  repo for stray references to the old path (READMEs, run commands) since
  nothing inside the app's own JS/CSS should reference its own parent folder
  name (all internal paths are relative to `index.html`).

## 14. Quick-reference checklist for a new portal

- [ ] Read requirements end-to-end; confirm scope before generating code
- [ ] Scaffold `index.html` / `css/styles.css` / `js/{data,ui,journey?,app}.js`
- [ ] Build `data.js`: seed records, reference tables verbatim from the
      requirements doc, pure `DB.calc.*` functions
- [ ] Build `ui.js`: formatters (currency-aware if multi-geography), lookups,
      toast/modal/CSV helpers
- [ ] Build `journey.js` if the portal has an ordered multi-step record
      lifecycle
- [ ] Build screens into `SCREENS[key]`/`ACTIONS[name]`, one views-*.js per
      related group
- [ ] Wire `app.js` router + delegated dispatch (exclude SELECT/INPUT from
      the click listener)
- [ ] Add RBAC persona switcher if the requirements specify multiple roles
- [ ] Sort any "AI" asks into Tier 1 (build for real) / Tier 2 (label as
      prototype or document only) before writing code
- [ ] Write the README: what it demonstrates, how to run it, 3-6 concrete
      flows to try with real record IDs
- [ ] Full regression sweep (personas × routes, records × screens) — zero
      console errors
- [ ] Real click+keyboard interaction test of every dropdown/select
- [ ] If a browser preview is wanted without a local server, bundle for the
      Artifact tool and test the bundle before publishing
