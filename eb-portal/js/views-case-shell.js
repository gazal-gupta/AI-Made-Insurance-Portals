/* ============================================================
   Case workspace shell (stepper over Screens 3–17) + queue pages
   ============================================================ */
(function () {
  const U = UI, J = JOURNEY;
  window.VIEWS = window.VIEWS || {};
  window.SCREENS = window.SCREENS || {};

  /* ---------- Case shell ---------- */
  VIEWS.caseShell = function (kase, screenKey) {
    const stageIdx = DB.STATUS_FLOW.indexOf(kase.stage);
    const track = DB.STATUS_FLOW.map((s, i) => `
      <div class="st-node">
        <div class="st-bar ${i < stageIdx ? "done" : i === stageIdx ? "now" : ""}"></div>
        <span class="st-label ${i === stageIdx ? "on" : ""}">${U.esc(s)}</span>
      </div>`).join("");

    const steps = J.allSteps().map(s => {
      const applicable = J.isApplicable(kase, s.key);
      const done = applicable && J.isDone(kase, s.key);
      const locked = applicable && J.isLocked(kase, s.key);
      const isActive = s.key === screenKey;
      let numCls = "locked", numContent = s.num;
      if (!applicable) numCls = "skip";
      else if (done) { numCls = "done"; numContent = "✓"; }
      else if (!locked) numCls = "now";
      const clickable = applicable && !locked;
      return `<div class="step ${isActive ? "active" : ""} ${!clickable ? "locked" : ""}" ${clickable ? `data-action="nav" data-href="#/case/${kase.id}/${s.key}"` : ""}>
        <div class="step-num ${numCls}">${numContent}</div>
        <div><div class="step-label">${U.esc(s.label)}</div><div class="step-sub">${applicable ? "Screen " + s.num : "Not applicable"}</div></div>
      </div>`;
    }).join("");

    const co = kase.lead.companyName;
    const owner = U.salesExec(kase.salesExecutiveId).name;
    const brokerNote = kase.brokerId ? " · Broker: " + U.esc(U.broker(kase.brokerId).name) : " · Direct business";
    const geoNote = U.geographyOf(kase) !== "Oman" ? ` · ${U.esc(U.geographyOf(kase))} (${U.currencyOf(kase)})` : "";

    const stepMeta = J.stepMeta(screenKey);
    const applicable = stepMeta && J.isApplicable(kase, screenKey);
    const locked = applicable && J.isLocked(kase, screenKey);
    const goCurrent = `<div style="margin-top:10px;"><span class="back-link" data-action="nav" data-href="#/case/${kase.id}/${J.currentStepKey(kase)}">Go to current step &rarr;</span></div>`;
    let panel;
    if (!stepMeta) {
      panel = `<div class="empty"><div class="big">Screen not available</div>This step (${U.esc(screenKey)}) has no renderer.${goCurrent}</div>`;
    } else if (!applicable) {
      panel = `<div class="empty"><div class="big">Not applicable to this case</div>${U.esc(stepMeta.label)} does not apply given this case's current configuration.${goCurrent}</div>`;
    } else if (locked) {
      panel = `<div class="empty"><div class="big">Not available yet</div>Complete the earlier steps first before opening ${U.esc(stepMeta.label)}.${goCurrent}</div>`;
    } else {
      panel = SCREENS[screenKey](kase);
    }

    return `
    <span class="back-link" data-href="#/pipeline">&larr; Back to Pipeline</span>
    <div class="detail-head">
      <div class="detail-title-wrap">
        <div class="detail-avatar">${U.initials(co)}</div>
        <div>
          <div class="detail-title">${U.esc(co)}</div>
          <div class="detail-sub">${U.esc(kase.id)} ${U.pill(kase.stage)} ${U.esc(U.productsOf(kase).join(" + "))} · Owner: ${U.esc(owner)}${brokerNote}${geoNote}</div>
        </div>
      </div>
    </div>
    <div class="card" style="margin-bottom:18px;"><div class="card-body"><div class="status-track">${track}</div></div></div>
    <div class="case-shell">
      <div class="stepper">${steps}</div>
      <div class="screen-panel">${panel}</div>
    </div>`;
  };

  /* ---------- Pipeline (full register) ---------- */
  const PF = { stage: "All", owner: "All", product: "All" };
  ACTIONS["filter-pipeline"] = function (d, el) { PF[el.name] = el.value; App.render(); };

  VIEWS.pipeline = function () {
    let rows = DB.CASES.slice();
    if (PF.stage !== "All") rows = rows.filter(c => c.stage === PF.stage);
    if (PF.owner !== "All") rows = rows.filter(c => c.salesExecutiveId === PF.owner);
    if (PF.product !== "All") rows = rows.filter(c => U.productsOf(c).includes(PF.product));

    const stageOpts = ["All"].concat(DB.STATUS_FLOW);
    const ownerOpts = ["All"].concat(DB.SALES_EXECS.filter(u => u.role === "Sales Executive").map(u => u.id));

    return `
    <div class="page-head"><div><div class="page-title">Pipeline</div><div class="page-sub">All Employee Benefits opportunities — Sales Managers see the full team book</div></div></div>
    <div class="toolbar">
      <select class="select" name="stage" data-action="filter-pipeline">${stageOpts.map(s => `<option value="${s}" ${PF.stage === s ? "selected" : ""}>${s === "All" ? "All stages" : U.esc(s)}</option>`).join("")}</select>
      <select class="select" name="owner" data-action="filter-pipeline">${ownerOpts.map(id => `<option value="${id}" ${PF.owner === id ? "selected" : ""}>${id === "All" ? "All owners" : U.esc(U.salesExec(id).name)}</option>`).join("")}</select>
      <select class="select" name="product" data-action="filter-pipeline">
        <option value="All" ${PF.product === "All" ? "selected" : ""}>All products</option>
        <option value="GMC" ${PF.product === "GMC" ? "selected" : ""}>Group Medical</option>
        <option value="GTL" ${PF.product === "GTL" ? "selected" : ""}>Group Term Life</option>
      </select>
      <span class="spacer"></span>
      <span class="chip-count">${rows.length} of ${DB.CASES.length} cases</span>
    </div>
    <div class="card"><div class="card-body">
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Company</th><th>Stage</th><th>Current Screen</th><th class="num">Premium</th><th>Owner</th></tr></thead>
      <tbody>${rows.map(k => `<tr class="rowlink" data-href="#/case/${k.id}">
        <td><div class="cell-main">${U.esc(k.lead.companyName)}</div><div class="cell-sub">${U.esc(k.id)} · ${U.esc(U.productsOf(k).join("+"))}</div></td>
        <td>${U.pill(k.stage)}</td>
        <td>${U.esc((J.stepMeta(J.currentStepKey(k)) || {}).label || "—")}</td>
        <td class="num">${U.fmtMoney(k.proposal ? k.proposal.netPremium : (k.opportunity ? k.opportunity.expectedPremium : null), U.currencyOf(k))}</td>
        <td>${U.esc(U.salesExec(k.salesExecutiveId).name)}</td>
      </tr>`).join("") || `<tr><td colspan="5" class="empty">No cases match these filters.</td></tr>`}</tbody></table></div>
    </div></div>`;
  };

  /* ---------- Underwriting Queue ---------- */
  VIEWS["underwriting-queue"] = function () {
    const rows = DB.CASES.filter(k => k.underwriting);
    const referred = rows.filter(k => DB.calc.trafficLight(k) !== "Green" && k.underwriting.decision === "Pending");
    const decided = rows.filter(k => k.underwriting.decision !== "Pending");
    const pendingGreen = rows.filter(k => DB.calc.trafficLight(k) === "Green" && k.underwriting.decision === "Pending");

    const rowHtml = k => {
      const tl = DB.calc.trafficLight(k);
      return `<tr class="rowlink" data-href="#/case/${k.id}/underwriting">
        <td><div class="cell-main">${U.esc(k.lead.companyName)}</div><div class="cell-sub">${U.esc(k.id)}</div></td>
        <td>${U.trafficChip(tl)}</td>
        <td>${U.esc(k.underwriting.industryRiskClass)} risk</td>
        <td>${k.underwriting.fclBreachIds.length}</td>
        <td>${DB.calc.lossRatio(k.prevInsurance) == null ? "—" : DB.calc.lossRatio(k.prevInsurance) + "%"}</td>
        <td>${U.pill(k.underwriting.decision)}</td>
      </tr>`;
    };
    return `
    <div class="page-head"><div><div class="page-title">Underwriting Queue</div><div class="page-sub">Risk assessment and decisioning — Senior Underwriter authority required for Red cases</div></div></div>
    <div class="card" style="margin-bottom:16px;"><div class="card-head"><div class="card-title">Referred — Amber / Red, awaiting decision</div><div class="card-sub">Red cases require Senior Underwriter; Sales Executives cannot action Red.</div></div>
      <div class="card-body"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Company</th><th>Traffic Light</th><th>Industry Risk</th><th class="num">FCL Breaches</th><th class="num">Loss Ratio</th><th>Decision</th></tr></thead>
      <tbody>${referred.map(rowHtml).join("") || `<tr><td colspan="6" class="empty">No referred cases pending.</td></tr>`}</tbody></table></div></div></div>
    <div class="card" style="margin-bottom:16px;"><div class="card-head"><div class="card-title">Green — fast-track pending</div></div>
      <div class="card-body"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Company</th><th>Traffic Light</th><th>Industry Risk</th><th class="num">FCL Breaches</th><th class="num">Loss Ratio</th><th>Decision</th></tr></thead>
      <tbody>${pendingGreen.map(rowHtml).join("") || `<tr><td colspan="6" class="empty">Nothing pending.</td></tr>`}</tbody></table></div></div></div>
    <div class="card"><div class="card-head"><div class="card-title">Decisioned</div></div>
      <div class="card-body"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Company</th><th>Traffic Light</th><th>Industry Risk</th><th class="num">FCL Breaches</th><th class="num">Loss Ratio</th><th>Decision</th></tr></thead>
      <tbody>${decided.map(rowHtml).join("") || `<tr><td colspan="6" class="empty">No decisioned cases yet.</td></tr>`}</tbody></table></div></div></div>`;
  };

  /* ---------- Approvals Queue ---------- */
  VIEWS.approvals = function () {
    const rows = DB.CASES.filter(k => k.approval);
    return `
    <div class="page-head"><div><div class="page-title">Approvals</div><div class="page-sub">Sequential sign-off — Sales Manager → Underwriter → Finance → Business Head (where triggered)</div></div></div>
    <div class="card"><div class="card-body">
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Company</th><th>Current Approver</th><th>Progress</th><th class="num">Discount</th></tr></thead>
      <tbody>${rows.map(k => {
        const pending = k.approval.steps.find(s => s.status === "Pending");
        const done = k.approval.steps.filter(s => s.status === "Approved").length;
        return `<tr class="rowlink" data-href="#/case/${k.id}/approval">
          <td><div class="cell-main">${U.esc(k.lead.companyName)}</div><div class="cell-sub">${U.esc(k.id)}</div></td>
          <td>${pending ? U.esc(pending.role) : U.pill("Approved")}</td>
          <td>${done} of ${k.approval.steps.length} approved</td>
          <td class="num">${k.proposal.discountPct}%</td>
        </tr>`;
      }).join("") || `<tr><td colspan="4" class="empty">No cases currently in Approval Workflow.</td></tr>`}</tbody></table></div>
    </div></div>`;
  };

  /* ---------- Playbook (Approval Matrix / Notification Matrix / Key Documents / Status Flow reference) ---------- */
  VIEWS.playbook = function () {
    return `
    <div class="page-head"><div><div class="page-title">Playbook</div><div class="page-sub">Approval Matrix, Notification Matrix and reference data — FRD Sections 6–9</div></div></div>

    <div class="card" style="margin-bottom:16px;">
      <div class="card-head"><div><div class="card-title">Approval Matrix</div><div class="card-sub">Illustrative delegation-of-authority thresholds — confirm against the insurer's actual policy before build.</div></div></div>
      <div class="card-body"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Trigger Condition</th><th>Approver(s)</th><th>Notes</th><th>Target SLA</th></tr></thead>
      <tbody>${DB.APPROVAL_MATRIX.map(r => `<tr><td class="cell-main">${U.esc(r.condition)}</td><td>${U.esc(r.approvers)}</td><td>${U.esc(r.notes)}</td><td>${U.esc(r.sla)}</td></tr>`).join("")}</tbody></table></div></div>
    </div>

    <div class="card" style="margin-bottom:16px;">
      <div class="card-head"><div class="card-title">Notification Matrix</div></div>
      <div class="card-body"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Trigger Event</th><th>Recipient(s)</th><th>Channel</th><th>Content</th></tr></thead>
      <tbody>${DB.NOTIFICATION_MATRIX.map(r => `<tr><td class="cell-main">${U.esc(r.event)}</td><td>${U.esc(r.recipients)}</td><td>${U.esc(r.channel)}</td><td>${U.esc(r.content)}</td></tr>`).join("")}</tbody></table></div></div>
    </div>

    <div class="two-col">
      <div class="card">
        <div class="card-head"><div class="card-title">Status Flow</div></div>
        <div class="card-body"><div class="status-track">${DB.STATUS_FLOW.map(s => `<div class="st-node"><div class="st-bar done"></div><span class="st-label">${U.esc(s)}</span></div>`).join("")}</div></div>
      </div>
      <div class="card">
        <div class="card-head"><div class="card-title">Key Documents</div></div>
        <div class="card-body"><div class="doc-list">${DB.KEY_DOCUMENTS.map(dname => `<div class="doc-row"><div class="doc-ico">DOC</div><div class="doc-name">${U.esc(dname)}</div></div>`).join("")}</div></div>
      </div>
    </div>`;
  };
})();
