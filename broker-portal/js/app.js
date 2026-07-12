/* ============================================================
   App shell — router, global search, notifications, actions
   ============================================================ */
(function () {
  const U = UI;

  /* ---------- router ---------- */
  function parseHash() {
    const h = (location.hash || "#/dashboard").replace(/^#\//, "");
    const [page, id] = h.split("/");
    return { page: page || "dashboard", id: id ? decodeURIComponent(id) : null };
  }

  function render() {
    const { page, id } = parseHash();
    const view = document.getElementById("view");
    let fn, arg = id, navKey = page;

    if (page === "clients" && id) fn = VIEWS.clientDetail;
    else if (page === "policies" && id) fn = VIEWS.policyDetail;
    else if (page === "claims" && id) fn = VIEWS.claimDetail;
    else fn = VIEWS[page] || VIEWS.dashboard;
    if (!VIEWS[page] && !(page === "clients" || page === "policies" || page === "claims")) navKey = "dashboard";

    view.innerHTML = fn(arg);
    if (fn.after) fn.after(arg);

    document.querySelectorAll("#sideNav .nav-item").forEach(a =>
      a.classList.toggle("active", a.dataset.route === navKey));
  }

  window.addEventListener("hashchange", () => { render(); window.scrollTo(0, 0); });

  /* ---------- delegated actions ---------- */
  document.addEventListener("click", e => {
    const act = e.target.closest("[data-action]");
    if (act) {
      const d = act.dataset;
      switch (d.action) {
        case "new-quote": openQuoteWizard(d.client); break;
        case "close-modal": U.closeModal(); break;
        case "new-claim": openFnol(d.client, d.policy); break;
        case "renew-now": renewalActions.renewNow(d.policy); break;
        case "send-terms": renewalActions.sendTerms(d.policy); break;
        case "quote-present": quoteActions.present(d.quote); break;
        case "quote-bind": quoteActions.bind(d.quote); break;
        case "quote-decline": quoteActions.decline(d.quote); break;
        case "record-payment": paymentActions.record(d.invoice); break;
        case "send-reminder": paymentActions.remind(d.invoice); break;
        case "settle-claim": claimActions.settle(d.claim); break;
        case "download-doc": U.toast(`Preparing <strong>${U.esc(d.doc)}</strong> — download will start shortly.`); break;
        case "toggle": act.classList.toggle("on"); break;
      }
      return;
    }
    // row navigation (ignore clicks on buttons/links inside the row)
    const row = e.target.closest("[data-href]");
    if (row && !e.target.closest("button, a, select, input")) location.hash = row.dataset.href;
  });

  // modal: overlay click + Esc
  document.getElementById("modalOverlay").addEventListener("click", e => { if (e.target.id === "modalOverlay") U.closeModal(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") { U.closeModal(); closeSearch(); closeBell(); } });

  /* ---------- global search ---------- */
  const searchInput = document.getElementById("globalSearch");
  const searchResults = document.getElementById("searchResults");

  function closeSearch() { searchResults.classList.remove("open"); }

  function runSearch(q) {
    q = q.trim().toLowerCase();
    if (q.length < 2) { closeSearch(); return; }
    const grp = (title, items) => items.length ? `<div class="sr-group">${title}</div>` + items.join("") : "";

    const clients = DB.clients
      .filter(c => (c.name + " " + c.city + " " + c.country).toLowerCase().includes(q)).slice(0, 4)
      .map(c => `<div class="sr-item" data-go="#/clients/${c.id}"><span class="sr-main">${U.esc(c.name)}</span><span class="sr-sub">${c.city} · ${c.type}</span></div>`);
    const policies = DB.policies
      .filter(p => (p.id + " " + U.clientName(p.clientId) + " " + p.product + " " + p.insurer + " " + (p.umr || "")).toLowerCase().includes(q)).slice(0, 5)
      .map(p => `<div class="sr-item" data-go="#/policies/${p.id}"><span class="sr-main">${p.id}</span><span class="sr-sub">${U.esc(U.clientName(p.clientId))} · ${U.esc(p.product)}</span></div>`);
    const claims = DB.claims
      .filter(x => (x.id + " " + U.clientName(x.clientId) + " " + x.peril).toLowerCase().includes(q)).slice(0, 4)
      .map(x => `<div class="sr-item" data-go="#/claims/${x.id}"><span class="sr-main">${x.id}</span><span class="sr-sub">${U.esc(x.peril)} · ${x.status}</span></div>`);
    const quotes = DB.quotes
      .filter(x => (x.id + " " + U.clientName(x.clientId) + " " + x.product).toLowerCase().includes(q)).slice(0, 3)
      .map(x => `<div class="sr-item" data-go="#/quotes"><span class="sr-main">${x.id}</span><span class="sr-sub">${U.esc(x.product)} · ${x.status}</span></div>`);

    const html = grp("Clients", clients) + grp("Policies", policies) + grp("Claims", claims) + grp("Quotes", quotes);
    searchResults.innerHTML = html || `<div class="sr-empty">No matches for “${U.esc(q)}”.</div>`;
    searchResults.classList.add("open");
  }

  searchInput.addEventListener("input", e => runSearch(e.target.value));
  searchInput.addEventListener("focus", e => runSearch(e.target.value));
  document.addEventListener("mousedown", e => {
    const go = e.target.closest("[data-go]");
    if (go) { location.hash = go.dataset.go; searchInput.value = ""; closeSearch(); e.preventDefault(); return; }
    if (!e.target.closest("#searchWrap")) closeSearch();
    if (!e.target.closest("#bellBtn, .bell-panel")) closeBell();
  });

  /* ---------- notifications ---------- */
  const bellPanel = document.getElementById("bellPanel");
  function closeBell() { bellPanel.classList.remove("open"); }

  function notifications() {
    const items = [];
    DB.policies.filter(p => p.status === "In Force" && U.daysUntil(p.expiry) >= 0 && U.daysUntil(p.expiry) <= 7)
      .forEach(p => items.push({
        kind: "warn", icon: "&#8635;", go: "#/policies/" + p.id,
        txt: `<strong>${U.esc(U.clientName(p.clientId))}</strong> — ${U.esc(p.product)} renewal due`, when: U.dueLabel(p.expiry)
      }));
    DB.invoices.filter(i => U.invoiceStatus(i) === "Overdue")
      .forEach(i => items.push({
        kind: "due", icon: "&pound;", go: "#/payments",
        txt: `<strong>${i.id}</strong> overdue — ${U.fmtGBP(U.invoiceBalance(i))} from ${U.esc(U.clientName(i.clientId))}`, when: U.dueLabel(i.due)
      }));
    DB.claims.filter(x => x.status === "Open" && x.reserve >= 40000)
      .forEach(x => items.push({
        kind: "info", icon: "&#9888;", go: "#/claims/" + x.id,
        txt: `Large loss <strong>${x.id}</strong> — reserve ${U.fmtGBP(x.reserve)}`, when: U.esc(x.peril)
      }));
    return items;
  }

  function refreshBell() {
    const items = notifications();
    const badge = document.getElementById("bellBadge");
    badge.textContent = items.length;
    badge.style.display = items.length ? "flex" : "none";
    bellPanel.innerHTML = `<div class="bp-head">Notifications (${items.length})</div>` +
      (items.map(n => `<div class="bp-item" data-go="${n.go}">
        <div class="bp-ico ${n.kind}">${n.icon}</div>
        <div><div class="bp-txt">${n.txt}</div><div class="bp-when">${n.when}</div></div>
      </div>`).join("") || `<div class="sr-empty">All clear — nothing needs attention.</div>`);
  }

  document.getElementById("bellBtn").addEventListener("click", () => {
    refreshBell();
    bellPanel.classList.toggle("open");
  });

  /* ---------- boot ---------- */
  window.App = { render, refreshBell };
  if (!location.hash) location.hash = "#/dashboard";
  refreshBell();
  render();
})();
