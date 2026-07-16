/* ============================================================
   Screens 1–3: Sales Dashboard · Create Lead · Opportunity
   ============================================================ */
(function () {
  const U = UI, J = JOURNEY;
  window.VIEWS = window.VIEWS || {};
  window.SCREENS = window.SCREENS || {};

  const CALENDAR = [
    { when: "Today, 3:00 PM", what: "Employer walkthrough call — BluePeak Logistics" },
    { when: "Tomorrow, 11:00 AM", what: "Census clarification — Solaris Textiles HR" },
    { when: "18 Jul, 4:30 PM", what: "Renewal discussion — Trident Hospitality Group" },
    { when: "21 Jul, 10:00 AM", what: "Proposal walkthrough — Aarav Pharma Industries" }
  ];

  function stagePill(k) { return U.pill(k.stage); }

  function pipelineRow(k) {
    const owner = U.salesExec(k.salesExecutiveId).name || "—";
    const premium = k.proposal ? k.proposal.netPremium : (k.opportunity ? k.opportunity.expectedPremium : null);
    return `<tr class="rowlink" data-href="#/case/${k.id}">
      <td><div class="cell-main">${U.esc(k.lead.companyName)}</div><div class="cell-sub">${U.esc(U.productsOf(k).join(" + "))}${k.brokerId ? " · via " + U.esc(U.broker(k.brokerId).name) : ""}</div></td>
      <td>${stagePill(k)}</td>
      <td class="num">${U.fmtMoney(premium, U.currencyOf(k))}</td>
      <td>${U.esc(owner)}</td>
    </tr>`;
  }

  /* ---------- Screen 1: Sales Dashboard ---------- */
  VIEWS.dashboard = function () {
    const open = DB.CASES.filter(c => !(c.issuance && c.issuance.finished));
    const omrOpen = open.filter(c => U.currencyOf(c) === "OMR");
    const pipelineValue = omrOpen.reduce((s, c) => s + (c.proposal ? c.proposal.netPremium : (c.opportunity ? c.opportunity.expectedPremium : 0)), 0);
    const tasks = J.deriveTasks();
    // Within each High/Medium/Low tier, rank by the AI priority score (deal size,
    // staleness, proximity to close, underwriting risk) so the most urgent case in a
    // tier surfaces first rather than in arbitrary case-creation order.
    const PRI_ORDER = { High: 0, Medium: 1, Low: 2 };
    const myTasks = tasks.filter(t => t.ownerId === DB.CURRENT_USER.id)
      .sort((a, b) => (PRI_ORDER[a.priority] - PRI_ORDER[b.priority]) || (AI.priorityScore(U.kase(b.caseId)) - AI.priorityScore(U.kase(a.caseId))));
    const uwCount = DB.CASES.filter(c => J.currentStepKey(c) === "underwriting" && !J.isDone(c, "underwriting")).length;
    const issuedCount = DB.CASES.filter(c => c.issuance && c.issuance.finished).length;

    // Pipeline visibility is role-scoped (FRD Screen 1 business rule): Sales Executives see
    // their own book; a Broker persona sees the cases they introduced instead.
    const isBroker = DB.CURRENT_USER.role === "Broker";
    const myPipeline = DB.CASES.filter(c => !(c.issuance && c.issuance.finished) &&
      (isBroker ? c.brokerId === DB.CURRENT_USER.brokerId : c.salesExecutiveId === DB.CURRENT_USER.id))
      .slice(0, 7);

    const canCreateLead = ["Sales Executive", "Broker"].includes(DB.CURRENT_USER.role);
    return `
    <div class="page-head">
      <div><div class="page-title">Sales Dashboard</div><div class="page-sub">Employee Benefits — Group Medical &amp; Group Term Life, assisted sales journey</div></div>
      <div class="detail-actions">
        <button class="btn btn-teal" data-action="open-census-shortcut">Upload Census</button>
        <button class="btn btn-teal" data-action="open-new-opportunity">New Opportunity</button>
        <button class="btn btn-amber" data-action="open-new-lead" ${!canCreateLead ? "disabled" : ""} title="${!canCreateLead ? "New Lead is enabled for Sales Executive and Broker roles only." : ""}">New Lead</button>
      </div>
    </div>

    <div class="kpi-grid">
      <div class="kpi"><div class="kpi-label">Open Pipeline (OMR book)</div><div class="kpi-row"><div class="kpi-value">${U.fmtOMR(pipelineValue)}</div></div><div class="kpi-note">${omrOpen.length} open cases</div></div>
      <div class="kpi"><div class="kpi-label">Open Opportunities</div><div class="kpi-row"><div class="kpi-value">${open.length}</div></div><div class="kpi-note">across ${DB.CASES.length} total cases</div></div>
      <div class="kpi"><div class="kpi-label">Awaiting My Action</div><div class="kpi-row"><div class="kpi-value">${myTasks.filter(t => t.actionable).length}</div></div><div class="kpi-note">of ${myTasks.length} tracked tasks</div></div>
      <div class="kpi"><div class="kpi-label">In Underwriting</div><div class="kpi-row"><div class="kpi-value">${uwCount}</div></div><div class="kpi-note"><a data-href="#/underwriting-queue" style="cursor:pointer;color:var(--ink-2)">view queue →</a></div></div>
      <div class="kpi"><div class="kpi-label">Policies Issued</div><div class="kpi-row"><div class="kpi-value">${issuedCount}</div></div><div class="kpi-note">closed won, this book</div></div>
    </div>

    <div class="dash-grid">
      <div class="card">
        <div class="card-head"><div><div class="card-title">${isBroker ? "Cases You've Introduced" : "My Pipeline"}</div><div class="card-sub">${isBroker ? "Role-scoped to business placed through you — see Broker Book for commission" : "Role-scoped to your book — Sales Managers see the full team book"}</div></div>
          <div class="card-link" data-href="${isBroker ? "#/broker-book" : "#/pipeline"}">View all →</div></div>
        <div class="card-body">
          <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Company</th><th>Stage</th><th class="num">Premium</th><th>Owner</th></tr></thead>
          <tbody>${myPipeline.map(pipelineRow).join("") || `<tr><td colspan="4" class="empty">No open cases in your book.</td></tr>`}</tbody></table></div>
        </div>
      </div>

      <div class="stack">
        <div class="card">
          <div class="card-head"><div class="card-title">Pending Tasks</div></div>
          <div class="card-body">
            <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Task</th><th>Priority</th></tr></thead>
            <tbody>${myTasks.slice(0, 6).map(t => `<tr class="${t.actionable ? "rowlink" : ""}" ${t.actionable ? `data-href="${t.go}"` : ""}>
              <td><div class="cell-main">${U.esc(t.task)}</div><div class="cell-sub">${U.esc(t.company)}</div></td>
              <td>${U.pill(t.priority === "High" ? "Rejected" : t.priority === "Medium" ? "Pending" : "Qualified")}</td>
            </tr>`).join("") || `<tr><td colspan="2" class="empty">All clear — nothing pending.</td></tr>`}</tbody></table></div>
            <div class="kpi-note" style="margin-top:10px;">Daily digest emailed with tasks and renewals due within 7 days.</div>
          </div>
        </div>

        <div class="card">
          <div class="card-head"><div class="card-title">Calendar</div></div>
          <div class="card-body">
            <ul class="timeline">${CALENDAR.map(c => `<li><div class="tl-when">${U.esc(c.when)}</div><div class="tl-what">${U.esc(c.what)}</div></li>`).join("")}</ul>
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-head"><div><div class="card-title">Renewals</div><div class="card-sub">Policies expiring within 90 days — auto-populated, actioned not cleared</div></div></div>
      <div class="card-body">
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Company</th><th>Product</th><th class="num">Premium</th><th>Expiry</th><th>Owner</th><th></th></tr></thead>
        <tbody>${DB.RENEWALS.map(r => `<tr>
          <td class="cell-main">${U.esc(r.company)}</td><td>${U.esc(r.product)}</td><td class="num">${U.fmtOMR(r.premium)}</td>
          <td class="${U.daysUntil(r.expiry) <= 45 ? "due-hot" : ""}">${U.dueLabel(r.expiry)}</td>
          <td>${U.esc(U.salesExec(r.owner).name)}</td>
          <td><button class="btn btn-sm" data-action="renewal-stub" data-company="${U.esc(r.company)}">Start Renewal</button></td>
        </tr>`).join("")}</tbody></table></div>
      </div>
    </div>`;
  };

  VIEWS.notFound = function (id) {
    return `<div class="empty"><div class="big">Case not found</div>${U.esc(id)} does not exist in this sample book. <br><br><span class="back-link" data-href="#/pipeline">← Back to Pipeline</span></div>`;
  };

  /* ---------- Screen 2: Create Lead (modal) ---------- */
  function leadFormHtml() {
    const industryOpts = DB.INDUSTRIES.map(i => `<option value="${i.code}">${U.esc(i.label)}</option>`).join("");
    const sizeOpts = DB.CORPORATE_SIZE_BANDS.map(b => `<option value="${b}">${b} employees</option>`).join("");
    const actingBroker = DB.CURRENT_USER.role === "Broker" ? DB.BROKERS.find(b => b.id === DB.CURRENT_USER.brokerId) : null;
    const brokerOpts = `<option value="">— Direct business —</option>` + DB.BROKERS.map(b => `<option value="${b.id}" ${actingBroker && b.id === actingBroker.id ? "selected" : ""}>${U.esc(b.name)}</option>`).join("");
    return `
    <form id="leadForm" class="form-grid">
      <div class="field full"><label>Company Name <span style="color:var(--red)">*</span></label><input class="input" name="companyName" placeholder="Min 3 characters" required></div>
      <div class="field"><label>Industry <span style="color:var(--red)">*</span></label><select class="select" name="industry">${industryOpts}</select></div>
      <div class="field"><label>Corporate Size <span style="color:var(--red)">*</span></label><select class="select" name="corporateSize">${sizeOpts}</select></div>
      <div class="field"><label>Contact Person <span style="color:var(--red)">*</span></label><input class="input" name="contactPerson" required></div>
      <div class="field"><label>Designation <span style="color:var(--red)">*</span></label><input class="input" name="designation" required></div>
      <div class="field"><label>Geography <span style="color:var(--red)">*</span></label>
        <select class="select" name="geography">
          <option value="Oman" selected>Oman</option>
          <option value="UAE">UAE</option>
          <option value="Qatar">Qatar</option>
        </select></div>
      <div class="field"><label>Mobile <span style="color:var(--red)">*</span></label><input class="input" name="mobile" placeholder="e.g. 91234567" maxlength="9"></div>
      <div class="field"><label>Email <span style="color:var(--red)">*</span></label><input class="input" name="email" type="email"></div>
      <div class="field"><label>Broker</label><select class="select" name="brokerId" ${actingBroker ? "disabled" : ""}>${brokerOpts}</select>
        ${actingBroker ? `<input type="hidden" name="brokerId" value="${actingBroker.id}"><div class="hint">Co-created by ${U.esc(DB.CURRENT_USER.name)} (${U.esc(actingBroker.name)}).</div>` : ""}</div>
      <div class="field"><label>Lead Source <span style="color:var(--red)">*</span></label><select class="select" name="leadSource">
        <option ${actingBroker ? "selected" : ""}>Broker</option><option>Referral</option><option>Digital</option><option>Cold Call</option><option>Renewal</option><option>Event</option></select></div>
      <div class="field"><label>Expected Employee Count <span style="color:var(--red)">*</span></label><input class="input" name="expectedEmployeeCount" type="number" min="1"></div>
      <div class="field full"><label>Products <span style="color:var(--red)">*</span></label>
        <div class="check-row">
          <label class="check-opt"><input type="checkbox" name="products" value="GMC"> Group Medical (GMC)</label>
          <label class="check-opt"><input type="checkbox" name="products" value="GTL"> Group Term Life (GTL)</label>
        </div></div>
    </form>`;
  }

  ACTIONS["open-new-lead"] = function () {
    if (!["Sales Executive", "Broker"].includes(DB.CURRENT_USER.role)) {
      U.toast("New Lead is enabled for Sales Executive and Broker roles only.", "err");
      return;
    }
    U.openModal("New Lead — Screen 2", leadFormHtml(),
      `<button class="btn btn-ghost" data-action="close-modal">Cancel</button><button class="btn btn-amber" data-action="submit-new-lead">Save Lead</button>`);
  };

  const GEO_MOBILE_DIGITS = { Oman: 8, UAE: 9, Qatar: 8 };
  const GEO_CURRENCY = { Oman: "OMR", UAE: "AED", Qatar: "QAR" };

  ACTIONS["submit-new-lead"] = function () {
    const form = document.getElementById("leadForm");
    const fd = new FormData(form);
    const companyName = (fd.get("companyName") || "").trim();
    const mobile = (fd.get("mobile") || "").trim();
    const geography = fd.get("geography") || "Oman";
    const mobileDigits = GEO_MOBILE_DIGITS[geography] || 8;
    const products = fd.getAll("products");
    const errors = [];
    if (companyName.length < 3) errors.push("Company Name must be at least 3 characters.");
    if (!(new RegExp(`^\\d{${mobileDigits}}$`)).test(mobile)) errors.push(`Mobile must be a ${mobileDigits}-digit number for ${geography}.`);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fd.get("email") || "")) errors.push("Email format is invalid.");
    if (!fd.get("contactPerson")) errors.push("Contact Person is required.");
    if (!fd.get("designation")) errors.push("Designation is required.");
    if (!(Number(fd.get("expectedEmployeeCount")) > 0)) errors.push("Expected Employee Count must be greater than 0.");
    if (products.length === 0) errors.push("At least one product (GMC or GTL) must be selected.");
    if (errors.length) { U.toast(errors.join("<br>"), "err"); return; }

    const dup = DB.CASES.find(c => c.lead.companyName.toLowerCase() === companyName.toLowerCase() && c.lead.mobile === mobile);
    // AI-assisted layer on top of the exact-match rule: catches near-matches an exact
    // company+mobile check would miss (e.g. "Al Bahja Power LLC" vs "Al Bahja Power & Energy L.L.C.").
    const fuzzyDup = !dup ? AI.findFuzzyDuplicate(companyName, null) : null;
    const id = "EB-2026-0" + (100 + DB.CASES.length);
    // A Broker persona can co-create the lead (FRD §3), but the internal pipeline still
    // needs a Sales Executive owner — brokers don't carry one themselves.
    const ownerId = DB.CURRENT_USER.role === "Sales Executive" ? DB.CURRENT_USER.id : "U-SE-01";
    const kase = {
      id, createdDate: DB.TODAY, stage: "Lead", salesExecutiveId: ownerId,
      brokerId: fd.get("brokerId") || null, geography, currency: GEO_CURRENCY[geography] || "OMR",
      lead: {
        companyName, industry: fd.get("industry"), corporateSize: fd.get("corporateSize"),
        contactPerson: fd.get("contactPerson"), designation: fd.get("designation"), mobile, email: fd.get("email"),
        leadSource: fd.get("leadSource"), expectedEmployeeCount: Number(fd.get("expectedEmployeeCount")),
        products, createdDate: DB.TODAY, duplicateFlag: !!dup || !!fuzzyDup,
        aiDuplicateMatch: fuzzyDup ? { caseId: fuzzyDup.kase.id, companyName: fuzzyDup.kase.lead.companyName, score: fuzzyDup.score } : null
      },
      opportunity: null, employer: null, policyReq: null, census: null, censusValidation: null,
      benefitGMC: null, benefitGTL: null, prevInsurance: null, underwriting: null,
      quotes: [], selectedQuoteId: null, proposal: null, negotiation: null, approval: null, payment: null, issuance: null
    };
    DB.CASES.unshift(kase);
    DB.pushNotif(kase, "Lead created", "info", `Lead confirmation sent to <strong>${U.esc(kase.lead.contactPerson)}</strong> — ${U.esc(companyName)}`, `#/case/${id}/opportunity`);
    U.closeModal();
    if (dup) U.toast(`Lead saved, but flagged as a possible <strong>duplicate</strong> of ${U.esc(dup.id)} — routed to Sales Manager for review.`, "warn");
    else if (fuzzyDup) U.toast(`Lead saved. AI flagged a <strong>${Math.round(fuzzyDup.score * 100)}% name match</strong> with existing case ${U.esc(fuzzyDup.kase.id)} (${U.esc(fuzzyDup.kase.lead.companyName)}) — routed to Sales Manager for review.`, "warn");
    else U.toast(`Lead <strong>${U.esc(companyName)}</strong> saved. Confirmation email sent.`);
    location.hash = "#/case/" + id;
  };

  /* ---------- New Opportunity picker (requires an existing qualified lead) ---------- */
  ACTIONS["open-new-opportunity"] = function () {
    const leads = DB.CASES.filter(c => c.stage === "Lead");
    const body = leads.length
      ? `<div class="doc-list">${leads.map(l => `<label class="doc-row" style="cursor:pointer;">
          <input type="radio" name="pickLead" value="${l.id}" style="margin-right:4px;">
          <div class="doc-ico">${U.initials(l.lead.companyName)}</div>
          <div><div class="doc-name">${U.esc(l.lead.companyName)}</div><div class="doc-meta">${U.esc(l.lead.contactPerson)} · ${U.esc(U.productsOf(l).join("/"))}</div></div>
        </label>`).join("")}</div>`
      : `<div class="empty">No qualified leads available. Create a lead first.</div>`;
    U.openModal("New Opportunity — requires a qualified lead", body,
      leads.length ? `<button class="btn btn-ghost" data-action="close-modal">Cancel</button><button class="btn btn-amber" data-action="pick-lead-for-opportunity">Continue</button>` : `<button class="btn btn-ghost" data-action="close-modal">Close</button>`);
  };
  ACTIONS["pick-lead-for-opportunity"] = function () {
    const picked = document.querySelector('input[name="pickLead"]:checked');
    if (!picked) { U.toast("Select a lead to continue.", "err"); return; }
    U.closeModal();
    location.hash = "#/case/" + picked.value + "/opportunity";
  };

  ACTIONS["open-census-shortcut"] = function () {
    const ready = DB.CASES.filter(c => J.currentStepKey(c) === "census-upload");
    const body = ready.length
      ? `<div class="doc-list">${ready.map(l => `<label class="doc-row" style="cursor:pointer;">
          <input type="radio" name="pickCensus" value="${l.id}" style="margin-right:4px;">
          <div class="doc-ico">${U.initials(l.lead.companyName)}</div>
          <div><div class="doc-name">${U.esc(l.lead.companyName)}</div><div class="doc-meta">Ready for census upload</div></div>
        </label>`).join("")}</div>`
      : `<div class="empty">No opportunities are currently ready for census upload.</div>`;
    U.openModal("Upload Census — shortcut to Screen 6", body,
      ready.length ? `<button class="btn btn-ghost" data-action="close-modal">Cancel</button><button class="btn btn-amber" data-action="pick-census-shortcut">Continue</button>` : `<button class="btn btn-ghost" data-action="close-modal">Close</button>`);
  };
  ACTIONS["pick-census-shortcut"] = function () {
    const picked = document.querySelector('input[name="pickCensus"]:checked');
    if (!picked) { U.toast("Select an opportunity to continue.", "err"); return; }
    U.closeModal();
    location.hash = "#/case/" + picked.value + "/census-upload";
  };

  ACTIONS["renewal-stub"] = function (d) {
    U.toast(`Renewal journey for <strong>${U.esc(d.company)}</strong> is out of scope for this assisted new-business journey — see FRD §1.2.`, "warn");
  };

  /* ---------- Screen 3: Opportunity ---------- */
  SCREENS["opportunity"] = function (kase) {
    const o = kase.opportunity;
    const products = o ? o.products : kase.lead.products;
    const canQuote = !!(kase.employer && kase.policyReq);
    const stageOpts = ["Qualification", "Needs Analysis", "Quote", "Negotiation", "Closed Won", "Closed Lost"];
    const suggestedName = `${kase.lead.companyName} - ${products.join("/")} - 2026`;
    const winProb = AI.leadWinProbability(kase);
    const winProbCls = winProb >= 60 ? "var(--green)" : winProb >= 35 ? "var(--amber-ink)" : "var(--red)";

    return `
    <div class="screen-head">
      <div class="screen-num">Screen 3</div>
      <div class="screen-title">Opportunity</div>
      <div class="screen-purpose">Convert a qualified lead into a trackable sales opportunity with financial and timeline attributes.</div>
    </div>
    <div class="mini-stats" style="margin-bottom:14px;">
      <div class="kpi"><div class="kpi-label">AI Win-Probability</div><div class="kpi-value" style="color:${winProbCls};">${winProb}%</div>
        <div class="kpi-note">Independent of the Probability field below — weighted from industry risk, lead source, deal size band and broker involvement.</div></div>
    </div>
    <form id="screenForm">
      <div class="screen-grid">
        <div class="field-row full"><label>Opportunity Name <span class="req">*</span></label>
          <input class="input" name="name" value="${U.esc(o ? o.name : suggestedName)}"></div>
        <div class="field-row"><label>Sales Owner <span class="req">*</span></label>
          <select class="select" name="salesOwnerId">${DB.SALES_EXECS.filter(u => u.role === "Sales Executive").map(u => `<option value="${u.id}" ${((o ? o.salesOwnerId : kase.salesExecutiveId) === u.id) ? "selected" : ""}>${U.esc(u.name)}</option>`).join("")}</select>
          <div class="hint">Defaults to logged-in user; reassignable by Sales Manager.</div></div>
        <div class="field-row"><label>Expected Premium (${U.currencyOf(kase)}) <span class="req">*</span></label>
          <input class="input" name="expectedPremium" type="number" min="1" value="${o ? o.expectedPremium : ""}"></div>
        <div class="field-row"><label>Expected Close Date <span class="req">*</span></label>
          <input class="input" name="expectedCloseDate" type="date" min="${DB.TODAY}" value="${o ? o.expectedCloseDate : ""}"></div>
        <div class="field-row"><label>Probability (%) <span class="req">*</span></label>
          <input class="input" name="probability" type="number" min="0" max="100" value="${o ? o.probability : 50}"></div>
        <div class="field-row"><label>Products <span class="req">*</span></label>
          <div class="check-row">
            <label class="check-opt"><input type="checkbox" name="products" value="GMC" ${products.includes("GMC") ? "checked" : ""}> Group Medical</label>
            <label class="check-opt"><input type="checkbox" name="products" value="GTL" ${products.includes("GTL") ? "checked" : ""}> Group Term Life</label>
          </div></div>
        <div class="field-row"><label>Stage <span class="req">*</span></label>
          <select class="select" name="crmStage" data-cond-target="#reasonCodeRow" data-cond-value="Closed Lost">
            ${stageOpts.map(s => `<option value="${s}" ${(o ? o.crmStage : "Qualification") === s ? "selected" : ""} ${(s === "Quote" || s === "Negotiation" || s.startsWith("Closed")) && !canQuote ? "disabled" : ""}>${s}${(s === "Quote" || s === "Negotiation" || s.startsWith("Closed")) && !canQuote ? " (locked — complete Employer Profile & Policy Requirements)" : ""}</option>`).join("")}
          </select></div>
        <div class="field-row" id="reasonCodeRow" style="display:${(o && o.crmStage === "Closed Lost") ? "block" : "none"}">
          <label>Reason Code <span class="req">*</span></label>
          <select class="select" name="reasonCode"><option>Price</option><option>Lost to Competitor</option><option>Employer Deferred Decision</option><option>Coverage Mismatch</option><option>Other</option></select></div>
        <div class="field-row full"><label>Notes <span class="opt">optional, max 2000 chars</span></label>
          <textarea class="input" name="notes" maxlength="2000">${U.esc(o ? o.notes : "")}</textarea></div>
        <div class="field-row full"><label>Attachments <span class="opt">optional — PDF/DOCX/XLSX, max 10MB</span></label>
          <div class="dropzone" data-action="stub-upload" data-label="attachment">
            <div class="dz-title">Click to attach a file</div><div class="dz-sub">${o && o.attachments.length ? o.attachments.length + " file(s) attached" : "No files attached yet"}</div>
          </div></div>
      </div>
      <div class="skip-note">Business rule: stage cannot move to <strong>Quote</strong> or beyond until Employer Profile (Screen 4) and Policy Requirements (Screen 5) are marked complete.</div>
      <div class="screen-foot">
        <span class="page-meta">${kase.brokerId ? "Broker: " + U.esc(U.broker(kase.brokerId).name) : "Direct business"}</span>
        <div class="right"><button type="button" class="btn btn-amber" data-action="save-opportunity" data-case="${kase.id}">Save &amp; Continue →</button></div>
      </div>
    </form>`;
  };

  VIEWS.after = null;

  ACTIONS["save-opportunity"] = function (d) {
    const kase = U.kase(d.case);
    const form = document.getElementById("screenForm");
    const fd = new FormData(form);
    const products = fd.getAll("products");
    const errors = [];
    if (!fd.get("name")) errors.push("Opportunity Name is required.");
    if (!(Number(fd.get("expectedPremium")) > 0)) errors.push("Expected Premium must be greater than 0.");
    if (!fd.get("expectedCloseDate")) errors.push("Expected Close Date is required.");
    if (fd.get("expectedCloseDate") < DB.TODAY) errors.push("Expected Close Date cannot be in the past.");
    const prob = Number(fd.get("probability"));
    if (!(prob >= 0 && prob <= 100)) errors.push("Probability must be between 0 and 100.");
    if (products.length === 0) errors.push("At least one product must be selected.");
    if (fd.get("crmStage") === "Closed Lost" && !fd.get("reasonCode")) errors.push("Reason Code is mandatory for Closed Lost.");
    if (errors.length) { U.toast(errors.join("<br>"), "err"); return; }

    const prevStage = kase.opportunity ? kase.opportunity.crmStage : null;
    kase.opportunity = {
      name: fd.get("name"), salesOwnerId: fd.get("salesOwnerId"), expectedPremium: Number(fd.get("expectedPremium")),
      expectedCloseDate: fd.get("expectedCloseDate"), probability: prob, products, crmStage: fd.get("crmStage"),
      notes: fd.get("notes") || "", attachments: kase.opportunity ? kase.opportunity.attachments : []
    };
    if (kase.stage === "Lead") kase.stage = "Opportunity Created";
    if (["Negotiation", "Closed Won", "Closed Lost"].includes(fd.get("crmStage")) && prevStage !== fd.get("crmStage")) {
      DB.pushNotif(kase, "Stage change", "info", `<strong>${U.esc(kase.lead.companyName)}</strong> opportunity moved to ${U.esc(fd.get("crmStage"))} — Sales Manager notified.`, `#/case/${kase.id}/opportunity`);
    }
    U.toast(`Opportunity saved for <strong>${U.esc(kase.lead.companyName)}</strong>.`);
    location.hash = `#/case/${kase.id}/${J.nextStepKey(kase, "opportunity")}`;
  };

  ACTIONS["stub-upload"] = function (d) {
    U.toast(`File picker is out of scope for this demo — attachment would upload here (${U.esc(d.label || "file")}).`, "warn");
  };
})();
