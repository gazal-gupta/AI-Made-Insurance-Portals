// ---------------------------------------------------------------------------
// MGA Portal — application logic.
// Hash-routed SPA over the mock data layer in data.js. Every user action maps
// to an API operation listed in the API Reference view.
// ---------------------------------------------------------------------------

'use strict';

/* --------------------------------- helpers -------------------------------- */

const $ = (sel, el = document) => el.querySelector(sel);

const esc = (s) => String(s)
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#39;');

const money = (n) => '$' + Math.round(n).toLocaleString('en-US');
const moneyM = (n) => '$' + (n / 1_000_000).toFixed(1) + 'M';
const pct = (n, dp = 1) => n.toFixed(dp) + '%';

let claimSeq = 88105;

function toast(msg, isError = false) {
  const el = document.createElement('div');
  el.className = 'toast' + (isError ? ' err' : '');
  el.textContent = msg;
  $('#toasts').appendChild(el);
  setTimeout(() => el.remove(), 5200);
}

function logActivity(text) {
  const at = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  DATA.activity.unshift({ at, text });
}

/* ----------------------- capacity / status utilities ----------------------- */

function treatyFor(policy) {
  return DATA.treaties.find(t => t.carrier === policy.carrier && t.lob === policy.lob);
}

function utilStatus(ratio) {
  const p = ratio * 100;
  if (p >= 95) return { cls: 'critical', label: 'Critical' };
  if (p >= 85) return { cls: 'serious',  label: 'High' };
  if (p >= 70) return { cls: 'warning',  label: 'Watch' };
  return { cls: 'good', label: 'Healthy' };
}

function meterRow(name, used, limit, foot) {
  const ratio = Math.min(used / limit, 1);
  const st = utilStatus(used / limit);
  return `
    <div class="meter-row">
      <div class="meter-head">
        <span class="who">${esc(name)}</span>
        <span class="val">${moneyM(used)} / ${moneyM(limit)} · ${pct(used / limit * 100)}</span>
      </div>
      <div class="meter"><span class="m-${st.cls}" style="width:${(ratio * 100).toFixed(1)}%"></span></div>
      <div class="meter-foot"><span class="badge b-${st.cls}"><span class="dot"></span>${st.label}</span> ${foot ? '· ' + esc(foot) : ''}</div>
    </div>`;
}

const statusBadge = (status) => {
  const map = {
    'Quote': '', 'Bound': 'b-info', 'Issued': 'b-good', 'Endorsed': 'b-good', 'Renewal Due': 'b-warning',
    'Draft': '', 'Validated': 'b-good', 'Submitted': 'b-info', 'Errors': 'b-critical',
    'Open': 'b-warning', 'Under review': 'b-serious', 'Closed': 'b-good', 'FNOL Received': 'b-info',
    'Paid': 'b-good', 'Accrued': 'b-info', 'Pending statement': 'b-warning',
    'Connected': 'b-good', 'Degraded': 'b-serious',
  };
  return `<span class="badge ${map[status] || ''}"><span class="dot"></span>${esc(status)}</span>`;
};

/* --------------------------------- chart ---------------------------------- */

function gwpBarChart() {
  const d = DATA.gwpMonthly;
  const W = 720, H = 240, L = 42, R = 8, T = 16, B = 26;
  const plotW = W - L - R, plotH = H - T - B;
  const yMax = 5; // $M
  const slot = plotW / d.length;
  const barW = Math.min(slot - 8, 34);
  const y = (v) => T + plotH * (1 - v / yMax);
  const base = T + plotH;
  const maxIdx = d.reduce((mi, p, i) => (p.v > d[mi].v ? i : mi), 0);

  const ticks = [0, 2.5, 5].map(v => `
    <line class="chart-grid-line" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"></line>
    <text class="chart-tick" x="${L - 6}" y="${y(v) + 3.5}" text-anchor="end">$${v}M</text>`).join('');

  const bars = d.map((p, i) => {
    const x = L + i * slot + (slot - barW) / 2;
    const top = y(p.v), r = 4;
    const path = `M ${x} ${base} L ${x} ${top + r} Q ${x} ${top} ${x + r} ${top} L ${x + barW - r} ${top} Q ${x + barW} ${top} ${x + barW} ${top + r} L ${x + barW} ${base} Z`;
    const label = i === maxIdx
      ? `<text class="chart-direct-label" x="${x + barW / 2}" y="${top - 5}" text-anchor="middle">$${p.v.toFixed(2)}M</text>` : '';
    return `<path class="bar" d="${path}" data-tt="${esc(p.m)}|$${p.v.toFixed(2)}M GWP"></path>${label}
      <text class="chart-tick" x="${x + barW / 2}" y="${H - 8}" text-anchor="middle">${esc(p.m.split(' ')[0])}</text>`;
  }).join('');

  const tableRows = d.map(p => `<tr><td>${esc(p.m)}</td><td class="num">$${p.v.toFixed(2)}M</td></tr>`).join('');

  return `
    <div class="chart-wrap">
      <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Gross written premium by month, trailing 12 months">
        ${ticks}
        <line class="chart-baseline" x1="${L}" x2="${W - R}" y1="${base}" y2="${base}"></line>
        ${bars}
      </svg>
    </div>
    <details class="data-table">
      <summary>View as table</summary>
      <table class="tbl"><thead><tr><th>Month</th><th class="num">GWP</th></tr></thead><tbody>${tableRows}</tbody></table>
    </details>`;
}

/* --------------------------------- views ---------------------------------- */

function viewDashboard() {
  const k = DATA.kpis;
  const boundTotal = DATA.treaties.reduce((s, t) => s + t.bound, 0);
  const limitTotal = DATA.treaties.reduce((s, t) => s + t.aggLimit, 0);
  const openClaims = DATA.claims.filter(c => c.status !== 'Closed').length;
  const alerts = DATA.treaties
    .map(t => ({ t, r: t.bound / t.aggLimit }))
    .filter(x => x.r >= 0.85)
    .sort((a, b) => b.r - a.r);

  return `
    <div class="grid kpis">
      <div class="card kpi"><div class="label">Gross Written Premium — YTD</div><div class="value">${moneyM(k.gwpYtd)}</div><div class="delta up">${esc(k.gwpDelta)}</div></div>
      <div class="card kpi"><div class="label">Policies In Force</div><div class="value">${k.policiesInForce.toLocaleString()}</div><div class="delta up">${esc(k.pifDelta)}</div></div>
      <div class="card kpi"><div class="label">Capacity Utilisation</div><div class="value">${pct(boundTotal / limitTotal * 100)}</div><div class="delta warn">across ${DATA.treaties.length} treaties</div></div>
      <div class="card kpi"><div class="label">Incurred Loss Ratio</div><div class="value">${pct(k.lossRatio)}</div><div class="delta warn">profit-share trigger 65%</div></div>
      <div class="card kpi"><div class="label">Commission Earned — YTD</div><div class="value">${moneyM(k.commissionYtd)}</div><div class="delta warn">incl. overrides & profit share</div></div>
      <div class="card kpi"><div class="label">Open Claims</div><div class="value">${openClaims}</div><div class="delta warn">across ${DATA.tpas.length} TPAs</div></div>
    </div>

    <div class="grid two section-gap">
      <div class="card">
        <h2>Gross Written Premium</h2>
        <p class="sub">Trailing 12 months, all carriers, USD</p>
        ${gwpBarChart()}
      </div>
      <div>
        <div class="card">
          <h2>Aggregate alerts</h2>
          <p class="sub">Treaties at ≥ 85% of capacity — binds are blocked at 100%</p>
          ${alerts.length === 0 ? '<p class="note">No treaties above threshold.</p>' : alerts.map(({ t, r }) => `
            <div class="alert-line">
              <span class="badge b-${utilStatus(r).cls}"><span class="dot"></span>${pct(r * 100)}</span>
              <span><strong>${esc(t.carrier)}</strong> — ${esc(t.lob)} · ${moneyM(t.aggLimit - t.bound)} headroom</span>
            </div>`).join('')}
        </div>
        <div class="card section-gap">
          <h2>Recent activity</h2>
          <p class="sub">Binds, bordereaux, FNOL and capacity events</p>
          ${DATA.activity.slice(0, 6).map(a => `
            <div class="alert-line"><span class="when">${esc(a.at)}</span><span>${esc(a.text)}</span></div>`).join('')}
        </div>
      </div>
    </div>`;
}

function policyActions(p) {
  if (p.status === 'Quote')       return `<button class="btn sm primary" data-action="bind" data-id="${p.id}">Bind</button>`;
  if (p.status === 'Bound')       return `<button class="btn sm primary" data-action="issue" data-id="${p.id}">Issue</button>`;
  if (p.status === 'Renewal Due') return `<button class="btn sm primary" data-action="renew" data-id="${p.id}">Renew</button>
                                          <button class="btn sm" data-action="endorse" data-id="${p.id}">Endorse</button>`;
  if (p.status === 'Issued' || p.status === 'Endorsed')
    return `<button class="btn sm" data-action="endorse" data-id="${p.id}">Endorse</button>`;
  return '';
}

function viewPolicies() {
  const count = (s) => DATA.policies.filter(p => p.status === s).length;
  const rows = DATA.policies.map(p => `
    <tr>
      <td class="id">${esc(p.id)}</td>
      <td>${esc(p.insured)}</td>
      <td>${esc(p.lob)}</td>
      <td>${esc(p.carrier)}</td>
      <td class="num">${money(p.premium)}</td>
      <td class="num">${moneyM(p.limit)}</td>
      <td>${esc(p.effective)} → ${esc(p.expiry)}</td>
      <td>${statusBadge(p.status)}</td>
      <td><div class="actions">${policyActions(p)}</div></td>
    </tr>`).join('');

  return `
    <div class="chips">
      <div class="chip"><div class="n">${count('Quote')}</div><div class="t">Open quotes</div></div>
      <div class="chip"><div class="n">${count('Bound')}</div><div class="t">Binders awaiting issue</div></div>
      <div class="chip"><div class="n">${count('Issued') + count('Endorsed')}</div><div class="t">Issued / endorsed</div></div>
      <div class="chip"><div class="n">${count('Renewal Due')}</div><div class="t">Renewals due ≤ 60 days</div></div>
    </div>
    <div class="card">
      <h2>Full lifecycle — quotes, binders, issuance, endorsements, renewals</h2>
      <p class="sub">Every bind is checked against treaty line size, aggregate capacity and class/geo restrictions in real time</p>
      <div class="tbl-scroll">
      <table class="tbl">
        <thead><tr><th>Ref</th><th>Insured</th><th>Line of business</th><th>Carrier</th><th class="num">Premium</th><th class="num">Limit</th><th>Term</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      </div>
    </div>`;
}

function viewBordereaux() {
  const rows = DATA.bordereaux.map(b => {
    const findings = b.findings
      ? (b.findings.errors ? `${b.findings.errors} error${b.findings.errors > 1 ? 's' : ''}, ${b.findings.warnings} warnings`
        : b.findings.warnings ? `${b.findings.warnings} warning${b.findings.warnings > 1 ? 's' : ''}` : 'Clean')
      : '—';
    const canExport = b.status === 'Validated' || b.status === 'Submitted';
    return `
      <tr>
        <td class="id">${esc(b.id)}</td>
        <td>${esc(b.type)}</td>
        <td>${esc(b.period)}</td>
        <td>${esc(b.carrier)}</td>
        <td>${esc(b.format)}</td>
        <td class="num">${b.rows.toLocaleString()}</td>
        <td>${esc(findings)}</td>
        <td>${statusBadge(b.status)}</td>
        <td><div class="actions">
          ${b.status === 'Draft' ? `<button class="btn sm primary" data-action="validate-bdx" data-id="${b.id}">Validate</button>` : ''}
          ${b.status === 'Errors' ? `<button class="btn sm primary" data-action="autofix-bdx" data-id="${b.id}">Apply auto-corrections</button>` : ''}
          <button class="btn sm" data-action="export-bdx" data-id="${b.id}" ${canExport ? '' : 'disabled'}>Export CSV</button>
        </div></td>
      </tr>`;
  }).join('');

  const active = DATA.bordereaux.find(b => b.id === state.activeBdx);
  const findingsPanel = active && active.findingsList ? `
    <div class="card section-gap">
      <h2>Validation findings — ${esc(active.id)}</h2>
      <p class="sub">Rules: carrier format schema, class restrictions, currency & treaty consistency</p>
      ${active.findingsList.map(f => `
        <div class="finding f-${f.level}">
          <span class="lvl">${f.level.toUpperCase()}</span>
          <span>Row ${f.row}: ${esc(f.message)}</span>
        </div>`).join('')}
      ${active.status === 'Errors' ? `<button class="btn primary mt8" data-action="autofix-bdx" data-id="${active.id}">Apply auto-corrections & revalidate</button>` : ''}
    </div>` : '';

  return `
    <div class="card">
      <h2>Bordereaux — ingestion, validation & export</h2>
      <p class="sub">Risk, premium and claims bordereaux in standard carrier formats (Lloyd's Coverholder v5.2, ACORD). Ingest via API or SFTP, validate against carrier schema, export or submit.</p>
      <div class="tbl-scroll">
      <table class="tbl">
        <thead><tr><th>Ref</th><th>Type</th><th>Period</th><th>Carrier</th><th>Format</th><th class="num">Rows</th><th>Findings</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      </div>
    </div>
    ${findingsPanel}`;
}

function viewAggregates() {
  return `
    <div class="grid halves">
      <div class="card">
        <h2>Capacity treaties — aggregate utilisation</h2>
        <p class="sub">Checked in real time on every bind; a bind that would exceed capacity is blocked</p>
        ${DATA.treaties.map(t => meterRow(`${t.carrier} — ${t.lob}`, t.bound, t.aggLimit, `max line ${moneyM(t.maxLine)}`)).join('')}
      </div>
      <div>
        <div class="card">
          <h2>Geographic limits</h2>
          <p class="sub">Exposure vs treaty geographic sub-limits</p>
          ${DATA.geoLimits.map(g => meterRow(g.region, g.exposure, g.limit)).join('')}
        </div>
      </div>
    </div>
    <div class="card section-gap">
      <h2>Class restrictions</h2>
      <p class="sub">Underwriting rules enforced at quote and bind</p>
      <table class="tbl">
        <thead><tr><th>Class / peril</th><th>Restriction</th><th>Treaty</th></tr></thead>
        <tbody>${DATA.classRestrictions.map(c => `
          <tr><td>${esc(c.cls)}</td><td>${esc(c.rule)}</td><td class="id">${esc(c.treaty)}</td></tr>`).join('')}</tbody>
      </table>
    </div>`;
}

function viewCommissions() {
  let tGwp = 0, tBase = 0, tOvr = 0, tPs = 0;
  const rows = DATA.commissionStatements.map(s => {
    const base = s.gwp * s.basePct / 100, ovr = s.gwp * s.overridePct / 100;
    tGwp += s.gwp; tBase += base; tOvr += ovr; tPs += s.profitShare;
    return `
      <tr>
        <td class="id">${esc(s.carrier)}</td>
        <td>${esc(s.period)}</td>
        <td class="num">${money(s.gwp)}</td>
        <td class="num">${pct(s.basePct)} · ${money(base)}</td>
        <td class="num">${s.overridePct ? pct(s.overridePct) + ' · ' + money(ovr) : '—'}</td>
        <td class="num">${s.profitShare ? money(s.profitShare) : '—'}${s.note ? `<div class="note">${esc(s.note)}</div>` : ''}</td>
        <td class="num">${money(base + ovr + s.profitShare)}</td>
        <td>${statusBadge(s.status)}</td>
      </tr>`;
  }).join('');

  return `
    <div class="grid two">
      <div class="card">
        <h2>Commission statements — Jun 2026</h2>
        <p class="sub">Base commission, carrier overrides and profit-share accruals per capacity provider</p>
        <div class="tbl-scroll">
        <table class="tbl">
          <thead><tr><th>Carrier</th><th>Period</th><th class="num">GWP</th><th class="num">Base commission</th><th class="num">Override</th><th class="num">Profit share</th><th class="num">Total due</th><th>Status</th></tr></thead>
          <tbody>${rows}</tbody>
          <tfoot><tr><td colspan="2">Total</td><td class="num">${money(tGwp)}</td><td class="num">${money(tBase)}</td><td class="num">${money(tOvr)}</td><td class="num">${money(tPs)}</td><td class="num">${money(tBase + tOvr + tPs)}</td><td></td></tr></tfoot>
        </table>
        </div>
      </div>
      <div class="card">
        <h2>Distribution hierarchy split</h2>
        <p class="sub">How gross commission cascades through the distribution chain (per $1M GWP)</p>
        <table class="tbl">
          <thead><tr><th>Level</th><th class="num">% of GWP</th><th class="num">Per $1M GWP</th></tr></thead>
          <tbody>${DATA.hierarchySplit.map(h => `
            <tr>
              <td>${esc(h.level)}</td>
              <td class="num">${h.pct > 0 ? '' : '−'}${pct(Math.abs(h.pct))}</td>
              <td class="num">${h.pct > 0 ? '' : '−'}${money(Math.abs(h.pct) * 10_000)}</td>
            </tr>`).join('')}</tbody>
        </table>
        <p class="note mt16">Splits are configured per producer agreement and applied automatically at statement generation. Profit share accrues quarterly against each treaty's loss-ratio trigger.</p>
      </div>
    </div>`;
}

function viewClaims() {
  const eligible = DATA.policies.filter(p => ['Issued', 'Endorsed', 'Renewal Due'].includes(p.status));
  const rows = DATA.claims.map(c => `
    <tr>
      <td class="id">${esc(c.id)}</td>
      <td class="id">${esc(c.policy)}</td>
      <td>${esc(c.insured)}</td>
      <td>${esc(c.lossDate)}</td>
      <td>${esc(c.cause)}</td>
      <td>${esc(c.tpa)}</td>
      <td>${statusBadge(c.status)}</td>
      <td class="num">${money(c.reserve)}</td>
      <td class="num">${money(c.paid)}</td>
    </tr>`).join('');

  return `
    <div class="grid two">
      <div class="card">
        <h2>Claims register</h2>
        <p class="sub">All claims across TPAs — reserves and payments sync via TPA APIs</p>
        <div class="tbl-scroll">
        <table class="tbl">
          <thead><tr><th>Claim</th><th>Policy</th><th>Insured</th><th>Loss date</th><th>Cause</th><th>TPA</th><th>Status</th><th class="num">Reserve</th><th class="num">Paid</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        </div>
      </div>
      <div>
        <div class="card">
          <h2>First Notice of Loss (FNOL)</h2>
          <p class="sub">New losses are routed to the line's TPA automatically</p>
          <form id="fnol-form" class="form-grid">
            <label class="fld">Policy
              <select name="policy" required>
                <option value="">Select policy…</option>
                ${eligible.map(p => `<option value="${esc(p.id)}">${esc(p.id)} — ${esc(p.insured)}</option>`).join('')}
              </select>
            </label>
            <label class="fld">Date of loss
              <input type="date" name="lossDate" required max="2026-07-09" value="2026-07-08">
            </label>
            <label class="fld full">Cause of loss
              <select name="cause" required>
                <option>Property damage — fire</option>
                <option>Property damage — water</option>
                <option>Wind / hail</option>
                <option>Third-party bodily injury</option>
                <option>Cargo loss or damage</option>
                <option>Professional negligence allegation</option>
              </select>
            </label>
            <label class="fld full">Description
              <textarea name="desc" placeholder="What happened, where, and who reported it"></textarea>
            </label>
            <div class="full"><button class="btn primary" type="submit">Submit FNOL</button></div>
          </form>
        </div>
        <div class="card section-gap">
          <h2>TPA integrations</h2>
          <p class="sub">Reserve & payment movements sync into the claims bordereau</p>
          <table class="tbl">
            <thead><tr><th>TPA</th><th>Channel</th><th>Status</th><th>Last sync</th></tr></thead>
            <tbody>${DATA.tpas.map(t => `
              <tr><td>${esc(t.name)}</td><td>${esc(t.api)}</td>
                  <td>${statusBadge(t.status)}${t.note ? `<div class="note">${esc(t.note)}</div>` : ''}</td>
                  <td>${esc(t.lastSync)}</td></tr>`).join('')}</tbody>
          </table>
        </div>
      </div>
    </div>`;
}

function viewApi() {
  const groups = [
    ['Policy lifecycle', [
      ['POST', '/v1/quotes', 'Create a quote (rating via product engine)'],
      ['POST', '/v1/quotes/{id}/bind', 'Bind — runs line-size, aggregate & restriction checks'],
      ['POST', '/v1/binders/{id}/issue', 'Issue policy documents'],
      ['POST', '/v1/policies/{id}/endorsements', 'Mid-term endorsement'],
      ['POST', '/v1/policies/{id}/renew', 'Generate renewal offer'],
    ]],
    ['Bordereaux', [
      ['POST', '/v1/bordereaux/ingest', 'Ingest rows (CSV / JSON / SFTP drop)'],
      ['POST', '/v1/bordereaux/{id}/validate', 'Validate against carrier format schema'],
      ['GET',  '/v1/bordereaux/{id}/export?format=lloyds-v5.2', 'Export in carrier format'],
    ]],
    ['Aggregates & capacity', [
      ['GET',  '/v1/capacity/treaties', 'Treaty limits & live utilisation'],
      ['GET',  '/v1/capacity/check?lob=&limit=&region=', 'Pre-bind capacity check'],
    ]],
    ['Commissions', [
      ['GET',  '/v1/commissions/statements?period=', 'Statements incl. overrides & profit share'],
      ['POST', '/v1/commissions/recalculate', 'Re-run splits across distribution hierarchy'],
    ]],
    ['Claims', [
      ['POST', '/v1/claims/fnol', 'First Notice of Loss — auto-routes to TPA'],
      ['GET',  '/v1/claims/{id}', 'Claim detail with TPA reserve/payment feed'],
      ['POST', '/v1/webhooks/tpa', 'Inbound TPA event webhook (reserve, payment, closure)'],
    ]],
  ];

  return `
    <div class="card">
      <h2>API-first architecture</h2>
      <p class="sub">Every screen in this portal is a client of these REST resources — the same APIs are available to carriers, brokers and TPAs. OAuth2 client-credentials, JSON payloads, event webhooks for binds, aggregate breaches, bordereau submissions and FNOL.</p>
    </div>
    ${groups.map(([name, eps]) => `
      <div class="card section-gap">
        <h2>${esc(name)}</h2>
        ${eps.map(([m, path, desc]) => `
          <div class="endpoint">
            <span class="method ${m.toLowerCase()}">${m}</span>
            <code>${esc(path)}</code>
            <span class="desc">${esc(desc)}</span>
          </div>`).join('')}
      </div>`).join('')}`;
}

/* --------------------------------- actions --------------------------------- */

function bindQuote(id) {
  const p = DATA.policies.find(x => x.id === id);
  const t = treatyFor(p);
  if (!t) { toast(`No capacity treaty found for ${p.lob} / ${p.carrier}`, true); return; }
  if (p.limit > t.maxLine) {
    toast(`Bind blocked — ${moneyM(p.limit)} exceeds max line ${moneyM(t.maxLine)} on ${t.id}`, true);
    return;
  }
  if (t.bound + p.limit > t.aggLimit) {
    toast(`Bind blocked — ${t.id} (${t.carrier}, ${t.lob}) has only ${moneyM(t.aggLimit - t.bound)} headroom; this bind needs ${moneyM(p.limit)}`, true);
    logActivity(`Bind on ${p.id} blocked by aggregate check — ${t.id} at ${pct(t.bound / t.aggLimit * 100)} of capacity`);
    return;
  }
  t.bound += p.limit;
  p.status = 'Bound';
  logActivity(`${p.id} bound for ${p.insured} — ${t.id} now at ${pct(t.bound / t.aggLimit * 100)} of capacity`);
  toast(`${p.id} bound. ${t.id} utilisation now ${pct(t.bound / t.aggLimit * 100)}.`);
  render();
}

function issueBinder(id) {
  const p = DATA.policies.find(x => x.id === id);
  p.status = 'Issued';
  logActivity(`Policy issued from binder ${p.id} — documents dispatched to ${p.insured}`);
  toast(`${p.id} issued. Policy documents generated and dispatched.`);
  render();
}

function endorsePolicy(id) {
  const p = DATA.policies.find(x => x.id === id);
  p.premium += 4200;
  p.status = 'Endorsed';
  logActivity(`Endorsement applied to ${p.id} — additional premium $4,200`);
  toast(`Endorsement applied to ${p.id} — additional premium $4,200 booked to next premium bordereau.`);
  render();
}

function renewPolicy(id) {
  const p = DATA.policies.find(x => x.id === id);
  const bump = (d) => (parseInt(d.slice(0, 4), 10) + 1) + d.slice(4);
  p.effective = p.expiry;
  p.expiry = bump(p.expiry);
  p.status = 'Issued';
  logActivity(`${p.id} renewed for ${p.effective} → ${p.expiry}`);
  toast(`${p.id} renewed — new term ${p.effective} → ${p.expiry}.`);
  render();
}

function validateBdx(id) {
  const b = DATA.bordereaux.find(x => x.id === id);
  b.findingsList = DATA.draftFindings.slice();
  const errors = b.findingsList.filter(f => f.level === 'error').length;
  const warnings = b.findingsList.filter(f => f.level === 'warning').length;
  b.findings = { errors, warnings };
  b.status = errors ? 'Errors' : 'Validated';
  state.activeBdx = id;
  logActivity(`${b.id} validated — ${errors} error(s), ${warnings} warning(s)`);
  toast(errors ? `${b.id}: validation found ${errors} error(s), ${warnings} warning(s). Export blocked until resolved.`
               : `${b.id} validated clean.`, !!errors);
  render();
}

function autofixBdx(id) {
  const b = DATA.bordereaux.find(x => x.id === id);
  b.findingsList = b.findingsList.filter(f => !f.fixable);
  b.findings = { errors: 0, warnings: b.findingsList.length };
  b.status = 'Validated';
  logActivity(`${b.id} auto-corrections applied — revalidated with ${b.findingsList.length} warning(s)`);
  toast(`${b.id} corrected and revalidated — ${b.findingsList.length} warning(s) remain, export enabled.`);
  render();
}

function exportBdx(id) {
  const b = DATA.bordereaux.find(x => x.id === id);
  const rows = DATA.bdxSampleRows[b.type];
  const csv = rows.map(r => r.map(c => /[",]/.test(c) ? `"${c.replaceAll('"', '""')}"` : c).join(',')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${b.id}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
  logActivity(`${b.id} exported (${b.format}) for ${b.carrier}`);
  toast(`${b.id} exported as CSV in ${b.format} column layout.`);
}

function submitFnol(form) {
  const fd = new FormData(form);
  const policyId = fd.get('policy');
  if (!policyId) { toast('Select a policy to file FNOL against.', true); return; }
  const p = DATA.policies.find(x => x.id === policyId);
  const tpa = DATA.tpaRouting[p.lob] || 'Sedgwick';
  const claim = {
    id: `CLM-${claimSeq++}`,
    policy: p.id,
    insured: p.insured,
    lossDate: fd.get('lossDate'),
    cause: fd.get('cause'),
    tpa,
    status: 'FNOL Received',
    reserve: 0,
    paid: 0,
  };
  DATA.claims.unshift(claim);
  logActivity(`FNOL received on ${p.id} — routed to ${tpa} as ${claim.id}`);
  toast(`${claim.id} created and routed to ${tpa} via API. Acknowledgement expected within SLA (4h).`);
  render();
}

/* --------------------------------- router ---------------------------------- */

const VIEWS = {
  dashboard:   { title: 'Dashboard',                    render: viewDashboard },
  policies:    { title: 'Policy Lifecycle',             render: viewPolicies },
  bordereaux:  { title: 'Bordereaux Management',        render: viewBordereaux },
  aggregates:  { title: 'Aggregate & Capacity Tracking', render: viewAggregates },
  commissions: { title: 'Commission Tracking',          render: viewCommissions },
  claims:      { title: 'Claims & FNOL',                render: viewClaims },
  api:         { title: 'API Reference',                render: viewApi },
};

const state = { activeBdx: null };

function currentRoute() {
  const key = (location.hash || '#/dashboard').replace('#/', '');
  return VIEWS[key] ? key : 'dashboard';
}

function render() {
  const key = currentRoute();
  $('#view').innerHTML = VIEWS[key].render();
  $('#view-title').textContent = VIEWS[key].title;
  document.querySelectorAll('.nav a').forEach(a => {
    a.classList.toggle('active', a.getAttribute('href') === '#/' + key);
  });
}

/* ------------------------------ event wiring ------------------------------- */

document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn || btn.disabled) return;
  const { action, id } = btn.dataset;
  ({ bind: bindQuote, issue: issueBinder, endorse: endorsePolicy, renew: renewPolicy,
     'validate-bdx': validateBdx, 'autofix-bdx': autofixBdx, 'export-bdx': exportBdx }[action])?.(id);
});

document.addEventListener('submit', (e) => {
  if (e.target.id === 'fnol-form') {
    e.preventDefault();
    submitFnol(e.target);
  }
});

// Chart tooltip (per-mark hover)
const tooltip = document.createElement('div');
tooltip.className = 'viz-tooltip';
document.body.appendChild(tooltip);

document.addEventListener('mousemove', (e) => {
  const bar = e.target.closest?.('.bar');
  if (bar && bar.dataset.tt) {
    const [k, v] = bar.dataset.tt.split('|');
    tooltip.innerHTML = `<span class="tt-k">${esc(k)}</span> · <span class="tt-v">${esc(v)}</span>`;
    tooltip.style.display = 'block';
    tooltip.style.left = Math.min(e.clientX + 12, window.innerWidth - 160) + 'px';
    tooltip.style.top = (e.clientY - 34) + 'px';
  } else {
    tooltip.style.display = 'none';
  }
});

window.addEventListener('hashchange', render);
render();
