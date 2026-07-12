/* ============================================================
   Views — quotes, renewals, claims, payments, reports, settings
   ============================================================ */
(function () {
  const U = UI;
  window.STATE.quotes = { status: "All" };
  window.STATE.renewals = { bucket: "All", status: "All" };
  window.STATE.claims = { status: "All", q: "" };
  window.STATE.payments = { status: "All" };

  let seq = { quote: 100, claim: 150, invoice: 650, policy: 600 };

  /* ============================================================ QUOTES */
  const QSTATUSES = ["All", "Draft", "Presented", "Awaiting Client", "Bound", "Declined"];

  VIEWS.quotes = function () {
    const S = STATE.quotes;
    let list = DB.quotes.slice().sort((a, b) => b.created - a.created);
    if (S.status !== "All") list = list.filter(q => q.status === S.status);

    const open = DB.quotes.filter(q => ["Draft", "Presented", "Awaiting Client"].includes(q.status));
    const bound = DB.quotes.filter(q => q.status === "Bound");
    const conv = Math.round(bound.length / (bound.length + DB.quotes.filter(q => q.status === "Declined").length) * 100);
    const pipelineGwp = open.reduce((s, q) => s + q.premium, 0);

    const rows = list.map(q => {
      const actions =
        q.status === "Draft" ? `<button class="btn btn-sm" data-action="quote-present" data-quote="${q.id}">Present</button>` :
        (q.status === "Presented" || q.status === "Awaiting Client")
          ? `<button class="btn btn-sm btn-gold" data-action="quote-bind" data-quote="${q.id}">Bind</button>
             <button class="btn btn-sm btn-ghost" data-action="quote-decline" data-quote="${q.id}">Decline</button>` : "—";
      return `<tr>
        <td><div class="cell-main">${q.id}</div><div class="cell-sub">${U.fmtDate(q.created)}</div></td>
        <td><div class="cell-main" style="font-weight:500">${U.esc(U.clientName(q.clientId))}</div><div class="cell-sub" style="text-transform:none;letter-spacing:0">${U.esc(q.desc || "")}</div></td>
        <td>${U.esc(q.product)}</td>
        <td>${U.mktTag(q.market)}</td>
        <td>${U.esc(q.insurer)}</td>
        <td class="num">${U.fmtGBP(q.premium)}</td>
        <td>${U.pill(q.status)}</td>
        <td style="white-space:nowrap">${actions}</td>
      </tr>`;
    }).join("");

    return `
      <div class="page-head">
        <div><h1 class="page-title">Quotes</h1>
          <div class="page-sub">Quote &amp; renewal terms across UK, Lloyd's and reinsurance markets.</div></div>
        <button class="btn btn-navy" data-action="new-quote">New Quote</button>
      </div>
      <div class="mini-stats">
        <div class="kpi"><div class="kpi-label">Open Quotes</div><div class="kpi-row"><span class="kpi-value">${open.length}</span></div></div>
        <div class="kpi"><div class="kpi-label">Pipeline Premium</div><div class="kpi-row"><span class="kpi-value">${U.fmtGBP(pipelineGwp)}</span></div></div>
        <div class="kpi"><div class="kpi-label">Bound (30 days)</div><div class="kpi-row"><span class="kpi-value">${bound.length}</span></div></div>
        <div class="kpi"><div class="kpi-label">Conversion Rate</div><div class="kpi-row"><span class="kpi-value">${conv}%</span></div></div>
      </div>
      <div class="toolbar">
        <div class="tabs" id="qTabs">${QSTATUSES.map(s => `<button class="tab ${S.status === s ? "active" : ""}" data-tab="${s}">${s}</button>`).join("")}</div>
        <span class="chip-count">${list.length} quotes</span>
      </div>
      <div class="card"><div class="card-body tbl-wrap" style="padding-top:4px">
        <table class="tbl"><thead><tr>
          <th>Quote</th><th>Client</th><th>Product</th><th>Market</th><th>Insurer / Syndicate</th><th class="num">Premium</th><th>Status</th><th>Actions</th>
        </tr></thead><tbody>${rows || `<tr><td colspan="8"><div class="empty">No quotes in this state.</div></td></tr>`}</tbody></table>
      </div></div>`;
  };

  VIEWS.quotes.after = function () {
    document.querySelectorAll("#qTabs .tab").forEach(b => b.onclick = () => { STATE.quotes.status = b.dataset.tab; App.render(); });
  };

  /* ---------- quote actions ---------- */
  function findQuote(id) { return DB.quotes.find(q => q.id === id); }

  window.quoteActions = {
    present(id) { findQuote(id).status = "Presented"; U.toast(`Quote <strong>${id}</strong> marked as presented to client.`); App.render(); },
    decline(id) { findQuote(id).status = "Declined"; U.toast(`Quote <strong>${id}</strong> declined.`, "warn"); App.render(); },
    bind(id) {
      const q = findQuote(id);
      q.status = "Bound";
      const prod = DB.PRODUCTS[q.product] || { code: "GEN", ipt: 0.12, line: "Specialty" };
      const num = `ALB-${prod.code}-2026-${String(++seq.policy).padStart(4, "0")}`;
      const isLl = q.market === DB.MARKETS.LLOYDS;
      const expiry = DB.inDays(365), inception = new Date();
      DB.policies.push({
        id: num, clientId: q.clientId, product: q.product, market: q.market,
        insurer: isLl ? q.insurer.replace(/\s+\d+$/, "") : q.insurer,
        syndicate: isLl ? (q.insurer.match(/(\d+)$/) || [])[1] : undefined,
        umr: isLl ? "B0713AH26" + String(seq.policy).padStart(5, "0") : undefined,
        lead: isLl ? q.insurer + " (100%)" : undefined,
        premium: q.premium, sumInsured: 0, commission: q.market === DB.MARKETS.RI ? 0.025 : 0.175,
        iptRate: prod.ipt, line: prod.line, status: "In Force", termDays: 365, expiry, inception, desc: q.desc
      });
      const gross = Math.round(q.premium * (1 + prod.ipt));
      DB.invoices.unshift({ id: `ALB-INV-2026-0${++seq.invoice}`, policyId: num, clientId: q.clientId, descr: `${q.product} — new business premium`, amount: gross, issued: new Date(), due: DB.inDays(30), status: "Unpaid" });
      U.toast(`Quote bound — policy <strong>${num}</strong> created and invoice raised.`);
      location.hash = "#/policies/" + num;
    }
  };

  /* ---------- new-quote wizard ---------- */
  const WZ = { step: 1, clientId: "", product: "Motor", market: DB.MARKETS.UK, insurer: "", sumInsured: 250000, premium: null };

  window.openQuoteWizard = function (clientId) {
    Object.assign(WZ, { step: 1, clientId: clientId || DB.clients[0].id, product: "Motor", market: DB.MARKETS.UK, insurer: "", sumInsured: 250000, premium: null });
    renderWizard();
  };

  function wizardInsurers() {
    if (WZ.market === DB.MARKETS.LLOYDS) return DB.SYNDICATES.map(s => `${s.name} ${s.num}`);
    if (WZ.market === DB.MARKETS.RI) return DB.REINSURERS;
    return DB.UK_INSURERS;
  }

  function indication() {
    const prod = DB.PRODUCTS[WZ.product];
    if (!prod || !prod.rate) return Math.max(500, Math.round(WZ.sumInsured * 0.004));
    return Math.max(150, Math.round(WZ.sumInsured * prod.rate));
  }

  function renderWizard() {
    const products = Object.keys(DB.PRODUCTS).filter(p => WZ.market === DB.MARKETS.RI ? p.startsWith("Reinsurance") : !p.startsWith("Reinsurance"));
    if (!products.includes(WZ.product)) WZ.product = products[0];
    const insurers = wizardInsurers();
    if (!insurers.includes(WZ.insurer)) WZ.insurer = insurers[0];

    if (WZ.step === 1) {
      U.openModal("New Quote",
        `<div class="wizard-steps"><div class="wstep on"></div><div class="wstep"></div></div>
        <div class="form-grid">
          <div class="field full"><label>Client</label>
            <select class="select" id="wzClient">${DB.clients.map(c => `<option value="${c.id}" ${c.id === WZ.clientId ? "selected" : ""}>${U.esc(c.name)} — ${c.city} (${c.region})</option>`).join("")}</select></div>
          <div class="field full"><label>Market</label>
            <select class="select" id="wzMarket">${["UK Insurer", "Lloyd's Market", "Reinsurance"].map(m => `<option ${m === WZ.market ? "selected" : ""}>${m}</option>`).join("")}</select></div>
          <div class="field"><label>Product</label>
            <select class="select" id="wzProduct">${products.map(p => `<option ${p === WZ.product ? "selected" : ""}>${p}</option>`).join("")}</select></div>
          <div class="field"><label>${WZ.market === DB.MARKETS.LLOYDS ? "Syndicate" : WZ.market === DB.MARKETS.RI ? "Reinsurer" : "Insurer"}</label>
            <select class="select" id="wzInsurer">${insurers.map(i => `<option ${i === WZ.insurer ? "selected" : ""}>${i}</option>`).join("")}</select></div>
          <div class="field full"><label>Sum insured / limit (£)</label>
            <input class="input" id="wzSum" type="number" min="0" step="1000" value="${WZ.sumInsured}"></div>
        </div>`,
        `<button class="btn" data-action="close-modal">Cancel</button>
         <button class="btn btn-navy" id="wzNext">Premium Indication &#8594;</button>`);
      document.getElementById("wzClient").onchange = e => WZ.clientId = e.target.value;
      document.getElementById("wzMarket").onchange = e => { WZ.market = e.target.value; WZ.insurer = ""; renderWizard(); };
      document.getElementById("wzProduct").onchange = e => WZ.product = e.target.value;
      document.getElementById("wzInsurer").onchange = e => WZ.insurer = e.target.value;
      document.getElementById("wzSum").oninput = e => WZ.sumInsured = +e.target.value || 0;
      document.getElementById("wzNext").onclick = () => { WZ.step = 2; WZ.premium = indication(); renderWizard(); };
    } else {
      const prod = DB.PRODUCTS[WZ.product];
      const ipt = Math.round(WZ.premium * prod.ipt);
      const comm = Math.round(WZ.premium * (WZ.market === DB.MARKETS.RI ? 0.025 : 0.175));
      U.openModal("New Quote — Indication",
        `<div class="wizard-steps"><div class="wstep on"></div><div class="wstep on"></div></div>
        <div class="quote-summary">
          <div class="brk-row"><span class="muted">Client</span><span>${U.esc(U.clientName(WZ.clientId))}</span></div>
          <div class="brk-row"><span class="muted">Risk</span><span>${U.esc(WZ.product)} · ${U.esc(WZ.market)}</span></div>
          <div class="brk-row"><span class="muted">Carrier</span><span>${U.esc(WZ.insurer)}</span></div>
          <div class="brk-row"><span class="muted">Sum insured / limit</span><span>${U.fmtGBP(WZ.sumInsured)}</span></div>
        </div>
        <div style="margin-top:14px">
          <div class="field"><label>Net premium (editable indication)</label>
            <input class="input" id="wzPrem" type="number" min="0" value="${WZ.premium}"></div>
          <div class="quote-summary" style="margin-top:12px" id="wzBrk">${wizardBreakdown(ipt, comm)}</div>
        </div>`,
        `<button class="btn" id="wzBack">&#8592; Back</button>
         <button class="btn" id="wzDraft">Save as Draft</button>
         <button class="btn btn-gold" id="wzPresent">Present to Client</button>`);
      document.getElementById("wzPrem").oninput = e => {
        WZ.premium = +e.target.value || 0;
        document.getElementById("wzBrk").innerHTML = wizardBreakdown(Math.round(WZ.premium * prod.ipt), Math.round(WZ.premium * (WZ.market === DB.MARKETS.RI ? 0.025 : 0.175)));
      };
      document.getElementById("wzBack").onclick = () => { WZ.step = 1; renderWizard(); };
      document.getElementById("wzDraft").onclick = () => saveQuote("Draft");
      document.getElementById("wzPresent").onclick = () => saveQuote("Presented");
    }
  }

  function wizardBreakdown(ipt, comm) {
    const prod = DB.PRODUCTS[WZ.product];
    return `
      <div class="brk-row"><span class="muted">Net premium</span><span>${U.fmtGBP(WZ.premium)}</span></div>
      <div class="brk-row"><span class="muted">${prod.ipt ? "IPT @ " + (prod.ipt * 100) + "%" : "IPT"}</span><span>${prod.ipt ? U.fmtGBP(ipt) : "Exempt"}</span></div>
      <div class="brk-row total"><span>Gross payable</span><span>${U.fmtGBP(WZ.premium + ipt)}</span></div>
      <div class="brk-row"><span class="muted">${WZ.market === DB.MARKETS.RI ? "Brokerage" : "Commission"}</span><span>${U.fmtGBP(comm)}</span></div>`;
  }

  function saveQuote(status) {
    const id = `ALB-Q-2026-0${++seq.quote}`;
    DB.quotes.unshift({ id, clientId: WZ.clientId, product: WZ.product, market: WZ.market, insurer: WZ.insurer, premium: WZ.premium, status, created: new Date(), validUntil: DB.inDays(30), desc: `${WZ.product} — sum insured ${U.fmtGBP(WZ.sumInsured)}` });
    U.closeModal();
    U.toast(`Quote <strong>${id}</strong> ${status === "Draft" ? "saved as draft" : "created and presented to client"}.`);
    location.hash = "#/quotes";
    App.render();
  }

  /* ============================================================ RENEWALS */
  const RSTATUSES = ["All", "Quote ready", "Awaiting client", "Auto-renew", "Re-marketing"];

  VIEWS.renewals = function () {
    const S = STATE.renewals;
    const all = DB.policies.filter(p => p.status === "In Force" && U.daysUntil(p.expiry) >= 0 && U.daysUntil(p.expiry) <= 90)
      .sort((a, b) => a.expiry - b.expiry);
    const buckets = [
      { key: "0-30", label: "Due 0–30 Days", cls: "", list: all.filter(p => U.daysUntil(p.expiry) <= 30) },
      { key: "31-60", label: "Due 31–60 Days", cls: "b2", list: all.filter(p => U.daysUntil(p.expiry) > 30 && U.daysUntil(p.expiry) <= 60) },
      { key: "61-90", label: "Due 61–90 Days", cls: "b3", list: all.filter(p => U.daysUntil(p.expiry) > 60) }
    ];
    let list = S.bucket === "All" ? all : buckets.find(b => b.key === S.bucket).list;
    if (S.status !== "All") list = list.filter(p => p.renewal && p.renewal.status === S.status);

    const bucketCards = buckets.map(b => `
      <div class="bucket ${b.cls}">
        <div class="kpi-label">${b.label}</div>
        <div class="bucket-nums"><span class="bucket-count">${b.list.length}</span>
          <span class="bucket-gwp">${U.fmtGBP(b.list.reduce((s, p) => s + p.premium, 0))} expiring GWP</span></div>
      </div>`).join("");

    const rows = list.map(p => {
      const r = p.renewal || { status: "Auto-renew", premium: Math.round(p.premium * 1.04) };
      const chg = (r.premium - p.premium) / p.premium * 100;
      const hot = r.status === "Re-marketing" || U.daysUntil(p.expiry) <= 3;
      return `<tr>
        <td class="rowlink" data-href="#/policies/${p.id}"><div class="cell-main">${U.esc(U.clientName(p.clientId))}</div><div class="cell-sub">${p.id}</div></td>
        <td>${U.esc(p.product)}</td>
        <td>${U.esc(U.insurerLabel(p))}</td>
        <td class="${hot ? "due-hot" : ""}">${U.dueLabel(p.expiry)}<div class="cell-sub">${U.fmtDate(p.expiry)}</div></td>
        <td class="num">${U.fmtGBP(p.premium)}</td>
        <td class="num"><div>${U.fmtGBP(r.premium)}</div><div>${U.delta(chg, false)}</div></td>
        <td>${U.pill(r.status)}</td>
        <td style="white-space:nowrap">
          <button class="btn btn-sm btn-gold" data-action="renew-now" data-policy="${p.id}">Renew</button>
          <button class="btn btn-sm" data-action="send-terms" data-policy="${p.id}">Send Terms</button>
        </td>
      </tr>`;
    }).join("");

    return `
      <div class="page-head">
        <div><h1 class="page-title">Renewals</h1>
          <div class="page-sub">Pipeline of covers expiring in the next 90 days.</div></div>
        <button class="btn btn-sm" id="exportRenewals">Export CSV</button>
      </div>
      <div class="bucket-grid">${bucketCards}</div>
      <div class="toolbar">
        <div class="tabs" id="rBuckets">${["All", "0-30", "31-60", "61-90"].map(b => `<button class="tab ${S.bucket === b ? "active" : ""}" data-tab="${b}">${b === "All" ? "All" : b + " days"}</button>`).join("")}</div>
        <select class="select" id="rStatus">${RSTATUSES.map(s => `<option ${s === S.status ? "selected" : ""}>${s}</option>`).join("")}</select>
        <span class="chip-count">${list.length} renewals in view</span>
      </div>
      <div class="card"><div class="card-body tbl-wrap" style="padding-top:4px">
        <table class="tbl"><thead><tr>
          <th>Client &amp; Policy</th><th>Product</th><th>Insurer</th><th>Due</th><th class="num">Current</th><th class="num">Renewal</th><th>Status</th><th>Actions</th>
        </tr></thead><tbody>${rows || `<tr><td colspan="8"><div class="empty"><div class="big">Nothing due</div>No renewals match this view.</div></td></tr>`}</tbody></table>
      </div></div>`;
  };

  VIEWS.renewals.after = function () {
    document.querySelectorAll("#rBuckets .tab").forEach(b => b.onclick = () => { STATE.renewals.bucket = b.dataset.tab; App.render(); });
    document.getElementById("rStatus").onchange = e => { STATE.renewals.status = e.target.value; App.render(); };
    document.getElementById("exportRenewals").onclick = () => {
      const all = DB.policies.filter(p => p.status === "In Force" && U.daysUntil(p.expiry) >= 0 && U.daysUntil(p.expiry) <= 90);
      U.exportCSV("renewal-pipeline.csv", ["Policy", "Client", "Product", "Insurer", "Expiry", "Days", "Current GBP", "Renewal GBP", "Status"],
        all.map(p => [p.id, U.clientName(p.clientId), p.product, p.insurer, U.fmtDate(p.expiry), U.daysUntil(p.expiry), p.premium, p.renewal ? p.renewal.premium : "", p.renewal ? p.renewal.status : "Auto-renew"]));
    };
  };

  /* ---------- renewal actions ---------- */
  window.renewalActions = {
    renewNow(id) {
      const p = U.policy(id);
      const newPrem = p.renewal ? p.renewal.premium : Math.round(p.premium * 1.04);
      p.premium = newPrem;
      p.inception = new Date(p.expiry.getTime());
      p.expiry = new Date(p.expiry.getTime() + 365 * DB.DAY);
      p.renewal = null;
      const gross = Math.round(newPrem * (1 + (p.iptRate || 0)));
      DB.invoices.unshift({ id: `ALB-INV-2026-0${++seq.invoice}`, policyId: p.id, clientId: p.clientId, descr: `${p.product} — renewal premium`, amount: gross, issued: new Date(), due: DB.inDays(30), status: "Unpaid" });
      U.toast(`<strong>${p.id}</strong> renewed to ${U.fmtDate(p.expiry)} — invoice raised for ${U.fmtGBP(gross)}.`);
      App.render(); App.refreshBell();
    },
    sendTerms(id) {
      const p = U.policy(id);
      if (p.renewal) p.renewal.status = "Awaiting client";
      U.toast(`Renewal terms for <strong>${p.id}</strong> emailed to ${U.esc(U.clientName(p.clientId))}.`);
      App.render();
    }
  };

  /* ============================================================ CLAIMS */
  const CSTATUSES = ["All", "Open", "Under Review", "Approved", "Settled", "Declined"];

  VIEWS.claims = function () {
    const S = STATE.claims;
    let list = DB.claims.slice().sort((a, b) => b.lossDate - a.lossDate);
    if (S.status !== "All") list = list.filter(x => x.status === S.status);
    if (S.q) { const q = S.q.toLowerCase(); list = list.filter(x => (x.id + " " + U.clientName(x.clientId) + " " + x.peril + " " + x.policyId).toLowerCase().includes(q)); }

    const open = DB.claims.filter(x => ["Open", "Under Review", "Approved"].includes(x.status));
    const reserved = open.reduce((s, x) => s + (x.reserve - x.paid), 0);
    const paidYtd = DB.claims.reduce((s, x) => s + x.paid, 0);

    const rows = list.map(x => `<tr class="rowlink" data-href="#/claims/${x.id}">
      <td><div class="cell-main">${x.id}</div><div class="cell-sub">${x.policyId}</div></td>
      <td>${U.esc(U.clientName(x.clientId))}</td>
      <td>${U.esc(x.peril)}</td>
      <td>${U.fmtDate(x.lossDate)}</td>
      <td class="num">${U.fmtGBP(x.reserve)}</td>
      <td class="num">${x.paid ? U.fmtGBP(x.paid) : "—"}</td>
      <td>${U.pill(x.status)}</td></tr>`).join("");

    return `
      <div class="page-head">
        <div><h1 class="page-title">Claims</h1>
          <div class="page-sub">First notification of loss through to settlement.</div></div>
        <button class="btn btn-navy" data-action="new-claim">Log a Claim (FNOL)</button>
      </div>
      <div class="mini-stats">
        <div class="kpi"><div class="kpi-label">Open Claims</div><div class="kpi-row"><span class="kpi-value">${open.length}</span></div></div>
        <div class="kpi"><div class="kpi-label">Outstanding Reserves</div><div class="kpi-row"><span class="kpi-value">${U.fmtGBP(reserved)}</span></div></div>
        <div class="kpi"><div class="kpi-label">Paid YTD</div><div class="kpi-row"><span class="kpi-value">${U.fmtGBP(paidYtd)}</span></div></div>
        <div class="kpi"><div class="kpi-label">Settled This Year</div><div class="kpi-row"><span class="kpi-value">${DB.claims.filter(x => x.status === "Settled").length}</span></div></div>
      </div>
      <div class="toolbar">
        <div class="tabs" id="clTabs">${CSTATUSES.map(s => `<button class="tab ${S.status === s ? "active" : ""}" data-tab="${s}">${s}</button>`).join("")}</div>
        <input class="input" id="clSearch" style="width:220px" placeholder="Search ref, client, peril…" value="${U.esc(S.q)}">
        <span class="spacer"></span>
        <button class="btn btn-sm" id="exportClaims">Export CSV</button>
      </div>
      <div class="card"><div class="card-body tbl-wrap" style="padding-top:4px">
        <table class="tbl"><thead><tr>
          <th>Claim</th><th>Client</th><th>Peril</th><th>Date of Loss</th><th class="num">Reserve</th><th class="num">Paid</th><th>Status</th>
        </tr></thead><tbody>${rows || `<tr><td colspan="7"><div class="empty">No claims match this view.</div></td></tr>`}</tbody></table>
      </div></div>`;
  };

  VIEWS.claims.after = function () {
    document.querySelectorAll("#clTabs .tab").forEach(b => b.onclick = () => { STATE.claims.status = b.dataset.tab; App.render(); });
    document.getElementById("clSearch").oninput = e => { STATE.claims.q = e.target.value; App.render(); const el = document.getElementById("clSearch"); el.focus(); el.setSelectionRange(el.value.length, el.value.length); };
    document.getElementById("exportClaims").onclick = () => {
      U.exportCSV("claims.csv", ["Claim", "Policy", "Client", "Peril", "Date of Loss", "Reserve GBP", "Paid GBP", "Status"],
        DB.claims.map(x => [x.id, x.policyId, U.clientName(x.clientId), x.peril, U.fmtDate(x.lossDate), x.reserve, x.paid, x.status]));
    };
  };

  /* ---------- claim detail ---------- */
  VIEWS.claimDetail = function (id) {
    const x = DB.claims.find(c => c.id === id);
    if (!x) return `<div class="empty"><div class="big">Claim not found</div></div>`;
    const p = U.policy(x.policyId);
    const tl = (x.timeline || []).slice().sort((a, b) => a[0] - b[0]).map(([days, what, note]) => `
      <li><div class="tl-when">${U.fmtDate(DB.inDays(days))}</div>
        <div class="tl-what">${U.esc(what)}</div>${note ? `<div class="tl-note">${U.esc(note)}</div>` : ""}</li>`).join("");

    return `
      <a class="back-link" href="#/claims">&#8592; All claims</a>
      <div class="detail-head">
        <div><div class="detail-title">${x.id}</div>
          <div class="detail-sub">${U.esc(x.peril)} · ${U.esc(U.clientName(x.clientId))} ${U.pill(x.status)}</div></div>
        <div class="detail-actions">
          ${["Open", "Under Review", "Approved"].includes(x.status) ? `<button class="btn btn-gold" data-action="settle-claim" data-claim="${x.id}">Mark as Settled</button>` : ""}
          <button class="btn" data-action="download-doc" data-doc="Claim file — ${x.id}.pdf">Download Claim File</button>
        </div>
      </div>
      <div class="two-col">
        <div class="stack">
          <div class="card">
            <div class="card-head"><div class="card-title">Claim Details</div></div>
            <div class="card-body">
              <div class="info-grid">
                <div class="info-item"><div class="lbl">Client</div><div class="val"><a href="#/clients/${x.clientId}" style="text-decoration:underline;text-underline-offset:3px">${U.esc(U.clientName(x.clientId))}</a></div></div>
                <div class="info-item"><div class="lbl">Policy</div><div class="val"><a href="#/policies/${x.policyId}" style="text-decoration:underline;text-underline-offset:3px">${x.policyId}</a></div></div>
                <div class="info-item"><div class="lbl">Market</div><div class="val">${p ? U.esc(p.market) : "—"}</div></div>
                <div class="info-item"><div class="lbl">Peril</div><div class="val">${U.esc(x.peril)}</div></div>
                <div class="info-item"><div class="lbl">Date of Loss</div><div class="val">${U.fmtDate(x.lossDate)}</div></div>
                <div class="info-item"><div class="lbl">Reported</div><div class="val">${U.fmtDate(x.reported)}</div></div>
                <div class="info-item"><div class="lbl">Loss Adjuster</div><div class="val">${U.esc(x.adjuster)}</div></div>
              </div>
              <div style="margin-top:16px;padding-top:14px;border-top:1px solid var(--line-soft);color:var(--ink-2);font-size:13px">${U.esc(x.desc)}</div>
            </div>
          </div>
          <div class="card">
            <div class="card-head"><div class="card-title">Timeline</div></div>
            <div class="card-body"><ul class="timeline">${tl || "<li><div class='tl-what'>FNOL received</div></li>"}</ul></div>
          </div>
        </div>
        <div class="stack">
          <div class="card">
            <div class="card-head"><div class="card-title">Financials</div></div>
            <div class="card-body">
              <div class="brk-row"><span class="muted">Reserve</span><span>${U.fmtGBP(x.reserve)}</span></div>
              <div class="brk-row"><span class="muted">Paid to date</span><span>${U.fmtGBP(x.paid)}</span></div>
              <div class="brk-row"><span class="muted">Policy excess</span><span>${U.fmtGBP(x.excess)}</span></div>
              <div class="brk-row total"><span>Outstanding</span><span>${U.fmtGBP(Math.max(0, x.reserve - x.paid))}</span></div>
            </div>
          </div>
        </div>
      </div>`;
  };

  /* ---------- FNOL ---------- */
  window.openFnol = function (clientId, policyId) {
    const cid = clientId || DB.clients[0].id;
    const renderForm = (selClient, selPolicy) => {
      const pols = U.clientPolicies(selClient).filter(p => p.status === "In Force" || p.status === "Pending");
      U.openModal("Log a Claim — FNOL",
        `<div class="form-grid">
          <div class="field full"><label>Client</label>
            <select class="select" id="fnClient">${DB.clients.map(c => `<option value="${c.id}" ${c.id === selClient ? "selected" : ""}>${U.esc(c.name)}</option>`).join("")}</select></div>
          <div class="field full"><label>Policy</label>
            <select class="select" id="fnPolicy">${pols.map(p => `<option value="${p.id}" ${p.id === selPolicy ? "selected" : ""}>${p.id} — ${U.esc(p.product)}</option>`).join("") || "<option value=''>No in-force policies</option>"}</select></div>
          <div class="field"><label>Peril / cause</label>
            <select class="select" id="fnPeril">${["Collision", "Theft", "Fire", "Storm", "Escape of water", "Heavy weather", "Liability", "Professional negligence", "Medical treatment", "Other"].map(x => `<option>${x}</option>`).join("")}</select></div>
          <div class="field"><label>Date of loss</label><input class="input" id="fnDate" type="date" value="${new Date().toISOString().slice(0, 10)}"></div>
          <div class="field full"><label>Initial estimate (£)</label><input class="input" id="fnEst" type="number" min="0" value="1000"></div>
          <div class="field full"><label>Circumstances</label><textarea id="fnDesc" placeholder="Brief description of what happened…"></textarea></div>
        </div>`,
        `<button class="btn" data-action="close-modal">Cancel</button>
         <button class="btn btn-navy" id="fnSubmit">Submit FNOL</button>`);
      document.getElementById("fnClient").onchange = e => renderForm(e.target.value, "");
      document.getElementById("fnSubmit").onclick = () => {
        const polId = document.getElementById("fnPolicy").value;
        if (!polId) { U.toast("Select a policy with in-force cover first.", "warn"); return; }
        const id = `ALB-CLM-2026-0${++seq.claim}`;
        DB.claims.unshift({
          id, policyId: polId, clientId: document.getElementById("fnClient").value,
          peril: document.getElementById("fnPeril").value,
          lossDate: new Date(document.getElementById("fnDate").value), reported: new Date(),
          status: "Open", reserve: +document.getElementById("fnEst").value || 0, paid: 0, excess: 250,
          adjuster: "To be appointed", desc: document.getElementById("fnDesc").value || "Details to follow.",
          timeline: [[0, "FNOL received", "Logged via broker portal by Eleanor Whitcombe"]]
        });
        U.closeModal();
        U.toast(`Claim <strong>${id}</strong> logged — insurer notified.`);
        location.hash = "#/claims/" + id;
        App.render(); App.refreshBell();
      };
    };
    renderForm(cid, policyId || "");
  };

  window.claimActions = {
    settle(id) {
      const x = DB.claims.find(c => c.id === id);
      x.status = "Settled"; x.paid = x.reserve;
      (x.timeline = x.timeline || []).push([0, "Settled", "Settlement of " + U.fmtGBP(x.reserve) + " agreed and paid"]);
      U.toast(`Claim <strong>${id}</strong> settled for ${U.fmtGBP(x.reserve)}.`);
      App.render();
    }
  };

  /* ============================================================ PAYMENTS */
  VIEWS.payments = function () {
    const S = STATE.payments;
    const withStatus = DB.invoices.map(i => ({ i, st: U.invoiceStatus(i) }));
    let list = withStatus;
    if (S.status !== "All") list = list.filter(r => r.st === S.status);

    const collected = withStatus.filter(r => r.st === "Paid").reduce((s, r) => s + r.i.amount, 0);
    const outstanding = withStatus.reduce((s, r) => s + U.invoiceBalance(r.i), 0);
    const overdue = withStatus.filter(r => r.st === "Overdue").reduce((s, r) => s + U.invoiceBalance(r.i), 0);
    const commission = DB.policies.filter(p => p.status !== "Lapsed" && p.status !== "Cancelled").reduce((s, p) => s + p.premium * p.commission, 0);

    // aged debt buckets on unpaid balances
    const aged = [0, 0, 0, 0];
    withStatus.forEach(r => {
      const bal = U.invoiceBalance(r.i); if (!bal) return;
      const d = -U.daysUntil(r.i.due);
      aged[d <= 0 ? 0 : d <= 30 ? 1 : d <= 60 ? 2 : 3] += bal;
    });
    const agedTotal = aged.reduce((a, b) => a + b, 0) || 1;
    const agedColors = ["var(--s3)", "var(--s2)", "var(--s5)", "var(--red)"];
    const agedLabels = ["Not yet due", "1–30 days", "31–60 days", "60+ days"];

    const rows = list.sort((a, b) => a.i.due - b.i.due).map(({ i, st }) => `<tr>
      <td><div class="cell-main">${i.id}</div><div class="cell-sub">${i.policyId}</div></td>
      <td><div class="cell-main" style="font-weight:500">${U.esc(U.clientName(i.clientId))}</div><div class="cell-sub" style="text-transform:none;letter-spacing:0">${U.esc(i.descr)}</div></td>
      <td class="${st === "Overdue" ? "due-hot" : ""}">${U.fmtDate(i.due)}</td>
      <td class="num">${U.fmtGBP(i.amount)}</td>
      <td class="num">${U.fmtGBP(U.invoiceBalance(i))}</td>
      <td>${U.pill(st)}${i.method ? `<div class="cell-sub">${i.method}</div>` : ""}</td>
      <td style="white-space:nowrap">${st !== "Paid"
        ? `<button class="btn btn-sm btn-gold" data-action="record-payment" data-invoice="${i.id}">Record Payment</button>
           <button class="btn btn-sm btn-ghost" data-action="send-reminder" data-invoice="${i.id}">Remind</button>`
        : `<span class="chip-count">Settled ${U.fmtDate(i.paidOn)}</span>`}</td>
    </tr>`).join("");

    return `
      <div class="page-head">
        <div><h1 class="page-title">Payments</h1>
          <div class="page-sub">Premium collection, client money and commission tracking.</div></div>
        <button class="btn btn-sm" id="exportInvoices">Export CSV</button>
      </div>
      <div class="mini-stats">
        <div class="kpi"><div class="kpi-label">Collected (sample)</div><div class="kpi-row"><span class="kpi-value">${U.fmtGBP(collected)}</span></div></div>
        <div class="kpi"><div class="kpi-label">Outstanding</div><div class="kpi-row"><span class="kpi-value">${U.fmtGBP(outstanding)}</span></div></div>
        <div class="kpi"><div class="kpi-label">Of which Overdue</div><div class="kpi-row"><span class="kpi-value" style="color:var(--red)">${U.fmtGBP(overdue)}</span></div></div>
        <div class="kpi"><div class="kpi-label">Commission (annualised)</div><div class="kpi-row"><span class="kpi-value">${U.fmtGBP(commission)}</span></div></div>
      </div>

      <div class="card" style="margin-bottom:16px">
        <div class="card-head"><div><div class="card-title">Aged Debt</div><div class="card-sub">Unpaid balances by days overdue</div></div></div>
        <div class="card-body">
          <div class="aged">${aged.map((v, k) => v ? `<span style="width:${Math.max(2, v / agedTotal * 100)}%;background:${agedColors[k]}" data-tip="<span class='tt-title'>${agedLabels[k]}</span><br>${U.fmtGBP(v)}"></span>` : "").join("")}</div>
          <div class="chart-legend">${agedLabels.map((l, k) => `<span class="lg"><span class="legend-dot" style="background:${agedColors[k]}"></span>${l} · ${U.fmtGBP(aged[k])}</span>`).join("")}</div>
        </div>
      </div>

      <div class="toolbar">
        <div class="tabs" id="payTabs">${["All", "Outstanding", "Overdue", "Part-paid", "Paid"].map(s => `<button class="tab ${S.status === s ? "active" : ""}" data-tab="${s}">${s}</button>`).join("")}</div>
        <span class="chip-count">${list.length} invoices</span>
      </div>
      <div class="card"><div class="card-body tbl-wrap" style="padding-top:4px">
        <table class="tbl"><thead><tr>
          <th>Invoice</th><th>Client</th><th>Due</th><th class="num">Amount</th><th class="num">Balance</th><th>Status</th><th>Actions</th>
        </tr></thead><tbody>${rows || `<tr><td colspan="7"><div class="empty">No invoices in this state.</div></td></tr>`}</tbody></table>
      </div></div>`;
  };

  VIEWS.payments.after = function () {
    document.querySelectorAll("#payTabs .tab").forEach(b => b.onclick = () => { STATE.payments.status = b.dataset.tab; App.render(); });
    document.getElementById("exportInvoices").onclick = () => {
      U.exportCSV("invoices.csv", ["Invoice", "Policy", "Client", "Description", "Due", "Amount GBP", "Balance GBP", "Status"],
        DB.invoices.map(i => [i.id, i.policyId, U.clientName(i.clientId), i.descr, U.fmtDate(i.due), i.amount, U.invoiceBalance(i), U.invoiceStatus(i)]));
    };
  };

  window.paymentActions = {
    record(id) {
      const i = DB.invoices.find(v => v.id === id);
      i.status = "Paid"; i.paidOn = new Date(); i.method = i.method || "BACS"; i.paidAmount = i.amount;
      U.toast(`Payment of <strong>${U.fmtGBP(i.amount)}</strong> recorded against ${i.id}.`);
      App.render(); App.refreshBell();
    },
    remind(id) {
      const i = DB.invoices.find(v => v.id === id);
      U.toast(`Payment reminder for <strong>${i.id}</strong> emailed to ${U.esc(U.clientName(i.clientId))}.`);
    }
  };

  /* ============================================================ REPORTS */
  VIEWS.reports = function () {
    const B = DB.bookStats;

    /* --- GWP by line: horizontal bars --- */
    const maxGwp = Math.max(...B.gwpByLine.map(r => r.gwp));
    const barRows = B.gwpByLine.map(r => `
      <div style="display:flex;align-items:center;gap:12px;padding:7px 0">
        <span style="width:150px;flex:0 0 150px;font-size:12.5px;color:var(--ink-2)">${r.name}</span>
        <div style="flex:1;display:flex;align-items:center;gap:9px">
          <div class="bar-hit" style="width:${r.gwp / maxGwp * 100}%;max-width:calc(100% - 70px);height:18px;background:${r.color};border-radius:0 4px 4px 0"
               data-tip="<span class='tt-title'>${r.name}</span><br>${U.fmtGBP(r.gwp)} GWP"></div>
          <span style="font-size:12px;font-weight:600;white-space:nowrap">${U.fmtM(r.gwp)}</span>
        </div>
      </div>`).join("");

    /* --- Market split donut --- */
    const donut = donutSvg(B.marketSplit);

    /* --- 12-month GWP trend columns --- */
    const trend = trendSvg(B.gwpTrend);

    /* --- Top clients --- */
    const top = DB.clients.map(c => {
      const pols = U.clientPolicies(c.id).filter(p => p.status === "In Force" || p.status === "Pending");
      return { c, gwp: pols.reduce((s, p) => s + p.premium, 0), n: pols.length, comm: pols.reduce((s, p) => s + p.premium * p.commission, 0) };
    }).filter(r => r.gwp > 0).sort((a, b) => b.gwp - a.gwp).slice(0, 8);
    const maxTop = top[0] ? top[0].gwp : 1;
    const topRows = top.map((r, idx) => `<tr class="rowlink" data-href="#/clients/${r.c.id}">
      <td style="color:var(--ink-3)">${idx + 1}</td>
      <td><div class="cell-main">${U.esc(r.c.name)}</div><div class="cell-sub">${r.c.city} · ${r.c.region}</div></td>
      <td class="num">${r.n}</td>
      <td class="num">${U.fmtGBP(r.gwp)}</td>
      <td class="num">${U.fmtGBP(r.comm)}</td>
      <td style="width:26%"><div class="pf-track" style="margin:0"><div class="pf-fill" style="width:${r.gwp / maxTop * 100}%;background:var(--s1)"></div></div></td>
    </tr>`).join("");

    return `
      <div class="page-head">
        <div><h1 class="page-title">Reports</h1>
          <div class="page-sub">Book analytics — production, markets and top relationships.</div></div>
        <div class="page-meta">Book-level figures · month ending ${U.fmtDate(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0))}</div>
      </div>

      <div class="reports-grid">
        <div class="card chart-card">
          <div class="card-head"><div><div class="card-title">GWP by Product Line</div><div class="card-sub">Whole book, annualised</div></div></div>
          <div class="card-body">${barRows}</div>
        </div>
        <div class="card chart-card">
          <div class="card-head"><div><div class="card-title">GWP by Market</div><div class="card-sub">Placement split across capacity</div></div></div>
          <div class="card-body">${donut}</div>
        </div>
      </div>

      <div class="card chart-card" style="margin-bottom:16px">
        <div class="card-head"><div><div class="card-title">Monthly GWP Written</div><div class="card-sub">Trailing 12 months · current month is part-complete</div></div></div>
        <div class="card-body">${trend}</div>
      </div>

      <div class="card">
        <div class="card-head"><div><div class="card-title">Top Clients by GWP</div><div class="card-sub">Working sample — live placements</div></div>
          <button class="btn btn-sm" id="exportTop">Export CSV</button></div>
        <div class="card-body tbl-wrap">
          <table class="tbl"><thead><tr><th>#</th><th>Client</th><th class="num">Policies</th><th class="num">Annual GWP</th><th class="num">Commission</th><th></th></tr></thead>
          <tbody>${topRows}</tbody></table>
        </div>
      </div>`;
  };

  VIEWS.reports.after = function () {
    document.getElementById("exportTop").onclick = () => {
      const top = DB.clients.map(c => {
        const pols = U.clientPolicies(c.id).filter(p => p.status === "In Force" || p.status === "Pending");
        return [c.name, pols.length, pols.reduce((s, p) => s + p.premium, 0), Math.round(pols.reduce((s, p) => s + p.premium * p.commission, 0))];
      }).filter(r => r[2] > 0).sort((a, b) => b[2] - a[2]);
      U.exportCSV("top-clients.csv", ["Client", "Policies", "Annual GWP", "Commission GBP"], top);
    };
  };

  function donutSvg(split) {
    const cx = 90, cy = 90, r = 66, w = 26;
    const total = split.reduce((s, m) => s + m.share, 0);
    const gapDeg = 2.4; // ~2px surface gap at this radius
    let a = -90;
    const segs = split.map(m => {
      const sweep = m.share / total * 360 - gapDeg;
      const path = arc(cx, cy, r, a + gapDeg / 2, a + gapDeg / 2 + sweep);
      a += m.share / total * 360;
      return `<path d="${path}" fill="none" stroke="${cssVar(m.color)}" stroke-width="${w}" class="bar-hit"
        data-tip="<span class='tt-title'>${m.name}</span><br>${m.share}% · ${U.fmtM(m.gwp)} GWP"/>`;
    }).join("");
    const legend = split.map(m => `<span class="lg"><span class="legend-dot" style="background:${m.color}"></span>${m.name} · ${m.share}%</span>`).join("");
    return `<div style="display:flex;align-items:center;gap:22px;flex-wrap:wrap">
      <svg width="180" height="180" viewBox="0 0 180 180" role="img" aria-label="GWP split by market">${segs}
        <text x="90" y="86" text-anchor="middle" style="font:600 20px var(--sans);fill:var(--ink)">${U.fmtM(split.reduce((s, m) => s + m.gwp, 0))}</text>
        <text x="90" y="104" text-anchor="middle" style="font:500 10.5px var(--sans);fill:var(--ink-3)">TOTAL GWP</text></svg>
      <div class="chart-legend" style="flex-direction:column;align-items:flex-start;gap:9px">${legend}</div>
    </div>`;
  }

  function arc(cx, cy, r, a0, a1) {
    const rad = d => d * Math.PI / 180;
    const x0 = cx + r * Math.cos(rad(a0)), y0 = cy + r * Math.sin(rad(a0));
    const x1 = cx + r * Math.cos(rad(a1)), y1 = cy + r * Math.sin(rad(a1));
    return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
  }

  function cssVar(v) {
    const m = v.match(/var\((.+)\)/);
    return m ? getComputedStyle(document.documentElement).getPropertyValue(m[1]).trim() : v;
  }

  function trendSvg(data) {
    const W = 920, H = 220, padL = 46, padB = 26, padT = 14;
    const plotW = W - padL - 12, plotH = H - padT - padB;
    const maxV = 450000; // clean axis: 0 / 150k / 300k / 450k
    const months = [];
    const now = new Date();
    for (let k = 11; k >= 0; k--) months.push(new Date(now.getFullYear(), now.getMonth() - k, 1).toLocaleDateString("en-GB", { month: "short" }));
    const bw = Math.min(24, plotW / data.length - 8);
    const ticks = [0, 150000, 300000, 450000];
    const grid = ticks.map(t => {
      const y = padT + plotH - t / maxV * plotH;
      return `<line x1="${padL}" x2="${W - 12}" y1="${y}" y2="${y}" stroke="var(--grid)" stroke-width="1"/>
        <text x="${padL - 8}" y="${y + 3.5}" text-anchor="end" style="font:500 10px var(--sans);fill:var(--ink-3)">${t === 0 ? "0" : "£" + t / 1000 + "k"}</text>`;
    }).join("");
    const cols = data.map((d, k) => {
      const h = d.gwp / maxV * plotH;
      const x = padL + (k + 0.5) * (plotW / data.length) - bw / 2;
      const y = padT + plotH - h;
      const cur = k === data.length - 1;
      return `<path class="bar-hit" d="M ${x} ${y + 4} a 4 4 0 0 1 4 -4 h ${bw - 8} a 4 4 0 0 1 4 4 v ${Math.max(0, h - 4)} h ${-bw} Z"
          fill="${cur ? "#b9c8e2" : cssVar("var(--s1)")}"
          data-tip="<span class='tt-title'>${months[k]}</span><br>${U.fmtGBP(d.gwp)} written${cur ? " · month to date" : ""}"/>
        <text x="${padL + (k + 0.5) * (plotW / data.length)}" y="${H - 8}" text-anchor="middle" style="font:500 10px var(--sans);fill:var(--ink-3)">${months[k]}</text>
        ${k === data.length - 2 ? `<text x="${x + bw / 2}" y="${y - 6}" text-anchor="middle" style="font:600 10.5px var(--sans);fill:var(--ink-2)">${U.fmtM(d.gwp)}</text>` : ""}`;
    }).join("");
    return `<div style="overflow-x:auto"><svg width="100%" viewBox="0 0 ${W} ${H}" role="img" aria-label="Monthly gross written premium, trailing 12 months" style="min-width:640px">
      ${grid}
      <line x1="${padL}" x2="${W - 12}" y1="${padT + plotH}" y2="${padT + plotH}" stroke="var(--line)" stroke-width="1"/>
      ${cols}</svg></div>`;
  }

  /* ============================================================ SETTINGS */
  VIEWS.settings = function () {
    const team = [
      ["Eleanor Whitcombe", "Senior Broker · Administrator", "EW"],
      ["James Ashworth", "Account Executive", "JA"],
      ["Priya Nair", "Account Executive", "PN"],
      ["Sofia Keller", "European Placements", "SK"],
      ["Tom Okafor", "Claims Handler", "TO"]
    ].map(([n, r, i]) => `<div class="pf-row">
      <div class="detail-avatar" style="width:32px;height:32px;flex:0 0 32px;font-size:11px">${i}</div>
      <div class="pf-main"><div class="pf-top"><span class="pf-name" style="font-size:13px">${n}</span></div>
      <div class="pf-bottom"><span>${r}</span></div></div></div>`).join("");

    return `
      <div class="page-head">
        <div><h1 class="page-title">Settings</h1>
          <div class="page-sub">Firm profile, preferences and team.</div></div>
      </div>
      <div class="two-col">
        <div class="stack">
          <div class="card">
            <div class="card-head"><div class="card-title">Firm Profile</div></div>
            <div class="card-body"><div class="info-grid">
              <div class="info-item"><div class="lbl">Trading Name</div><div class="val">Albright &amp; Hayes Insurance Brokers Ltd</div></div>
              <div class="info-item"><div class="lbl">FCA Registration</div><div class="val">712483</div></div>
              <div class="info-item"><div class="lbl">Lloyd's Broker Number</div><div class="val">0713</div></div>
              <div class="info-item"><div class="lbl">Registered Office</div><div class="val">14 Leadenhall Street, London EC3A 1AT</div></div>
              <div class="info-item"><div class="lbl">EEA Branch</div><div class="val">Amsterdam, Netherlands (BiPAR member)</div></div>
              <div class="info-item"><div class="lbl">Client Money</div><div class="val">CASS 5 statutory trust</div></div>
            </div></div>
          </div>
          <div class="card">
            <div class="card-head"><div class="card-title">Preferences</div></div>
            <div class="card-body">
              ${[["Renewal reminders", "Email the account exec 30/14/7 days before expiry", true],
                 ["Auto-chase unpaid invoices", "Send reminders 3 days after due date", true],
                 ["Lloyd's ECF notifications", "Push claim updates from the Electronic Claim File", true],
                 ["Weekly book report", "Email a PDF production summary every Monday", false]]
                .map(([n, d, on]) => `<div class="set-row"><div><div class="set-name">${n}</div><div class="set-desc">${d}</div></div>
                  <button class="toggle ${on ? "on" : ""}" data-action="toggle"></button></div>`).join("")}
            </div>
          </div>
        </div>
        <div class="stack">
          <div class="card">
            <div class="card-head"><div class="card-title">Team</div></div>
            <div class="card-body">${team}</div>
          </div>
          <div class="card">
            <div class="card-head"><div class="card-title">Demo Data</div></div>
            <div class="card-body">
              <p style="font-size:12.5px;color:var(--ink-2);margin-bottom:12px">This portal runs on an in-memory sample book. Changes you make (renewals, claims, payments) persist until the page is refreshed.</p>
              <button class="btn" onclick="location.reload()">Reset Demo Data</button>
            </div>
          </div>
        </div>
      </div>`;
  };
})();
