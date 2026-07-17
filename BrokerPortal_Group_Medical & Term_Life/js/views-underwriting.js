/* ============================================================
   Screen 11: Underwriting Workbench
   ============================================================ */
(function () {
  const U = UI, J = JOURNEY;
  window.SCREENS = window.SCREENS || {};

  function bar(label, count, max) {
    const pct = max ? Math.round((count / max) * 100) : 0;
    return `<div class="brk-row"><span>${U.esc(label)}</span><span style="flex:1;margin:0 12px;"><span class="meter"><span style="width:${pct}%;background:var(--teal-700);"></span></span></span><span class="num" style="min-width:28px;text-align:right;">${count}</span></div>`;
  }

  SCREENS["underwriting"] = function (kase) {
    const uw = DB.calc.ensureUnderwriting(kase);
    const tl = DB.calc.trafficLight(kase);
    const ageDist = DB.calc.ageDistribution(kase);
    const maxAge = Math.max(1, ...Object.values(ageDist));
    const lr = DB.calc.lossRatio(kase.prevInsurance);
    const hasSalary = kase.censusValidation && kase.censusValidation.rows.some(r => r.salary);
    const cur = U.currencyOf(kase);
    let salaryBars = "";
    if (hasSalary) {
      // salary bands scale with the case's currency: India runs INR-lakh scale (dormant,
      // hidden by default), Gulf currencies (OMR/AED/QAR) run a thousands scale
      const isINR = cur === "INR";
      const t1 = isINR ? 500000 : 5000, t2 = isINR ? 1000000 : 10000, t3 = isINR ? 2000000 : 20000;
      const label = n => isINR ? U.fmtCr(n) : cur + " " + n.toLocaleString();
      const buckets = { [`< ${label(t1)}`]: 0, [`${label(t1)}–${label(t2)}`]: 0, [`${label(t2)}–${label(t3)}`]: 0, [`${label(t3)}+`]: 0 };
      const keys = Object.keys(buckets);
      kase.censusValidation.rows.filter(r => r.status === "Accepted" && r.salary).forEach(r => {
        if (r.salary < t1) buckets[keys[0]]++;
        else if (r.salary < t2) buckets[keys[1]]++;
        else if (r.salary < t3) buckets[keys[2]]++;
        else buckets[keys[3]]++;
      });
      const maxS = Math.max(1, ...Object.values(buckets));
      salaryBars = Object.entries(buckets).map(([k, v]) => bar(k, v, maxS)).join("");
    }

    const role = DB.CURRENT_USER.role;
    const isUW = role === "Underwriter" || role === "Senior Underwriter";
    const canApproveReject = tl === "Red" ? role === "Senior Underwriter" : isUW;
    const decided = uw.decision !== "Pending" && uw.decision !== "Request Information";

    return `
    <div class="screen-head">
      <div class="screen-num">Screen 11</div>
      <div class="screen-title">Underwriting Workbench</div>
      <div class="screen-purpose">Assess overall group risk using census, benefit configuration, and prior claims data to reach an underwriting decision.</div>
    </div>

    <div class="mini-stats">
      <div class="kpi"><div class="kpi-label">Risk Summary</div><div class="kpi-value">${uw.riskScore}</div><div class="kpi-note">composite risk score (0–100)</div></div>
      <div class="kpi"><div class="kpi-label">Industry Risk</div><div class="kpi-value" style="font-size:16px;">${U.pill(uw.industryRiskClass === "High" ? "Rejected" : uw.industryRiskClass === "Medium" ? "Pending" : "Approve")} ${uw.industryRiskClass}</div></div>
      <div class="kpi"><div class="kpi-label">Loss Ratio</div><div class="kpi-value" style="font-size:16px;">${lr == null ? "N/A" : lr + "%"}</div><div class="kpi-note">${lr != null && lr > 65 ? "exceeds 65% threshold" : "within threshold"}</div></div>
      <div class="kpi"><div class="kpi-label">FCL Breaches</div><div class="kpi-value">${uw.fclBreachIds.length}</div><div class="kpi-note">members flagged for medical UW</div></div>
    </div>

    <div class="two-col">
      <div class="stack">
        <div class="card"><div class="card-head"><div class="card-title">Age Distribution</div><div class="card-sub">Derived from validated census — ${kase.censusValidation.accepted} accepted lives</div></div>
          <div class="card-body">${Object.entries(ageDist).map(([k, v]) => bar(k, v, maxAge)).join("")}</div></div>
        ${hasSalary ? `<div class="card"><div class="card-head"><div class="card-title">Salary Distribution</div><div class="card-sub">Relevant for GTL Salary Multiple cases</div></div>
          <div class="card-body">${salaryBars}</div></div>` : ""}
        <div class="card"><div class="card-head"><div class="card-title">Employee Distribution</div></div>
          <div class="card-body"><div class="empty">Not captured for this census — location/grade/department are not part of the Screen 6 census schema in this release.</div></div></div>
        ${uw.fclBreachIds.length ? `<div class="card"><div class="card-head"><div class="card-title">Medical Conditions / FCL Flags</div></div>
          <div class="card-body"><div class="hint" style="margin-bottom:8px;">${uw.fclBreachIds.length} member(s) exceed the Free Cover Limit and require individual medical underwriting before group approval (Approval Matrix: Underwriter — Medical UW).</div>
          ${U.piiMasked()
            ? `<div class="cell-sub">Member list masked for this role (NFR 10.3 — medical-condition data) — count only.</div>`
            : `<div class="cell-sub">${uw.fclBreachIds.slice(0, 15).map(U.esc).join(", ")}${uw.fclBreachIds.length > 15 ? " …" : ""}</div>`}</div></div>` : ""}
      </div>

      <div class="stack">
        <div class="card"><div class="card-head"><div class="card-title">Traffic Light</div></div>
          <div class="card-body">${U.trafficChip(tl)}
            <div class="hint" style="margin-top:10px;">Green only when Loss Ratio, FCL breaches, and Industry Risk are all within auto-approval thresholds; any single breach forces Amber or Red.</div>
          </div></div>

        ${tl === "Amber" ? `<div class="card"><div class="card-head"><div><div class="card-title">Indicative Quote</div><div class="card-sub">Non-binding — outside the formal Screen 12 workflow, per FRD business rule</div></div></div>
          <div class="card-body">
            ${kase.indicativeQuote ? `<div class="brk-row total"><span>Indicative premium (non-binding)</span><span>${U.fmtMoney(kase.indicativeQuote.premium, cur)}</span></div>
              <div class="hint" style="margin-top:6px;">Generated ${U.fmtDate(kase.indicativeQuote.generatedAt)}. Cannot be used to generate a Proposal — Underwriting must Approve first.</div>` : ""}
            <button type="button" class="btn btn-sm" style="margin-top:8px;" data-action="generate-indicative-quote" data-case="${kase.id}">${kase.indicativeQuote ? "Regenerate" : "Generate"} Indicative Quote →</button>
          </div></div>` : ""}

        <div class="card"><div class="card-head"><div class="card-title">Decision</div><div class="card-sub">Acting as: ${U.esc(role)}</div></div>
          <div class="card-body">
            ${uw.decision !== "Pending" ? `<div class="brk-row"><span>Current status</span>${U.pill(uw.decision)}</div>
              ${uw.decisionBy ? `<div class="brk-row"><span>Decided by</span><span>${U.esc(U.underwriter(uw.decisionBy).name || "—")} on ${U.fmtDate(uw.decisionDate)}</span></div>` : ""}
              ${uw.comments ? `<div class="brk-row"><span>Comments</span><span>${U.esc(uw.comments)}</span></div>` : ""}` : ""}

            ${uw.decision === "Request Information" ? `
              <div class="skip-note" style="border-color:var(--amber);background:var(--amber-tint);margin:10px 0;">
                <strong>Query for Sales:</strong> ${U.esc(uw.requestInfoNote)}
              </div>
              <div class="field-row"><label>Response from Sales</label><textarea class="input" id="uwResponseText" placeholder="Provide the requested information…"></textarea></div>
              <button type="button" class="btn btn-amber btn-sm" data-action="uw-respond" data-case="${kase.id}">Submit Response &amp; Return to Underwriter</button>
            ` : decided ? "" : `
              <div class="field-row"><label>Loading <span class="opt">optional, % — applied to premium on Approve, per FRD Screen 12 business rule</span></label>
                <input class="input" id="uwLoadingPct" type="number" min="0" max="100" value="${uw.loadingPct || ""}" placeholder="e.g. 15"></div>
              <div class="field-row"><label>Underwriter Comments <span class="opt">optional</span></label>
                <textarea class="input" id="uwComments" placeholder="Rationale for this decision…"></textarea>
                <div class="hint"><a data-action="ai-draft-uw-comments" data-case="${kase.id}" style="cursor:pointer;">Draft with AI →</a> generates a starting point from the risk factors above — review and edit before submitting.</div></div>
              ${!isUW ? `<div class="hint" style="color:var(--red);margin-bottom:8px;">Only Underwriter / Senior Underwriter roles can record a decision. Switch role from the sidebar to demo this action.</div>` :
                (tl === "Red" && role !== "Senior Underwriter") ? `<div class="hint" style="color:var(--red);margin-bottom:8px;">This is a Red case — Approve/Reject requires Senior Underwriter authority. You may still Refer or Request Information.</div>` : ""}
              <div style="display:flex;gap:8px;flex-wrap:wrap;">
                <button type="button" class="btn btn-teal btn-sm" data-action="uw-decide" data-decision="Approve" data-case="${kase.id}" ${!canApproveReject ? "disabled" : ""}>Approve</button>
                <button type="button" class="btn btn-sm" data-action="uw-decide" data-decision="Refer" data-case="${kase.id}" ${!isUW ? "disabled" : ""}>Refer</button>
                <button type="button" class="btn btn-danger btn-sm" data-action="uw-decide" data-decision="Reject" data-case="${kase.id}" ${!canApproveReject ? "disabled" : ""}>Reject</button>
                <button type="button" class="btn btn-ghost btn-sm" data-action="uw-request-info" data-case="${kase.id}" ${!isUW ? "disabled" : ""}>Request Information</button>
              </div>`}
          </div></div>
      </div>
    </div>`;
  };

  ACTIONS["generate-indicative-quote"] = function (d) {
    const kase = U.kase(d.case);
    kase.indicativeQuote = { premium: DB.calc.basePremium(kase), generatedAt: DB.TODAY };
    U.toast("Indicative, non-binding quote generated — outside the formal workflow until Underwriting Approves.", "warn");
    App.render();
  };

  ACTIONS["ai-draft-uw-comments"] = function (d) {
    const kase = U.kase(d.case);
    const el = document.getElementById("uwComments");
    if (!el) return;
    el.value = "[AI-drafted — review before submitting]\n" + AI.draftUnderwritingNarrative(kase);
  };

  ACTIONS["uw-decide"] = function (d) {
    const kase = U.kase(d.case);
    const commentsEl = document.getElementById("uwComments");
    const loadingEl = document.getElementById("uwLoadingPct");
    kase.underwriting.decision = d.decision;
    kase.underwriting.decisionBy = DB.CURRENT_USER.id;
    kase.underwriting.decisionDate = DB.TODAY;
    kase.underwriting.comments = commentsEl ? commentsEl.value : "";
    if (d.decision === "Approve" && loadingEl) kase.underwriting.loadingPct = Math.max(0, Math.min(100, Number(loadingEl.value) || 0));
    const tl = DB.calc.trafficLight(kase);
    DB.pushNotif(kase, "Underwriting decision recorded", d.decision === "Approve" ? "ok" : "warn",
      `Underwriting <strong>${U.esc(d.decision)}</strong> for ${U.esc(kase.lead.companyName)} (${tl})`, `#/case/${kase.id}/underwriting`);
    if (tl !== "Green") DB.pushNotif(kase, "Underwriting decision recorded", "warn", `Referral alert routed to Senior Underwriter queue — ${U.esc(kase.lead.companyName)}`, `#/case/${kase.id}/underwriting`);
    U.toast(`Underwriting decision <strong>${U.esc(d.decision)}</strong> recorded for ${U.esc(kase.lead.companyName)}.`);
    App.render();
  };

  ACTIONS["uw-request-info"] = function (d) {
    U.openModal("Request Information from Sales",
      `<div class="field"><label>Query for Sales Executive</label>
        <textarea id="reqInfoNote" placeholder="e.g. Please confirm employee count reconciliation and any pending medical declarations.">Please confirm employee count reconciliation and any pending medical declarations.</textarea></div>`,
      `<button class="btn btn-ghost" data-action="close-modal">Cancel</button><button class="btn btn-amber" data-action="submit-request-info" data-case="${d.case}">Send</button>`);
  };

  ACTIONS["submit-request-info"] = function (d) {
    const kase = U.kase(d.case);
    const note = document.getElementById("reqInfoNote").value.trim();
    if (!note) { U.toast("Enter a query before sending.", "err"); return; }
    kase.underwriting.decision = "Request Information";
    kase.underwriting.requestInfoNote = note;
    DB.pushNotif(kase, "Underwriting decision recorded", "warn", `Underwriter requested more information for <strong>${U.esc(kase.lead.companyName)}</strong> — opportunity paused.`, `#/case/${kase.id}/underwriting`);
    U.closeModal();
    U.toast("Request for information sent to Sales Executive. Opportunity stage paused.", "warn");
    App.render();
  };

  ACTIONS["uw-respond"] = function (d) {
    const kase = U.kase(d.case);
    const text = document.getElementById("uwResponseText").value.trim();
    if (!text) { U.toast("Enter a response before submitting.", "err"); return; }
    kase.underwriting.decision = "Pending";
    kase.underwriting.comments = "Sales response: " + text;
    kase.underwriting.requestInfoNote = "";
    U.toast("Response submitted — case returned to Underwriter queue.");
    App.render();
  };
})();
