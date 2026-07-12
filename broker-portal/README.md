# Albright & Hayes — Broker Portal (UK & Europe)

A self-contained demo broker portal (plain HTML/CSS/JS, no build step) modelled on the
Albright & Hayes dashboard design. It runs entirely on an in-memory sample book —
refresh the page to reset the data.

## Run it

Any static file server works:

```
npx serve broker-portal -l 4173
```

then open http://localhost:4173. (A `.claude/launch.json` config named `broker-portal`
is included for the Claude Code preview panel.)

## Modules

| Route | Module |
|---|---|
| `#/dashboard` | Landing dashboard — KPI tiles, product portfolio, 30-day renewals pipeline, recent policies, key clients |
| `#/clients` | Client portfolio search (type / region filters) with client detail pages |
| `#/policies` | Policy register with market tabs: **UK Insurers · Lloyd's Market · Reinsurance**, product/status filters, policy detail incl. premium & IPT breakdown |
| `#/quotes` | Quote & renewal module — two-step New Quote wizard (client → market/carrier → premium indication), present / bind / decline |
| `#/renewals` | Renewal pipeline in 0–30 / 31–60 / 61–90 day buckets with Renew Now and Send Terms actions |
| `#/claims` | Claims — FNOL form, status tracking, adjuster timeline, settlement |
| `#/payments` | Premium & billing tracking — invoices, aged debt, record payment, reminders |
| `#/reports` | Book analytics — GWP by product line, market split, 12-month trend, top clients |
| `#/settings` | Firm profile (FCA reg, Lloyd's broker number), preferences, team |

## Market coverage

- **UK insurers** — Aviva, AXA UK, RSA, Zurich UK, Allianz UK, Direct Line, LV=, Hiscox UK
- **Lloyd's market** — syndicate placements with UMRs and lead/follow lines (Beazley 2623, Hiscox 33, Brit 2987, Atrium 609, TMK 510, MS Amlin 2001, Chaucer 1084); EEA risks noted as written via Lloyd's Insurance Company SA (Brussels)
- **Reinsurance** — quota share and XoL treaties plus facultative placements with cedant clients (Swiss Re, Munich Re, Hannover Re, SCOR)

Global search (top bar) covers clients, policies, claims and quotes; the bell shows
renewals due within 7 days, overdue invoices and large open losses. All table
"Export CSV" buttons download real CSV files.

Dashboard headline figures are book-level aggregates; the tables underneath are a
working sample of ~30 placements that the interactive workflows operate on.
