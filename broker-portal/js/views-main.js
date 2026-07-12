/* ============================================================
   Views — dashboard, clients, policies
   Each view returns an HTML string; optional after() wires events.
   ============================================================ */
window.VIEWS = window.VIEWS || {};
window.STATE = window.STATE || {
  clients: { q: "", type: "All", region: "All" },
  policies: { tab: "All", product: "All", status: "All", q: "" }
};

(function () {
  const U = UI;

  /* ============================================================ DASHBOARD */
  VIEWS.dashboard = function () {
    const B = DB.bookStats;
    const now = new Date();
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const kpis = [
      ["Active Policies", U.fmtNum(B.activePolicies.value), B.activePolicies.delta, true],
      ["GWP MTD", U.fmtGBP(B.gwpMtd.value), B.gwpMtd.delta, true],
      ["Commission MTD", U.fmtGBP(B.commissionMtd.value), B.commissionMtd.delta, true],
      ["30-Day Renewals", U.fmtNum(B.renewals30.value), B.renewals30.delta, true],
      ["Outstanding Prem", U.fmtGBP(B.outstanding.value), B.outstanding.delta, false],
      ["New Quotes", U.fmtNum(B.newQuotes.value), B.newQuotes.delta, true]
    ].map(([l, v, d, goodUp]) => `
      <div class="kpi"><div class="kpi-label">${l}</div>
        <div class="kpi-row"><span class="kpi-value">${v}</span>${U.delta(d, goodUp)}</div></div>`).join("");

    const pfIcoBg = { motor: "var(--blue-tint);color:var(--blue-ink)", home: "var(--amber-tint);color:var(--amber-ink)", health: "var(--green-tint);color:var(--green)" };
    const portfolio = B.portfolio.map(p => `
      <div class="pf-row">
        <div class="pf-ico" style="background:${pfIcoBg[p.icon]}">${U.ICONS[p.icon]}</div>
        <div class="pf-main">
          <div class="pf-top"><span class="pf-name">${p.name}</span><span class="pf-gwp">${U.fmtGBP(p.gwp)}</span></div>
          <div class="pf-bottom"><span>${U.fmtNum(p.count)} policies</span><span>${p.share}% of book</span></div>
          <div class="pf-track"><div class="pf-fill" style="width:${p.share}%;background:${p.color}"
               data-tip="<span class='tt-title'>${p.name}</span><br>${U.fmtGBP(p.gwp)} GWP · ${p.share}% of book"></div></div>
        </div>
      </div>`).join("");

    const pipeline = DB.policies
      .filter(p => p.status === "In Force" && p.renewal && U.daysUntil(p.expiry) >= 0 && U.daysUntil(p.expiry) <= 30)
      .sort((a, b) => a.expiry - b.expiry).slice(0, 5)
      .map(p => {
        const chg = (p.renewal.premium - p.premium) / p.premium * 100;
        const hot = p.renewal.status === "Re-marketing" || U.daysUntil(p.expiry) <= 1;
        return `<tr class="rowlink" data-href="#/policies/${p.id}">
          <td><div class="cell-main">${U.esc(U.clientName(p.clientId))}</div><div class="cell-sub">${p.id}</div></td>
          <td class="${hot ? "due-hot" : ""}">${U.dueLabel(p.expiry)}</td>
          <td class="num">${U.fmtGBP(p.premium)}</td>
          <td class="num"><div>${U.fmtGBP(p.renewal.premium)}</div><div>${U.delta(chg, false)}</div></td>
          <td>${U.pill(p.renewal.status)}</td>
        </tr>`;
      }).join("");

    const recent = DB.policies.slice().sort((a, b) => b.inception - a.inception).slice(0, 6)
      .map(p => `<tr class="rowlink" data-href="#/policies/${p.id}">
        <td><div class="cell-main">${p.id}</div><div class="cell-sub">${U.esc(U.clientName(p.clientId))}</div></td>
        <td>${U.esc(p.product)}</td>
        <td>${U.mktTag(p.market)}</td>
        <td>${U.esc(p.insurer)}</td>
        <td>${U.fmtDate(p.inception)}</td>
        <td class="num">${U.fmtGBP(p.premium)}</td>
        <td>${U.pill(p.status)}</td>
      </tr>`).join("");

    const keyClients = DB.clients.filter(c => c.segment === "Key Client").map(c => {
      const pols = U.clientPolicies(c.id).filter(p => p.status === "In Force" || p.status === "Pending");
      const gwp = pols.reduce((s, p) => s + p.premium, 0);
      return { c, n: pols.length, gwp };
    }).sort((a, b) => b.gwp - a.gwp).map(k => `
      <div class="pf-row rowlink" data-href="#/clients/${k.c.id}" style="cursor:pointer">
        <div class="detail-avatar" style="width:32px;height:32px;flex:0 0 32px;font-size:11px">${U.initials(k.c.name)}</div>
        <div class="pf-main">
          <div class="pf-top"><span class="pf-name" style="font-size:13px">${U.esc(k.c.name)}</span><span class="pf-gwp" style="font-size:13.5px">${U.fmtM(k.gwp)}</span></div>
          <div class="pf-bottom"><span>${k.c.city} · ${k.c.region}</span><span>${k.n} policies</span></div>
        </div>
      </div>`).join("");

    return `
      <div class="page-head">
        <div><h1 class="page-title">Overview</h1>
          <div class="page-sub">Portfolio performance for the month ending ${U.fmtDate(monthEnd)}.</div></div>
        <div class="page-meta">Data refreshed: Today, 09:14 GMT</div>
      </div>

      <div class="kpi-grid">${kpis}</div>

      <div class="dash-grid">
        <div class="card">
          <div class="card-head"><div><div class="card-title">Product Portfolio</div>
            <div class="card-sub">Breakdown by gross written premium</div></div></div>
          <div class="card-body">${portfolio}
            <div class="pf-footer">
              <span>Geographic Split&nbsp;&nbsp;<span class="legend-dot" style="background:var(--navy-950)"></span>${B.geo.uk}% UK&nbsp;&nbsp;<span class="legend-dot" style="background:var(--gold)"></span>${B.geo.eu}% EU</span>
              <span>${B.marketSplit.map(m => `<span class="legend-dot" style="background:${m.color}"></span>${m.share}% ${m.name}&nbsp;&nbsp;`).join("")}</span>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-head"><div><div class="card-title">Renewals Pipeline</div>
            <div class="card-sub">Upcoming within 30 days requiring action</div></div>
            <a class="card-link" href="#/renewals">View All</a></div>
          <div class="card-body tbl-wrap">
            <table class="tbl"><thead><tr>
              <th>Client &amp; Policy</th><th>Due</th><th class="num">Current</th><th class="num">Renewal</th><th>Action</th>
            </tr></thead><tbody>${pipeline || `<tr><td colspan="5"><div class="empty">No renewals due in the next 30 days.</div></td></tr>`}</tbody></table>
          </div>
        </div>
      </div>

      <div class="dash-grid-2">
        <div class="card">
          <div class="card-head"><div><div class="card-title">Recent Policies</div>
            <div class="card-sub">Latest bound and pending covers</div></div>
            <button class="btn btn-sm" id="exportRecent">Export CSV</button></div>
          <div class="card-body tbl-wrap">
            <table class="tbl"><thead><tr>
              <th>Policy</th><th>Product</th><th>Market</th><th>Insurer</th><th>Inception</th><th class="num">Premium</th><th>Status</th>
            </tr></thead><tbody>${recent}</tbody></table>
          </div>
        </div>

        <div class="card">
          <div class="card-head"><div><div class="card-title">Key Clients</div>
            <div class="card-sub">Recent high-value relationships</div></div>
            <a class="card-link" href="#/clients">All Clients</a></div>
          <div class="card-body">${keyClients}</div>
        </div>
      </div>`;
  };

  VIEWS.dashboard.after = function () {
    document.getElementById("exportRecent").onclick = () => {
      const rows = DB.policies.slice().sort((a, b) => b.inception - a.inception).slice(0, 6)
        .map(p => [p.id, UI.clientName(p.clientId), p.product, p.market, p.insurer, UI.fmtDate(p.inception), p.premium, p.status]);
      U.exportCSV("recent-policies.csv", ["Policy", "Client", "Product", "Market", "Insurer", "Inception", "Premium GBP", "Status"], rows);
    };
  };

  /* ============================================================ CLIENTS */
  VIEWS.clients = function () {
    const S = STATE.clients;
    let list = DB.clients.slice();
    if (S.q) { const q = S.q.toLowerCase(); list = list.filter(c => (c.name + " " + c.city + " " + c.country + " " + c.id).toLowerCase().includes(q)); }
    if (S.type !== "All") list = list.filter(c => (S.type === "Cedant" ? c.segment === "Cedant" : c.type === S.type && c.segment !== "Cedant"));
    if (S.region !== "All") list = list.filter(c => c.region === S.region);

    const rows = list.map(c => {
      const pols = U.clientPolicies(c.id);
      const active = pols.filter(p => p.status === "In Force" || p.status === "Pending");
      const gwp = active.reduce((s, p) => s + p.premium, 0);
      const openClaims = DB.claims.filter(x => x.clientId === c.id && ["Open", "Under Review", "Approved"].includes(x.status)).length;
      return `<tr class="rowlink" data-href="#/clients/${c.id}">
        <td><div class="cell-main">${U.esc(c.name)}</div><div class="cell-sub">${U.esc(c.city)}, ${U.esc(c.country)}</div></td>
        <td>${c.type}${c.segment !== "Standard" ? ` &nbsp;<span class="pill ${c.segment === "Key Client" ? "pill-navy" : "pill-violet"}">${c.segment}</span>` : ""}</td>
        <td>${c.region}</td>
        <td class="num">${active.length}</td>
        <td class="num">${U.fmtGBP(gwp)}</td>
        <td class="num">${openClaims || "—"}</td>
        <td>${U.esc(c.exec)}</td>
      </tr>`;
    }).join("");

    return `
      <div class="page-head">
        <div><h1 class="page-title">Clients</h1>
          <div class="page-sub">Client portfolio across the UK &amp; Europe book.</div></div>
        <button class="btn btn-navy" data-action="new-quote">New Quote</button>
      </div>
      <div class="toolbar">
        <input class="input" id="cSearch" style="width:260px" placeholder="Search name, city or country…" value="${U.esc(S.q)}">
        <select class="select" id="cType">
          ${["All", "Individual", "Corporate", "Cedant"].map(t => `<option ${t === S.type ? "selected" : ""}>${t}</option>`).join("")}
        </select>
        <select class="select" id="cRegion">
          ${["All", "UK", "EU"].map(t => `<option ${t === S.region ? "selected" : ""}>${t}</option>`).join("")}
        </select>
        <span class="chip-count">${list.length} of ${DB.clients.length} clients</span>
        <span class="spacer"></span>
        <button class="btn btn-sm" id="exportClients">Export CSV</button>
      </div>
      <div class="card"><div class="card-body tbl-wrap" style="padding-top:4px">
        <table class="tbl"><thead><tr>
          <th>Client</th><th>Type</th><th>Region</th><th class="num">Policies</th><th class="num">Annual GWP</th><th class="num">Open Claims</th><th>Account Exec</th>
        </tr></thead><tbody>${rows || `<tr><td colspan="7"><div class="empty"><div class="big">No clients match</div>Try clearing the filters.</div></td></tr>`}</tbody></table>
      </div></div>`;
  };

  VIEWS.clients.after = function () {
    const S = STATE.clients;
    document.getElementById("cSearch").oninput = e => { S.q = e.target.value; App.render(); document.getElementById("cSearch").focus(); const el = document.getElementById("cSearch"); el.setSelectionRange(el.value.length, el.value.length); };
    document.getElementById("cType").onchange = e => { S.type = e.target.value; App.render(); };
    document.getElementById("cRegion").onchange = e => { S.region = e.target.value; App.render(); };
    document.getElementById("exportClients").onclick = () => {
      const rows = DB.clients.map(c => [c.id, c.name, c.type, c.segment, c.city, c.country, c.region, c.email, c.phone, c.exec]);
      U.exportCSV("clients.csv", ["ID", "Name", "Type", "Segment", "City", "Country", "Region", "Email", "Phone", "Account Exec"], rows);
    };
  };

  /* ============================================================ CLIENT DETAIL */
  VIEWS.clientDetail = function (id) {
    const c = U.client(id);
    if (!c) return `<div class="empty"><div class="big">Client not found</div></div>`;
    const pols = U.clientPolicies(id).sort((a, b) => a.expiry - b.expiry);
    const active = pols.filter(p => p.status === "In Force" || p.status === "Pending");
    const gwp = active.reduce((s, p) => s + p.premium, 0);
    const claims = DB.claims.filter(x => x.clientId === id);
    const openClaims = claims.filter(x => ["Open", "Under Review", "Approved"].includes(x.status));
    const invs = DB.invoices.filter(i => i.clientId === id);
    const balance = invs.reduce((s, i) => s + U.invoiceBalance(i), 0);

    const polRows = pols.map(p => `<tr class="rowlink" data-href="#/policies/${p.id}">
      <td><div class="cell-main">${p.id}</div><div class="cell-sub">${U.esc(p.product)}</div></td>
      <td>${U.mktTag(p.market)}</td>
      <td>${U.esc(U.insurerLabel(p))}</td>
      <td>${U.fmtDate(p.expiry)}</td>
      <td class="num">${U.fmtGBP(p.premium)}</td>
      <td>${U.pill(p.status)}</td></tr>`).join("");

    const clmRows = claims.map(x => `<tr class="rowlink" data-href="#/claims/${x.id}">
      <td><div class="cell-main">${x.id}</div><div class="cell-sub">${U.esc(x.peril)}</div></td>
      <td>${U.fmtDate(x.lossDate)}</td>
      <td class="num">${U.fmtGBP(x.reserve)}</td>
      <td>${U.pill(x.status)}</td></tr>`).join("");

    const invRows = invs.map(i => {
      const st = U.invoiceStatus(i);
      return `<tr>
        <td><div class="cell-main">${i.id}</div><div class="cell-sub">${U.esc(i.descr)}</div></td>
        <td>${U.fmtDate(i.due)}</td>
        <td class="num">${U.fmtGBP(i.amount)}</td>
        <td>${U.pill(st)}</td></tr>`;
    }).join("");

    return `
      <a class="back-link" href="#/clients">&#8592; All clients</a>
      <div class="detail-head">
        <div class="detail-title-wrap">
          <div class="detail-avatar">${U.initials(c.name)}</div>
          <div><div class="detail-title">${U.esc(c.name)}</div>
            <div class="detail-sub">${c.type} · ${U.esc(c.city)}, ${U.esc(c.country)} (${c.region})
              ${c.segment !== "Standard" ? `<span class="pill ${c.segment === "Key Client" ? "pill-navy" : "pill-violet"}">${c.segment}</span>` : ""}
            </div></div>
        </div>
        <div class="detail-actions">
          <button class="btn" data-action="new-claim" data-client="${c.id}">Log a Claim</button>
          <button class="btn btn-navy" data-action="new-quote" data-client="${c.id}">New Quote</button>
        </div>
      </div>

      <div class="mini-stats">
        <div class="kpi"><div class="kpi-label">Active Policies</div><div class="kpi-row"><span class="kpi-value">${active.length}</span></div></div>
        <div class="kpi"><div class="kpi-label">Annual GWP</div><div class="kpi-row"><span class="kpi-value">${U.fmtGBP(gwp)}</span></div></div>
        <div class="kpi"><div class="kpi-label">Open Claims</div><div class="kpi-row"><span class="kpi-value">${openClaims.length}</span></div></div>
        <div class="kpi"><div class="kpi-label">Outstanding Balance</div><div class="kpi-row"><span class="kpi-value">${U.fmtGBP(balance)}</span></div></div>
      </div>

      <div class="two-col">
        <div class="stack">
          <div class="card">
            <div class="card-head"><div class="card-title">Policies</div></div>
            <div class="card-body tbl-wrap">
              <table class="tbl"><thead><tr><th>Policy</th><th>Market</th><th>Insurer</th><th>Expiry</th><th class="num">Premium</th><th>Status</th></tr></thead>
              <tbody>${polRows || `<tr><td colspan="6"><div class="empty">No policies yet.</div></td></tr>`}</tbody></table>
            </div>
          </div>
          <div class="card">
            <div class="card-head"><div class="card-title">Claims</div></div>
            <div class="card-body tbl-wrap">
              <table class="tbl"><thead><tr><th>Claim</th><th>Date of Loss</th><th class="num">Reserve</th><th>Status</th></tr></thead>
              <tbody>${clmRows || `<tr><td colspan="4"><div class="empty">No claims recorded.</div></td></tr>`}</tbody></table>
            </div>
          </div>
        </div>
        <div class="stack">
          <div class="card">
            <div class="card-head"><div class="card-title">Details</div></div>
            <div class="card-body"><div class="info-grid" style="grid-template-columns:1fr">
              <div class="info-item"><div class="lbl">Email</div><div class="val">${U.esc(c.email)}</div></div>
              <div class="info-item"><div class="lbl">Phone</div><div class="val">${U.esc(c.phone)}</div></div>
              <div class="info-item"><div class="lbl">Account Executive</div><div class="val">${U.esc(c.exec)}</div></div>
              <div class="info-item"><div class="lbl">Client Since</div><div class="val">${c.since}</div></div>
            </div></div>
          </div>
          <div class="card">
            <div class="card-head"><div class="card-title">Billing</div></div>
            <div class="card-body tbl-wrap">
              <table class="tbl"><thead><tr><th>Invoice</th><th>Due</th><th class="num">Amount</th><th>Status</th></tr></thead>
              <tbody>${invRows || `<tr><td colspan="4"><div class="empty">No invoices raised.</div></td></tr>`}</tbody></table>
            </div>
          </div>
        </div>
      </div>`;
  };

  /* ============================================================ POLICIES */
  const LINES = ["All", "Motor", "Home", "Health", "Specialty", "Travel", "Reinsurance"];
  const POLSTATUS = ["All", "In Force", "Pending", "Lapsed", "Cancelled"];

  VIEWS.policies = function () {
    const S = STATE.policies;
    let list = DB.policies.slice().sort((a, b) => a.expiry - b.expiry);
    if (S.tab !== "All") list = list.filter(p => p.market === S.tab);
    if (S.product !== "All") list = list.filter(p => p.line === S.product);
    if (S.status !== "All") list = list.filter(p => p.status === S.status);
    if (S.q) { const q = S.q.toLowerCase(); list = list.filter(p => (p.id + " " + U.clientName(p.clientId) + " " + p.product + " " + p.insurer).toLowerCase().includes(q)); }

    const isLl = S.tab === DB.MARKETS.LLOYDS, isRi = S.tab === DB.MARKETS.RI;
    const rows = list.map(p => `<tr class="rowlink" data-href="#/policies/${p.id}">
      <td><div class="cell-main">${p.id}</div><div class="cell-sub">${U.esc(U.clientName(p.clientId))}</div></td>
      <td>${U.esc(p.product)}${p.desc ? `<div class="cell-sub" style="text-transform:none;letter-spacing:0">${U.esc(p.desc)}</div>` : ""}</td>
      ${isLl ? `<td>${U.esc(p.insurer)} ${p.syndicate}</td><td><span style="font-variant-numeric:tabular-nums">${p.umr || "—"}</span></td>`
        : isRi ? `<td>${U.esc(p.treaty ? p.treaty.type : p.product)}</td><td>${U.esc(p.treaty ? p.treaty.panel : p.insurer)}</td>`
        : `<td>${U.mktTag(p.market)}</td><td>${U.esc(U.insurerLabel(p))}</td>`}
      <td>${U.fmtDate(p.inception)}</td>
      <td>${U.fmtDate(p.expiry)}</td>
      <td class="num">${U.fmtGBP(p.premium)}</td>
      <td class="num">${(p.commission * 100).toFixed(1)}%</td>
      <td>${U.pill(p.status)}</td></tr>`).join("");

    const gwp = list.filter(p => p.status !== "Lapsed" && p.status !== "Cancelled").reduce((s, p) => s + p.premium, 0);

    return `
      <div class="page-head">
        <div><h1 class="page-title">Policies</h1>
          <div class="page-sub">UK insurer, Lloyd's market and reinsurance placements.</div></div>
        <button class="btn btn-navy" data-action="new-quote">New Quote</button>
      </div>
      <div class="toolbar">
        <div class="tabs" id="pTabs">
          ${["All", DB.MARKETS.UK, DB.MARKETS.LLOYDS, DB.MARKETS.RI].map(t =>
            `<button class="tab ${S.tab === t ? "active" : ""}" data-tab="${t}">${t === "All" ? "All Markets" : t === "UK Insurer" ? "UK Insurers" : t}</button>`).join("")}
        </div>
        <select class="select" id="pProduct">${LINES.map(l => `<option ${l === S.product ? "selected" : ""}>${l}</option>`).join("")}</select>
        <select class="select" id="pStatus">${POLSTATUS.map(l => `<option ${l === S.status ? "selected" : ""}>${l}</option>`).join("")}</select>
        <input class="input" id="pSearch" style="width:210px" placeholder="Search policy, client, insurer…" value="${U.esc(S.q)}">
        <span class="spacer"></span>
        <button class="btn btn-sm" id="exportPolicies">Export CSV</button>
      </div>
      <div class="card"><div class="card-body tbl-wrap" style="padding-top:4px">
        <table class="tbl"><thead><tr>
          <th>Policy</th><th>Product</th>
          ${isLl ? "<th>Syndicate</th><th>UMR</th>" : isRi ? "<th>Structure</th><th>Reinsurer Panel</th>" : "<th>Market</th><th>Insurer</th>"}
          <th>Inception</th><th>Expiry</th><th class="num">Premium</th><th class="num">Comm.</th><th>Status</th>
        </tr></thead><tbody>${rows || `<tr><td colspan="9"><div class="empty"><div class="big">No policies match</div>Try clearing the filters.</div></td></tr>`}</tbody></table>
        <div class="tbl-foot">
          <span>Showing ${list.length} placements from the working sample · full book ${U.fmtNum(DB.bookStats.activePolicies.value)} policies</span>
          <span>GWP in view: <strong>${U.fmtGBP(gwp)}</strong></span>
        </div>
      </div></div>`;
  };

  VIEWS.policies.after = function () {
    const S = STATE.policies;
    document.querySelectorAll("#pTabs .tab").forEach(b => b.onclick = () => { S.tab = b.dataset.tab; App.render(); });
    document.getElementById("pProduct").onchange = e => { S.product = e.target.value; App.render(); };
    document.getElementById("pStatus").onchange = e => { S.status = e.target.value; App.render(); };
    document.getElementById("pSearch").oninput = e => { S.q = e.target.value; App.render(); const el = document.getElementById("pSearch"); el.focus(); el.setSelectionRange(el.value.length, el.value.length); };
    document.getElementById("exportPolicies").onclick = () => {
      const rows = DB.policies.map(p => [p.id, UI.clientName(p.clientId), p.product, p.market, p.insurer, p.syndicate || "", p.umr || "", UI.fmtDate(p.inception), UI.fmtDate(p.expiry), p.premium, (p.commission * 100).toFixed(1) + "%", p.status]);
      U.exportCSV("policies.csv", ["Policy", "Client", "Product", "Market", "Insurer", "Syndicate", "UMR", "Inception", "Expiry", "Premium GBP", "Commission", "Status"], rows);
    };
  };

  /* ============================================================ POLICY DETAIL */
  VIEWS.policyDetail = function (id) {
    const p = U.policy(id);
    if (!p) return `<div class="empty"><div class="big">Policy not found</div></div>`;
    const c = U.client(p.clientId);
    const days = U.daysUntil(p.expiry);
    const claims = DB.claims.filter(x => x.policyId === id);
    const invs = DB.invoices.filter(i => i.policyId === id);

    const net = p.premium, ipt = Math.round(net * p.iptRate), gross = net + ipt, comm = Math.round(net * p.commission);

    let marketCard = "";
    if (p.market === DB.MARKETS.LLOYDS) {
      marketCard = `<div class="card">
        <div class="card-head"><div class="card-title">Lloyd's Placement</div></div>
        <div class="card-body"><div class="info-grid" style="grid-template-columns:1fr">
          <div class="info-item"><div class="lbl">Unique Market Reference</div><div class="val" style="font-variant-numeric:tabular-nums">${p.umr}</div></div>
          <div class="info-item"><div class="lbl">Lead &amp; Following Lines</div><div class="val">${U.esc(p.lead)}</div></div>
          <div class="info-item"><div class="lbl">Placement Basis</div><div class="val">Open market slip — MRC v3</div></div>
          ${p.note ? `<div class="info-item"><div class="lbl">Note</div><div class="val" style="font-weight:400;color:var(--ink-2)">${U.esc(p.note)}</div></div>` : ""}
        </div></div></div>`;
    } else if (p.market === DB.MARKETS.RI) {
      marketCard = `<div class="card">
        <div class="card-head"><div class="card-title">Reinsurance Structure</div></div>
        <div class="card-body"><div class="info-grid" style="grid-template-columns:1fr">
          <div class="info-item"><div class="lbl">Structure</div><div class="val">${U.esc(p.treaty.type)}</div></div>
          <div class="info-item"><div class="lbl">Detail</div><div class="val">${U.esc(p.treaty.detail)}</div></div>
          <div class="info-item"><div class="lbl">Cedant</div><div class="val">${U.esc(p.treaty.cedant)}</div></div>
          <div class="info-item"><div class="lbl">Reinsurer Panel</div><div class="val">${U.esc(p.treaty.panel)}</div></div>
        </div></div></div>`;
    }

    const renewCard = (p.renewal && days >= 0 && days <= 90 && p.status === "In Force") ? (() => {
      const chg = (p.renewal.premium - p.premium) / p.premium * 100;
      return `<div class="card" style="border-top:3px solid var(--gold)">
        <div class="card-head"><div><div class="card-title">Renewal</div>
          <div class="card-sub">Due ${U.dueLabel(p.expiry).toLowerCase()} — ${U.fmtDate(p.expiry)}</div></div>${U.pill(p.renewal.status)}</div>
        <div class="card-body">
          <div class="brk-row"><span class="muted">Expiring premium</span><span>${U.fmtGBP(p.premium)}</span></div>
          <div class="brk-row"><span class="muted">Renewal terms</span><span>${U.fmtGBP(p.renewal.premium)} ${U.delta(chg, false)}</span></div>
          <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap">
            <button class="btn btn-gold btn-sm" data-action="renew-now" data-policy="${p.id}">Renew Now</button>
            <button class="btn btn-sm" data-action="send-terms" data-policy="${p.id}">Send Terms to Client</button>
          </div>
        </div></div>`;
    })() : "";

    const clmRows = claims.map(x => `<tr class="rowlink" data-href="#/claims/${x.id}">
      <td><div class="cell-main">${x.id}</div><div class="cell-sub">${U.esc(x.peril)}</div></td>
      <td>${U.fmtDate(x.lossDate)}</td><td class="num">${U.fmtGBP(x.reserve)}</td><td>${U.pill(x.status)}</td></tr>`).join("");

    const invRows = invs.map(i => `<tr><td><div class="cell-main">${i.id}</div><div class="cell-sub">${U.esc(i.descr)}</div></td>
      <td>${U.fmtDate(i.due)}</td><td class="num">${U.fmtGBP(i.amount)}</td><td>${U.pill(U.invoiceStatus(i))}</td></tr>`).join("");

    return `
      <a class="back-link" href="#/policies">&#8592; All policies</a>
      <div class="detail-head">
        <div><div class="detail-title">${p.id}</div>
          <div class="detail-sub">${U.esc(p.product)}${p.desc ? " — " + U.esc(p.desc) : ""} &nbsp;${U.mktTag(p.market)} ${U.pill(p.status)}</div></div>
        <div class="detail-actions">
          <button class="btn" data-action="download-doc" data-doc="Policy schedule — ${p.id}.pdf">Download Schedule</button>
          <button class="btn btn-navy" data-action="new-claim" data-client="${p.clientId}" data-policy="${p.id}">Log a Claim</button>
        </div>
      </div>

      <div class="two-col">
        <div class="stack">
          <div class="card">
            <div class="card-head"><div class="card-title">Cover Details</div></div>
            <div class="card-body"><div class="info-grid">
              <div class="info-item"><div class="lbl">${p.market === DB.MARKETS.RI ? "Cedant" : "Client"}</div>
                <div class="val"><a href="#/clients/${c.id}" style="text-decoration:underline;text-underline-offset:3px">${U.esc(c.name)}</a></div></div>
              <div class="info-item"><div class="lbl">Product</div><div class="val">${U.esc(p.product)}</div></div>
              <div class="info-item"><div class="lbl">Market</div><div class="val">${U.esc(p.market)}</div></div>
              <div class="info-item"><div class="lbl">${p.market === DB.MARKETS.LLOYDS ? "Lead Syndicate" : p.market === DB.MARKETS.RI ? "Lead Reinsurer" : "Insurer"}</div><div class="val">${U.esc(U.insurerLabel(p))}</div></div>
              <div class="info-item"><div class="lbl">Period</div><div class="val">${U.fmtDate(p.inception)} — ${U.fmtDate(p.expiry)}</div></div>
              <div class="info-item"><div class="lbl">${p.sumInsured ? "Sum Insured / Limit" : "Basis"}</div><div class="val">${p.sumInsured ? U.fmtGBP(p.sumInsured) : "As per schedule"}</div></div>
              <div class="info-item"><div class="lbl">Account Executive</div><div class="val">${U.esc(c.exec)}</div></div>
              <div class="info-item"><div class="lbl">Region of Risk</div><div class="val">${c.region === "UK" ? "United Kingdom" : "European Union"}</div></div>
            </div></div>
          </div>
          ${marketCard}
          <div class="card">
            <div class="card-head"><div class="card-title">Claims on this Policy</div></div>
            <div class="card-body tbl-wrap">
              <table class="tbl"><thead><tr><th>Claim</th><th>Date of Loss</th><th class="num">Reserve</th><th>Status</th></tr></thead>
              <tbody>${clmRows || `<tr><td colspan="4"><div class="empty">No claims on this policy.</div></td></tr>`}</tbody></table>
            </div>
          </div>
        </div>

        <div class="stack">
          <div class="card">
            <div class="card-head"><div class="card-title">Premium</div></div>
            <div class="card-body">
              <div class="brk-row"><span class="muted">Net premium</span><span>${U.fmtGBP(net)}</span></div>
              <div class="brk-row"><span class="muted">${p.iptRate ? "IPT @ " + (p.iptRate * 100).toFixed(0) + "%" : "IPT"}</span><span>${p.iptRate ? U.fmtGBP(ipt) : "Exempt"}</span></div>
              <div class="brk-row total"><span>Gross payable</span><span>${U.fmtGBP(gross)}</span></div>
              <div class="brk-row"><span class="muted">${p.market === DB.MARKETS.RI ? "Brokerage" : "Commission"} @ ${(p.commission * 100).toFixed(1)}%</span><span>${U.fmtGBP(comm)}</span></div>
            </div>
          </div>
          ${renewCard}
          <div class="card">
            <div class="card-head"><div class="card-title">Billing</div></div>
            <div class="card-body tbl-wrap">
              <table class="tbl"><thead><tr><th>Invoice</th><th>Due</th><th class="num">Amount</th><th>Status</th></tr></thead>
              <tbody>${invRows || `<tr><td colspan="4"><div class="empty">No invoices raised.</div></td></tr>`}</tbody></table>
            </div>
          </div>
        </div>
      </div>`;
  };
})();
