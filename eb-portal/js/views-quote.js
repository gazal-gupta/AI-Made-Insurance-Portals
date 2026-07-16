/* ============================================================
   Screens 12–14: Premium Calc & Quote Comparison ·
   Proposal Review · Negotiation
   ============================================================ */
(function () {
  const U = UI, J = JOURNEY;
  window.SCREENS = window.SCREENS || {};

  const TERMS = "Cover incepts on the Policy Effective Date and is subject to receipt of premium in full. " +
    "Renewal terms are subject to review of claims experience. Standard policy wording per product filing applies; " +
    "this proposal does not itself constitute a contract of insurance.";
  const EXCLUSIONS = "Self-inflicted injury, war and nuclear risks, cosmetic treatment, non-allopathic treatment " +
    "(unless specifically opted), and pre-existing conditions during any applicable waiting period, per product terms.";

  /* ---------- Screen 12: Premium Calculation & Quote Comparison ---------- */
  SCREENS["premium-quote"] = function (kase) {
    const uwOk = kase.underwriting && kase.underwriting.decision === "Approve";
    if (!kase.quotes || !kase.quotes.length) kase.quotes = DB.calc.quoteOptions(kase);
    const cur = U.currencyOf(kase);

    return `
    <div class="screen-head">
      <div class="screen-num">Screen 12</div>
      <div class="screen-title">Premium Calculation &amp; Quote Comparison</div>
      <div class="screen-purpose">Generate and compare multiple rated quote options for employer review.</div>
    </div>
    ${!uwOk ? `<div class="skip-note" style="border-color:var(--red);background:var(--red-tint);">Premium calculation is blocked until Underwriting status is Approve. Amber/Refer cases may receive an indicative, non-binding quote outside this workflow.</div>` : `
    <div class="quote-grid">
      ${kase.quotes.map(q => `
      <div class="quote-card ${kase.selectedQuoteId === q.id ? "selected" : ""}">
        ${kase.selectedQuoteId === q.id ? `<span class="qc-badge">Selected</span>` : ""}
        <div class="qc-name">${U.esc(q.name)}</div>
        <div class="qc-premium">${U.fmtMoney(q.premium, cur)}</div>
        <ul>${q.benefits.map(b => `<li>${U.esc(b)}</li>`).join("")}</ul>
        <button type="button" class="btn btn-sm ${kase.selectedQuoteId === q.id ? "btn-teal" : ""}" data-action="select-quote" data-case="${kase.id}" data-quote="${q.id}">${kase.selectedQuoteId === q.id ? "Selected" : "Select Option"}</button>
      </div>`).join("")}
    </div>
    ${kase.underwriting.loadingPct ? `<div class="hint" style="margin-top:12px;">Underwriting loading of ${kase.underwriting.loadingPct}% has been applied to the premiums above.</div>` : ""}
    <div class="screen-foot">
      <span class="page-meta">${kase.selectedQuoteId ? "Option " + kase.selectedQuoteId + " selected" : "Select an option to continue"}</span>
      <div class="right"><button type="button" class="btn btn-amber" data-action="generate-proposal" data-case="${kase.id}" ${!kase.selectedQuoteId ? "disabled" : ""}>Generate Proposal →</button></div>
    </div>`}`;
  };

  ACTIONS["select-quote"] = function (d) {
    const kase = U.kase(d.case);
    kase.selectedQuoteId = d.quote;
    App.render();
  };

  ACTIONS["generate-proposal"] = function (d) {
    const kase = U.kase(d.case);
    const q = kase.quotes.find(x => x.id === kase.selectedQuoteId);
    const cur = U.currencyOf(kase);
    const taxRate = cur === "OMR" ? 0.05 : 0.18;
    const taxes = Math.round(q.premium * taxRate);
    kase.proposal = {
      premium: q.premium, taxes, brokerage: kase.brokerId ? Math.round(q.premium * 0.025) : 0,
      discountPct: 0, discount: 0, netPremium: q.premium + taxes, sentAt: null, sentTo: null
    };
    U.toast(`Proposal generated for <strong>${U.esc(kase.lead.companyName)}</strong>.`);
    location.hash = `#/case/${kase.id}/${J.nextStepKey(kase, "premium-quote")}`;
  };

  /* ---------- Screen 13: Proposal Review ---------- */
  SCREENS["proposal"] = function (kase) {
    const p = kase.proposal;
    const cur = U.currencyOf(kase);
    const needsApprovalFirst = p.discountPct > 0 && !(kase.approval && kase.approval.steps.every(s => s.status === "Approved"));
    return `
    <div class="screen-head">
      <div class="screen-num">Screen 13</div>
      <div class="screen-title">Proposal Review</div>
      <div class="screen-purpose">Assemble the final commercial proposal for employer sign-off.</div>
    </div>
    <div class="two-col">
      <div class="stack">
        <form id="screenForm">
          <div class="screen-grid">
            <div class="field-row"><label>Brokerage <span class="opt">₹ — applies if a Broker is associated</span></label>
              <input class="input" name="brokerage" type="number" min="0" value="${p.brokerage}" ${!kase.brokerId ? "readonly" : ""}></div>
            <div class="field-row"><label>Discount (%) <span class="opt">requires approval if &gt; 0%</span></label>
              <input class="input" name="discountPct" type="number" min="0" max="30" value="${p.discountPct}"></div>
          </div>
          <button type="button" class="btn btn-sm" data-action="recalc-proposal" data-case="${kase.id}">Recalculate</button>
        </form>
        <div class="card"><div class="card-body">
          <div class="brk-row"><span>Premium (selected option)</span><span>${U.fmtMoney(p.premium, cur)}</span></div>
          <div class="brk-row"><span>Taxes</span><span>${U.fmtMoney(p.taxes, cur)}</span></div>
          <div class="brk-row"><span class="muted">Brokerage${kase.brokerId ? "" : " (n/a — direct business)"}</span><span class="muted">${U.fmtMoney(p.brokerage, cur)}</span></div>
          <div class="brk-row"><span class="muted">Discount (${p.discountPct}%)</span><span class="muted">−${U.fmtMoney(p.discount, cur)}</span></div>
          <div class="brk-row total"><span>Net Premium</span><span>${U.fmtMoney(p.netPremium, cur)}</span></div>
        </div></div>
        <div class="card"><div class="card-head"><div class="card-title">Terms &amp; Conditions</div></div><div class="card-body" style="font-size:12.5px;color:var(--ink-2);">${TERMS}</div></div>
        <div class="card"><div class="card-head"><div class="card-title">Exclusions</div></div><div class="card-body" style="font-size:12.5px;color:var(--ink-2);">${EXCLUSIONS}</div></div>
      </div>
      <div class="stack">
        <div class="card"><div class="card-head"><div class="card-title">Send Proposal</div></div>
          <div class="card-body">
            ${p.sentAt ? `<div class="brk-row"><span>Sent</span><span>${U.fmtDate(p.sentAt)}</span></div><div class="brk-row"><span>To</span><span>${U.esc(p.sentTo)}</span></div>` : ""}
            ${needsApprovalFirst ? `<div class="hint" style="color:var(--red);margin-bottom:10px;">Discount applied before sending — per the Approval Matrix this requires sign-off before the proposal can be sent.</div>
              <button type="button" class="btn btn-sm" data-action="nav" data-href="#/case/${kase.id}/approval">Route to Approval Workflow →</button>` : `
              <button type="button" class="btn btn-sm" data-action="generate-pdf" data-case="${kase.id}">Generate PDF</button>
              <button type="button" class="btn btn-amber btn-sm" data-action="send-proposal" data-case="${kase.id}" style="margin-left:8px;">Send Email</button>`}
          </div></div>
      </div>
    </div>
    <div class="screen-foot">
      <span class="page-meta">${p.sentAt ? "Proposal sent — continue to Negotiation if the employer requests changes" : "Send the proposal to continue"}</span>
      <div class="right"><button type="button" class="btn btn-amber" data-action="continue-proposal" data-case="${kase.id}" ${!p.sentAt ? "disabled" : ""}>Continue →</button></div>
    </div>`;
  };

  ACTIONS["recalc-proposal"] = function (d) {
    const kase = U.kase(d.case);
    const fd = new FormData(document.getElementById("screenForm"));
    const discountPct = Math.max(0, Math.min(30, Number(fd.get("discountPct")) || 0));
    const brokerage = Number(fd.get("brokerage")) || 0;
    const discount = Math.round(kase.proposal.premium * discountPct / 100);
    kase.proposal.brokerage = brokerage;
    kase.proposal.discountPct = discountPct;
    kase.proposal.discount = discount;
    kase.proposal.netPremium = kase.proposal.premium + kase.proposal.taxes - discount;
    App.render();
  };

  ACTIONS["generate-pdf"] = function (d) { U.downloadStub(`${U.kase(d.case).id}_Proposal.pdf`, "proposal PDF"); };

  ACTIONS["send-proposal"] = function (d) {
    const kase = U.kase(d.case);
    kase.proposal.sentAt = DB.TODAY;
    kase.proposal.sentTo = kase.employer.hrContact.split("/")[0].trim() + (kase.brokerId ? " (HR); " + U.broker(kase.brokerId).name : " (HR)");
    if (kase.stage === "Underwriting" || DB.STATUS_FLOW.indexOf(kase.stage) < DB.STATUS_FLOW.indexOf("Proposal Shared")) kase.stage = "Proposal Shared";
    DB.pushNotif(kase, "Proposal sent", "ok", `Proposal PDF sent for <strong>${U.esc(kase.lead.companyName)}</strong> with read-receipt tracking.`, `#/case/${kase.id}/proposal`);
    U.toast("Proposal emailed to HR Contact" + (kase.brokerId ? " and Broker" : "") + " with read receipt tracking.");
    App.render();
  };

  ACTIONS["continue-proposal"] = function (d) {
    const kase = U.kase(d.case);
    location.hash = `#/case/${kase.id}/${J.nextStepKey(kase, "proposal")}`;
  };

  /* ---------- Screen 14: Negotiation ---------- */
  SCREENS["negotiation"] = function (kase) {
    if (!kase.negotiation) kase.negotiation = { requests: [], salesComments: "", uwComments: "", financeComments: "", discountRequestedPct: kase.proposal.discountPct, resubmitted: false };
    const n = kase.negotiation;
    const role = DB.CURRENT_USER.role;
    const canEditUW = role === "Underwriter" || role === "Senior Underwriter";
    const canEditFin = role === "Finance";
    return `
    <div class="screen-head">
      <div class="screen-num">Screen 14</div>
      <div class="screen-title">Negotiation</div>
      <div class="screen-purpose">Capture and route employer-requested changes to the proposed terms.</div>
    </div>
    <form id="screenForm">
      <div class="screen-grid">
        <div class="field-row"><label>Increase Sum Insured <span class="opt">optional, ₹ — triggers premium recalculation</span></label>
          <input class="input" name="increaseSI" type="number" min="0"></div>
        <div class="field-row"><label>Discount Requested (%) <span class="opt">routed per Approval Matrix based on magnitude</span></label>
          <input class="input" name="discountRequestedPct" type="number" min="0" max="30" value="${n.discountRequestedPct}"></div>
        <div class="field-row full"><label>Benefit Changes <span class="opt">optional — free-form or structured change request</span></label>
          <textarea class="input" name="benefitChanges" placeholder="e.g. Increase OPD sub-limit from ₹15,000 to ₹25,000 per employee"></textarea></div>
        <div class="field-row full"><label class="toggle-row" style="text-transform:none;font-size:12.5px;font-weight:600;color:var(--ink);">
          <input type="checkbox" id="riskImpact"> This request moves Sum Insured, Cover, or Benefits beyond the originally approved Underwriting parameters</label>
          <div class="hint">If checked, Resubmit will automatically re-trigger Underwriting review (Screen 11) before the quote can be regenerated.</div></div>
        <div class="field-row full"><label>Sales Comments <span class="opt">visible to Sales and Management</span></label>
          <textarea class="input" name="salesComments">${U.esc(n.salesComments)}</textarea></div>
        <div class="field-row full"><label>UW Comments <span class="opt">${canEditUW ? "visible to Underwriting and Management" : "read-only to Sales"}</span></label>
          <textarea class="input" name="uwComments" ${!canEditUW ? "readonly" : ""}>${U.esc(n.uwComments)}</textarea></div>
        <div class="field-row full"><label>Finance Comments <span class="opt">${canEditFin ? "visible to Finance and Management" : "read-only to Sales"}</span></label>
          <textarea class="input" name="financeComments" ${!canEditFin ? "readonly" : ""}>${U.esc(n.financeComments)}</textarea></div>
      </div>
      ${n.requests.length ? `<div class="card"><div class="card-head"><div class="card-title">Requests on record</div></div>
        <div class="card-body"><ul class="errlist">${n.requests.map(r => `<li><span>${U.esc(r.type)} — ${U.esc(r.detail)}</span><span class="cell-sub">${U.esc(r.by)}, ${U.fmtDate(r.date)}</span></li>`).join("")}</ul></div></div>` : ""}
      <div class="screen-foot"><span class="page-meta">Resubmitting recalculates the quote at Screen 12</span>
        <div class="right"><button type="button" class="btn btn-amber" data-action="resubmit-negotiation" data-case="${kase.id}">Resubmit Quote →</button></div>
      </div>
    </form>`;
  };

  ACTIONS["resubmit-negotiation"] = function (d) {
    const kase = U.kase(d.case);
    const fd = new FormData(document.getElementById("screenForm"));
    const riskImpact = document.getElementById("riskImpact").checked;
    const discountRequestedPct = Math.max(0, Math.min(30, Number(fd.get("discountRequestedPct")) || 0));
    const benefitChanges = fd.get("benefitChanges");

    const requests = (kase.negotiation && kase.negotiation.requests) || [];
    if (discountRequestedPct > 0) requests.push({ type: "Discount Requested", detail: `Employer requested ${discountRequestedPct}% discount.`, date: DB.TODAY, by: "Corporate HR" });
    if (benefitChanges) requests.push({ type: "Benefit Changes", detail: benefitChanges, date: DB.TODAY, by: "Corporate HR" });
    if (Number(fd.get("increaseSI")) > 0) requests.push({ type: "Increase Sum Insured", detail: `Requested increase of ${U.fmtINR(Number(fd.get("increaseSI")))}.`, date: DB.TODAY, by: "Corporate HR" });

    kase.negotiation = {
      requests, salesComments: fd.get("salesComments") || "", uwComments: fd.get("uwComments") || "",
      financeComments: fd.get("financeComments") || "", discountRequestedPct, resubmitted: true
    };

    kase.proposal.discountPct = discountRequestedPct;
    kase.proposal.discount = Math.round(kase.proposal.premium * discountRequestedPct / 100);
    kase.proposal.netPremium = kase.proposal.premium + kase.proposal.taxes - kase.proposal.discount;

    if (riskImpact) {
      kase.underwriting.decision = "Pending";
      kase.selectedQuoteId = null;
      kase.quotes = [];
      U.toast("Negotiated change moves risk beyond originally approved parameters — case re-routed to Underwriting for review.", "warn");
      location.hash = `#/case/${kase.id}/underwriting`;
    } else {
      U.toast("Quote resubmitted with updated terms.");
      location.hash = `#/case/${kase.id}/${J.nextStepKey(kase, "negotiation")}`;
    }
  };
})();
