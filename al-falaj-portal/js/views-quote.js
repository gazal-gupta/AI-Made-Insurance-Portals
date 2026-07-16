/* ============================================================
   Screens 12–14: Premium Calc & Quote Comparison ·
   Proposal Review · Negotiation
   ============================================================ */
(function () {
  const U = UI, J = JOURNEY;
  window.SCREENS = window.SCREENS || {};
  window.VIEWS = window.VIEWS || {};

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
    // VAT is 5% in Oman and the UAE; Qatar has not yet implemented VAT under the GCC
    // framework, so it rates at 0%. India's GST (18%, dormant/hidden by default) still
    // applies for any case that explicitly opts into geography:"India".
    const TAX_RATES = { OMR: 0.05, AED: 0.05, QAR: 0, INR: 0.18 };
    const taxRate = TAX_RATES[cur] != null ? TAX_RATES[cur] : 0.05;
    const taxes = Math.round(q.premium * taxRate);
    kase.proposal = {
      premium: q.premium, taxes, brokerage: DB.calc.brokerageFor(kase, q.premium),
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
            <div class="field-row"><label>Brokerage <span class="opt">${cur} — applies if a Broker is associated</span></label>
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
        ${kase.benefitGMC ? `<div class="card"><div class="card-head"><div><div class="card-title">Interactive Proposal Link</div><div class="card-sub">Let the employer explore co-pay/rider trade-offs themselves</div></div></div>
          <div class="card-body">
            <p style="font-size:12.5px;color:var(--ink-2);margin:0 0 10px;">Generates a secure link the HR decision-maker can open to adjust co-pay, corporate buffer and riders and see the premium update instantly — bounded to the underwriting guardrails already approved for this case, no re-quote needed.</p>
            <button type="button" class="btn btn-sm" data-action="nav" data-href="#/proposal-microsite/${kase.id}">Open Interactive Proposal →</button>
          </div></div>` : ""}
        ${!p.sentAt ? `<div class="card"><div class="card-head"><div><div class="card-title">Cover Note</div><div class="card-sub">Optional — included with the email when sent</div></div></div>
          <div class="card-body">
            <textarea class="input" id="proposalCoverNote" style="min-height:120px;" placeholder="Write a cover note, or draft one with AI…">${U.esc(p.coverNote || "")}</textarea>
            <div class="hint" style="margin-top:6px;"><a data-action="ai-draft-cover-note" data-case="${kase.id}" style="cursor:pointer;">Draft with AI →</a> summarises this proposal for the HR contact — review and edit before sending.</div>
          </div></div>` : ""}
        <div class="card"><div class="card-head"><div class="card-title">Send Proposal</div></div>
          <div class="card-body">
            ${p.sentAt ? `<div class="brk-row"><span>Sent</span><span>${U.fmtDate(p.sentAt)}</span></div><div class="brk-row"><span>To</span><span>${U.esc(p.sentTo)}</span></div>
              ${p.coverNote ? `<div class="card-sub" style="margin-top:10px;white-space:pre-wrap;">${U.esc(p.coverNote)}</div>` : ""}` : ""}
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

  ACTIONS["ai-draft-cover-note"] = function (d) {
    const kase = U.kase(d.case);
    const el = document.getElementById("proposalCoverNote");
    if (!el) return;
    el.value = AI.draftProposalCoverNote(kase);
  };

  ACTIONS["send-proposal"] = function (d) {
    const kase = U.kase(d.case);
    const noteEl = document.getElementById("proposalCoverNote");
    if (noteEl) kase.proposal.coverNote = noteEl.value.trim();
    kase.proposal.sentAt = DB.TODAY;
    kase.proposal.sentTo = kase.employer.hrContact.split("/")[0].trim() + (kase.brokerId ? " (HR); " + U.broker(kase.brokerId).name : " (HR)");
    if (kase.stage === "Underwriting" || DB.STATUS_FLOW.indexOf(kase.stage) < DB.STATUS_FLOW.indexOf("Proposal Shared")) kase.stage = "Proposal Shared";
    DB.pushNotif(kase, "Proposal sent", "ok", `Proposal PDF sent for <strong>${U.esc(kase.lead.companyName)}</strong> with read-receipt tracking.`, `#/case/${kase.id}/proposal`);
    U.toast("Proposal emailed to HR Contact" + (kase.brokerId ? ` and ${U.esc(U.broker(kase.brokerId).name)}` : "") + " with read receipt tracking.");
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
    const cur = U.currencyOf(kase);
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
        <div class="field-row"><label>Increase Sum Insured <span class="opt">optional, ${cur} — triggers premium recalculation</span></label>
          <input class="input" name="increaseSI" type="number" min="0"></div>
        <div class="field-row"><label>Discount Requested (%) <span class="opt">routed per Approval Matrix based on magnitude</span></label>
          <input class="input" name="discountRequestedPct" type="number" min="0" max="30" value="${n.discountRequestedPct}"></div>
        <div class="field-row full"><label>Benefit Changes <span class="opt">optional — free-form or structured change request</span></label>
          <textarea class="input" name="benefitChanges" placeholder="e.g. Increase OPD sub-limit from ${cur} 300 to ${cur} 500 per employee"></textarea></div>
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
      <div class="field-row" style="margin-top:4px;">
        <button type="button" class="btn btn-sm" data-action="stub-whatsapp-negotiation" data-case="${kase.id}">Send via WhatsApp (prototype) →</button>
        <div class="hint">Lets the HR contact approve terms or submit missing census data directly in-chat. Simulated for this demo — needs a real WhatsApp Business API integration (out of scope for Section 1.4's current channel list).</div>
      </div>
      <div class="screen-foot"><span class="page-meta">Resubmitting recalculates the quote at Screen 12</span>
        <div class="right"><button type="button" class="btn btn-amber" data-action="resubmit-negotiation" data-case="${kase.id}">Resubmit Quote →</button></div>
      </div>
    </form>`;
  };

  ACTIONS["stub-whatsapp-negotiation"] = function (d) {
    const kase = U.kase(d.case);
    const hr = kase.employer && kase.employer.hrContact ? kase.employer.hrContact.split("/")[0].trim() : "the HR contact";
    U.toast(`Prototype only — in production this would open a WhatsApp Business thread with <strong>${U.esc(hr)}</strong> to exchange quote approval / missing census data directly. No message was actually sent.`, "warn");
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
    if (Number(fd.get("increaseSI")) > 0) requests.push({ type: "Increase Sum Insured", detail: `Requested increase of ${U.fmtMoneyFull(Number(fd.get("increaseSI")), U.currencyOf(kase))}.`, date: DB.TODAY, by: "Corporate HR" });

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

  /* ---------- Interactive Proposal Microsite (futuristic feature) ----------
     Represents the shareable, employer-facing link from Screen 13: the HR contact
     drags sliders and sees the premium update instantly, bounded to guardrails
     derived from the already-underwritten configuration — no re-quote, no re-underwriting.
     Riders (OPD/Dental/Vision) are already rate-carded, so they toggle freely; co-pay and
     corporate buffer are clamped to a band around the approved values. */
  function micrositeGuardrails(b) {
    return {
      copay: { min: Math.max(0, (b.copay || 0) - 10), max: Math.min(30, (b.copay || 0) + 10) },
      corporateBuffer: { min: 0, max: Math.max(2000, Math.round((b.corporateBuffer || 0) * 1.5)) }
    };
  }

  VIEWS["proposal-microsite"] = function (caseId) {
    const kase = U.kase(caseId);
    if (!kase) return VIEWS.notFound(caseId);
    if (!kase.benefitGMC || !kase.proposal) return `<div class="empty"><div class="big">Not available yet</div>This link activates once a proposal has been generated.<br><br><span class="back-link" data-href="#/case/${kase.id}/proposal">← Back to Proposal Review</span></div>`;

    const b = kase.benefitGMC;
    const cur = U.currencyOf(kase);
    const gr = micrositeGuardrails(b);
    const initialPremium = DB.calc.calcGMCPremium(kase) + DB.calc.calcGTLPremium(kase);

    return `
    <div class="skip-note" style="background:var(--blue-tint);border-color:var(--blue-ink);color:var(--ink);margin-bottom:16px;">
      This is a preview of the secure, employer-facing link generated from Screen 13. In production it would be sent directly to the HR contact — no login to this portal required.
    </div>
    <div class="page-head"><div><div class="page-title">${U.esc(kase.lead.companyName)} — Interactive Proposal</div><div class="page-sub">Adjust the sliders below to see the premium impact instantly, within pre-approved underwriting guardrails.</div></div></div>
    <div class="two-col">
      <div class="stack">
        <div class="card"><div class="card-body">
          <div class="field-row"><label>Co-pay <span class="opt">${gr.copay.min}%–${gr.copay.max}% — guardrail band around the underwritten value</span></label>
            <input type="range" id="msCopay" min="${gr.copay.min}" max="${gr.copay.max}" step="1" value="${b.copay || 0}" data-action="recalc-microsite" data-case="${kase.id}" style="width:100%;">
            <div class="brk-row"><span>Selected</span><span id="msCopayVal">${b.copay || 0}%</span></div></div>
          <div class="field-row"><label>Corporate Buffer <span class="opt">${cur} 0–${gr.corporateBuffer.max.toLocaleString()}</span></label>
            <input type="range" id="msBuffer" min="${gr.corporateBuffer.min}" max="${gr.corporateBuffer.max}" step="${Math.max(100, Math.round(gr.corporateBuffer.max / 20))}" value="${b.corporateBuffer || 0}" data-action="recalc-microsite" data-case="${kase.id}" style="width:100%;">
            <div class="brk-row"><span>Selected</span><span id="msBufferVal">${U.fmtMoney(b.corporateBuffer || 0, cur)}</span></div></div>
          <div class="field-row full"><label>Riders</label>
            <div class="check-row">
              <label class="check-opt"><input type="checkbox" id="msOpd" ${b.opd ? "checked" : ""} data-action="recalc-microsite" data-case="${kase.id}"> OPD</label>
              <label class="check-opt"><input type="checkbox" id="msDental" ${b.dental ? "checked" : ""} data-action="recalc-microsite" data-case="${kase.id}"> Dental</label>
              <label class="check-opt"><input type="checkbox" id="msVision" ${b.vision ? "checked" : ""} data-action="recalc-microsite" data-case="${kase.id}"> Vision</label>
            </div></div>
        </div></div>
      </div>
      <div class="stack">
        <div class="card"><div class="card-head"><div class="card-title">Premium Impact</div></div>
          <div class="card-body">
            <div class="brk-row"><span>Base premium (as proposed)</span><span>${U.fmtMoney(kase.proposal.premium, cur)}</span></div>
            <div class="brk-row total"><span>Updated premium</span><span id="msPremium">${U.fmtMoney(initialPremium, cur)}</span></div>
            <div class="hint" style="margin-top:8px;">Taxes and brokerage are recalculated the same way once this configuration is formally requested.</div>
          </div></div>
        <div class="card"><div class="card-body">
          <button type="button" class="btn btn-amber btn-sm" data-action="microsite-send-request" data-case="${kase.id}">Send this request to my Broker / Sales contact →</button>
        </div></div>
      </div>
    </div>`;
  };

  ACTIONS["recalc-microsite"] = function (d) {
    const kase = U.kase(d.case);
    const cur = U.currencyOf(kase);
    const copay = Number(document.getElementById("msCopay").value);
    const corporateBuffer = Number(document.getElementById("msBuffer").value);
    const opd = document.getElementById("msOpd").checked;
    const dental = document.getElementById("msDental").checked;
    const vision = document.getElementById("msVision").checked;
    document.getElementById("msCopayVal").textContent = copay + "%";
    document.getElementById("msBufferVal").textContent = U.fmtMoney(corporateBuffer, cur);
    const premium = DB.calc.calcGMCPremium(kase, null, { copay, corporateBuffer, opd, dental, vision }) + DB.calc.calcGTLPremium(kase);
    document.getElementById("msPremium").textContent = U.fmtMoney(premium, cur);
  };

  ACTIONS["microsite-send-request"] = function (d) {
    const kase = U.kase(d.case);
    const copay = Number(document.getElementById("msCopay").value);
    const corporateBuffer = Number(document.getElementById("msBuffer").value);
    const opd = document.getElementById("msOpd").checked;
    const dental = document.getElementById("msDental").checked;
    const vision = document.getElementById("msVision").checked;
    const premium = DB.calc.calcGMCPremium(kase, null, { copay, corporateBuffer, opd, dental, vision }) + DB.calc.calcGTLPremium(kase);

    if (!kase.negotiation) kase.negotiation = { requests: [], salesComments: "", uwComments: "", financeComments: "", discountRequestedPct: kase.proposal.discountPct, resubmitted: false };
    const detail = `Employer requested via Interactive Proposal Link: Co-pay ${copay}%, Corporate Buffer ${U.fmtMoney(corporateBuffer, U.currencyOf(kase))}, riders [${[opd && "OPD", dental && "Dental", vision && "Vision"].filter(Boolean).join(", ") || "none"}] — indicative premium ${U.fmtMoney(premium, U.currencyOf(kase))}.`;
    kase.negotiation.requests.push({ type: "Benefit Changes", detail, date: DB.TODAY, by: "Corporate HR (Interactive Proposal Link)" });
    DB.pushNotif(kase, "Interactive proposal request", "info", `<strong>${U.esc(kase.lead.companyName)}</strong> submitted a configuration request via the Interactive Proposal Link.`, `#/case/${kase.id}/negotiation`);
    U.toast("Request sent to your Broker / Sales contact — it now appears on the Negotiation screen.");
    location.hash = `#/case/${kase.id}/negotiation`;
  };
})();
