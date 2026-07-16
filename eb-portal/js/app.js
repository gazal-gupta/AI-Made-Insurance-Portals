/* ============================================================
   App shell — router, global search, notifications, delegated actions
   ============================================================ */
(function () {
  const U = UI;

  /* ---------- router ---------- */
  function parseHash() {
    const h = (location.hash || "#/dashboard").replace(/^#\//, "");
    const parts = h.split("/").map(s => decodeURIComponent(s));
    return { page: parts[0] || "dashboard", a: parts[1] || null, b: parts[2] || null };
  }

  function render() {
    const { page, a, b } = parseHash();
    const view = document.getElementById("view");
    let html, navKey = page;

    if (page === "case" && a) {
      const kase = U.kase(a);
      if (!kase) { html = VIEWS.notFound(a); navKey = "pipeline"; }
      else {
        const screen = b || JOURNEY.currentStepKey(kase);
        html = VIEWS.caseShell(kase, screen);
        navKey = "pipeline";
      }
    } else if (VIEWS[page]) {
      html = VIEWS[page]();
    } else {
      html = VIEWS.dashboard();
      navKey = "dashboard";
    }

    view.innerHTML = html;
    if (VIEWS.after) { VIEWS.after(); VIEWS.after = null; }

    document.querySelectorAll("#sideNav .nav-item").forEach(el =>
      el.classList.toggle("active", el.dataset.route === navKey));
    refreshBell();
    refreshUser();
  }

  /* ---------- role switcher (demonstrates RBAC per FRD §10.3) ---------- */
  const roleSwitch = document.getElementById("roleSwitch");
  roleSwitch.innerHTML = DB.PERSONAS.map(p => `<option value="${p.id}">${p.name} — ${p.role}</option>`).join("");
  roleSwitch.value = DB.CURRENT_USER.id;
  roleSwitch.addEventListener("change", () => {
    const p = DB.PERSONAS.find(x => x.id === roleSwitch.value);
    Object.assign(DB.CURRENT_USER, p);
    U.toast(`Switched to <strong>${U.esc(p.name)}</strong> — ${U.esc(p.role)}.`);
    render();
  });
  function refreshUser() {
    document.getElementById("sideUserAvatar").textContent = DB.CURRENT_USER.initials;
    document.getElementById("sideUserName").textContent = DB.CURRENT_USER.name;
    document.getElementById("sideUserRole").textContent = DB.CURRENT_USER.role;
    if (roleSwitch.value !== DB.CURRENT_USER.id) roleSwitch.value = DB.CURRENT_USER.id;
  }

  window.addEventListener("hashchange", () => { render(); window.scrollTo(0, 0); });

  /* ---------- delegated actions ---------- */
  document.addEventListener("click", e => {
    const act = e.target.closest("[data-action]");
    if (act) {
      const d = act.dataset;
      if (d.action === "close-modal") { U.closeModal(); return; }
      if (d.action === "toggle") { act.classList.toggle("on"); return; }
      if (d.action === "nav") { location.hash = d.href; return; }
      const fn = window.ACTIONS[d.action];
      if (fn) { fn(d, act, e); return; }
      return;
    }
    const row = e.target.closest("[data-href]");
    if (row && !e.target.closest("button, a, select, input, textarea")) location.hash = row.dataset.href;
  });

  /* ---------- generic conditional field show/hide: data-cond-target + data-cond-value (comma-separated) ---------- */
  document.addEventListener("change", e => {
    const el = e.target;
    if (el.dataset && el.dataset.condTarget) {
      const target = document.querySelector(el.dataset.condTarget);
      if (target) {
        const values = el.dataset.condValue.split(",");
        const show = el.type === "checkbox" ? el.checked : values.includes(el.value);
        target.style.display = show ? "block" : "none";
      }
    }
    if (el.dataset && el.dataset.action) {
      const fn = window.ACTIONS[el.dataset.action];
      if (fn) fn(el.dataset, el, e);
    }
  });

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

    const cases = DB.CASES
      .filter(c => (c.lead.companyName + " " + c.lead.contactPerson + " " + (c.issuance ? c.issuance.policyNumber : "")).toLowerCase().includes(q))
      .slice(0, 6)
      .map(c => `<div class="sr-item" data-go="#/case/${c.id}"><span class="sr-main">${U.esc(c.lead.companyName)}</span><span class="sr-sub">${U.esc(c.stage)} · ${U.esc((c.opportunity ? c.opportunity.products : c.lead.products).join("/"))}</span></div>`);
    const brokers = DB.BROKERS.filter(b => b.name.toLowerCase().includes(q)).slice(0, 3)
      .map(b => `<div class="sr-item"><span class="sr-main">${U.esc(b.name)}</span><span class="sr-sub">Broker</span></div>`);

    searchResults.innerHTML = grp("Cases", cases) + grp("Brokers", brokers) || `<div class="sr-empty">No matches for “${U.esc(q)}”.</div>`;
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

  function refreshBell() {
    const items = DB.NOTIFICATIONS.slice(0, 18);
    const badge = document.getElementById("bellBadge");
    badge.textContent = items.length;
    badge.style.display = items.length ? "flex" : "none";
    const icoKind = k => k === "warn" ? "warn" : k === "ok" ? "ok" : "info";
    bellPanel.innerHTML = `<div class="bp-head">Notifications (${items.length})</div>` +
      (items.map(n => `<div class="bp-item" data-go="${n.go || "#/dashboard"}">
        <div class="bp-ico ${icoKind(n.kind)}">${n.kind === "warn" ? "&#9888;" : n.kind === "ok" ? "&#10003;" : "&#9993;"}</div>
        <div><div class="bp-txt">${n.txt}</div><div class="bp-when">${U.esc(n.event)}</div></div>
      </div>`).join("") || `<div class="sr-empty">All clear — nothing needs attention.</div>`);
  }
  document.getElementById("bellBtn").addEventListener("click", () => { bellPanel.classList.toggle("open"); });

  /* ---------- boot ---------- */
  window.App = { render, refreshBell };
  if (!location.hash) location.hash = "#/dashboard";
  render();
})();
