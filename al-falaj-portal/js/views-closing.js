/* ============================================================
   Screens 15–17: Approval Workflow · Premium Payment · Policy Issuance
   ============================================================ */
(function () {
  const U = UI, J = JOURNEY;
  window.SCREENS = window.SCREENS || {};

  function roleCanAction(stepRole) {
    const r = DB.CURRENT_USER.role;
    if (stepRole === "Underwriter") return r === "Underwriter" || r === "Senior Underwriter";
    return r === stepRole;
  }

  /* ---------- Screen 15: Approval Workflow ---------- */
  SCREENS["approval"] = function (kase) {
    if (!kase.approval) {
      const route = DB.calc.approvalRoute(kase);
      kase.approval = { steps: route.steps, reason: route.reason };
    }
    const steps = kase.approval.steps;
    const currentIdx = steps.findIndex(s => s.status === "Pending");

    return `
    <div class="screen-head">
      <div class="screen-num">Screen 15</div>
      <div class="screen-title">Approval Workflow</div>
      <div class="screen-purpose">Route the finalised proposal through internal sign-off before payment and issuance.</div>
    </div>
    <div class="skip-note" style="margin-bottom:16px;">${U.esc(kase.approval.reason)}</div>
    <div class="approval-chain" style="margin-bottom:20px;">
      ${steps.map((s, i) => `
      <div class="appr-node ${i === currentIdx ? "current" : ""}">
        <div class="appr-role">${U.esc(s.role)}</div>
        <div class="appr-status">${U.pill(s.status)}</div>
        ${s.by ? `<div class="appr-meta">${U.esc(s.by)}, ${U.fmtDate(s.date)}</div>` : i === currentIdx ? `<div class="appr-meta">Acting as: ${U.esc(DB.CURRENT_USER.role)}</div>` : `<div class="appr-meta">Awaiting prior step</div>`}
        ${s.comment ? `<div class="appr-meta">“${U.esc(s.comment)}”</div>` : ""}
      </div>
      ${i < steps.length - 1 ? `<div class="appr-arrow">→</div>` : ""}`).join("")}
    </div>
    ${currentIdx >= 0 ? `
    <div class="card"><div class="card-head"><div class="card-title">Action — ${U.esc(steps[currentIdx].role)}</div></div>
      <div class="card-body">
        <div class="field-row"><label>Comment <span class="opt">optional</span></label><textarea class="input" id="approvalComment"></textarea></div>
        ${!roleCanAction(steps[currentIdx].role) ? `<div class="hint" style="color:var(--red);margin-bottom:8px;">Only ${U.esc(steps[currentIdx].role)} can action this step. Switch role from the sidebar to demo this action.</div>` : ""}
        <div style="display:flex;gap:8px;">
          <button type="button" class="btn btn-teal btn-sm" data-action="approval-decide" data-decision="Approved" data-case="${kase.id}" ${!roleCanAction(steps[currentIdx].role) ? "disabled" : ""}>Approve</button>
          <button type="button" class="btn btn-danger btn-sm" data-action="approval-decide" data-decision="Rejected" data-case="${kase.id}" ${!roleCanAction(steps[currentIdx].role) ? "disabled" : ""}>Reject</button>
          <button type="button" class="btn btn-ghost btn-sm" data-action="approval-sendback" data-case="${kase.id}" ${!roleCanAction(steps[currentIdx].role) ? "disabled" : ""}>Send Back to Negotiation</button>
        </div>
      </div></div>` : `
    <div class="screen-foot"><span class="page-meta">All approvals complete</span>
      <div class="right"><button type="button" class="btn btn-amber" data-action="continue-approval" data-case="${kase.id}">Continue →</button></div>
    </div>`}`;
  };

  ACTIONS["approval-decide"] = function (d) {
    const kase = U.kase(d.case);
    const idx = kase.approval.steps.findIndex(s => s.status === "Pending");
    if (idx === -1) return;
    const step = kase.approval.steps[idx];
    step.status = d.decision;
    step.by = DB.CURRENT_USER.name;
    step.date = DB.TODAY;
    step.comment = (document.getElementById("approvalComment") || {}).value || "";
    if (d.decision === "Rejected") {
      DB.pushNotif(kase, "Approval step completed", "warn", `<strong>${U.esc(step.role)}</strong> rejected the proposal for ${U.esc(kase.lead.companyName)}.`, `#/case/${kase.id}/approval`);
      U.toast(`${U.esc(step.role)} rejected the proposal.`, "err");
      App.render();
      return;
    }
    const next = kase.approval.steps[idx + 1];
    if (next) {
      DB.pushNotif(kase, "Approval step completed", "info", `<strong>${U.esc(next.role)}</strong> approval task created for ${U.esc(kase.lead.companyName)}.`, `#/case/${kase.id}/approval`);
      U.toast(`${U.esc(step.role)} approved. Task routed to ${U.esc(next.role)}.`);
    } else {
      kase.stage = "Approved";
      DB.pushNotif(kase, "Final approval granted", "ok", `All approvals complete for <strong>${U.esc(kase.lead.companyName)}</strong>.`, `#/case/${kase.id}/approval`);
      U.toast("Final approval granted. Sales Executive notified.");
    }
    App.render();
  };

  ACTIONS["approval-sendback"] = function (d) {
    const kase = U.kase(d.case);
    const idx = kase.approval.steps.findIndex(s => s.status === "Pending");
    const step = kase.approval.steps[idx];
    const reason = (document.getElementById("approvalComment") || {}).value || "Terms require revision.";
    if (!kase.negotiation) kase.negotiation = { requests: [], salesComments: "", uwComments: "", financeComments: "", discountRequestedPct: kase.proposal.discountPct, resubmitted: false };
    kase.negotiation.resubmitted = false;
    kase.negotiation.requests.push({ type: "Send Back", detail: `${step.role}: ${reason}`, date: DB.TODAY, by: step.role });
    kase.approval = null;
    U.toast(`Sent back to Negotiation by ${U.esc(step.role)}.`, "warn");
    location.hash = `#/case/${kase.id}/negotiation`;
  };

  ACTIONS["continue-approval"] = function (d) {
    const kase = U.kase(d.case);
    location.hash = `#/case/${kase.id}/${J.nextStepKey(kase, "approval")}`;
  };

  /* ---------- Screen 16: Premium Payment ---------- */
  SCREENS["payment"] = function (kase) {
    const p = kase.payment;
    const cur = U.currencyOf(kase);
    const invoiceNo = p ? p.invoiceNo : `INV-2026-0${100 + DB.CASES.indexOf(kase)}`;
    const premium = kase.proposal.premium - kase.proposal.discount;
    const gst = kase.proposal.taxes;
    const total = premium + gst;
    const taxLabel = cur === "INR" ? "GST" : cur === "QAR" ? "VAT (n/a)" : "VAT";
    // India's payment rails (NEFT/RTGS/UPI) stay fully working but hidden by default;
    // the Gulf currencies (OMR/AED/QAR) get the region's actual settlement methods.
    const modes = cur === "INR" ? ["NEFT", "RTGS", "Cheque", "UPI"] : ["Bank Transfer", "Wire Transfer (SWIFT)", "Cheque", "Online Payment"];
    const txnHint = cur === "INR" ? "Mandatory for NEFT/RTGS/UPI" : "Mandatory for Bank Transfer/Wire Transfer/Online Payment";

    return `
    <div class="screen-head">
      <div class="screen-num">Screen 16</div>
      <div class="screen-title">Premium Payment</div>
      <div class="screen-purpose">Record and reconcile the premium payment prior to policy issuance.</div>
    </div>
    <div class="mini-stats">
      <div class="kpi"><div class="kpi-label">Invoice</div><div class="kpi-value" style="font-size:16px;">${U.esc(invoiceNo)}</div></div>
      <div class="kpi"><div class="kpi-label">Premium</div><div class="kpi-value" style="font-size:16px;">${U.fmtMoney(premium, cur)}</div></div>
      <div class="kpi"><div class="kpi-label">${taxLabel}</div><div class="kpi-value" style="font-size:16px;">${U.fmtMoney(gst, cur)}</div></div>
      <div class="kpi"><div class="kpi-label">Total</div><div class="kpi-value" style="font-size:16px;">${U.fmtMoney(total, cur)}</div></div>
    </div>
    ${!p ? `
    <form id="screenForm">
      <div class="screen-grid">
        <div class="field-row full"><label>Payment Mode <span class="req">*</span></label>
          <div class="radio-row">${modes.map((m, i) => `<label class="radio-opt"><input type="radio" name="mode" value="${m}" ${i === 0 ? "checked" : ""}> ${m}</label>`).join("")}</div></div>
        <div class="field-row"><label>Transaction / Cheque Number <span class="req">*</span></label><input class="input" name="txnNumber" placeholder="${txnHint}"></div>
        <div class="field-row"><label>Upload Payment Proof <span class="req">*</span></label>
          <div class="dropzone" data-action="stub-upload" data-label="payment proof"><div class="dz-title">Click to attach</div><div class="dz-sub">PDF/JPEG, max 5MB</div></div></div>
      </div>
      <div class="screen-foot"><span></span>
        <div class="right"><button type="button" class="btn btn-amber" data-action="submit-payment" data-case="${kase.id}">Submit →</button></div>
      </div>
    </form>` : `
    <div class="card"><div class="card-body">
      <div class="brk-row"><span>Payment Mode</span><span>${U.esc(p.mode)}</span></div>
      <div class="brk-row"><span>Transaction Number</span><span>${U.esc(p.txnNumber)}</span></div>
      <div class="brk-row"><span>Submitted</span><span>${U.fmtDate(p.submittedAt)}</span></div>
      <div class="brk-row"><span>Status</span>${U.pill(p.status)}</div>
    </div></div>
    ${p.status !== "Received" ? `
      <div class="skip-note">Policy Issuance cannot be initiated until payment is reconciled and marked Received by Finance.</div>
      <div class="hint" style="margin:10px 0;">${DB.CURRENT_USER.role !== "Finance" ? "Only Finance can mark this payment as reconciled. Switch role from the sidebar to demo this action." : ""}</div>
      <button type="button" class="btn btn-teal btn-sm" data-action="reconcile-payment" data-case="${kase.id}" ${DB.CURRENT_USER.role !== "Finance" ? "disabled" : ""}>Mark as Received (Finance)</button>
    ` : `
      <div class="screen-foot"><span class="page-meta">Payment reconciled</span>
        <div class="right"><button type="button" class="btn btn-amber" data-action="continue-payment" data-case="${kase.id}">Continue →</button></div>
      </div>`}`}`;
  };

  ACTIONS["submit-payment"] = function (d) {
    const kase = U.kase(d.case);
    const fd = new FormData(document.getElementById("screenForm"));
    if (!fd.get("txnNumber")) { U.toast("Transaction / Cheque Number is required.", "err"); return; }
    kase.payment = {
      invoiceNo: `INV-2026-0${100 + DB.CASES.indexOf(kase)}`, premium: kase.proposal.premium - kase.proposal.discount,
      gst: kase.proposal.taxes, total: kase.proposal.premium - kase.proposal.discount + kase.proposal.taxes,
      mode: fd.get("mode"), txnNumber: fd.get("txnNumber"), proofFile: "payment_proof.pdf",
      status: "Submitted", submittedAt: DB.TODAY
    };
    U.toast("Payment submitted — routed to Finance for reconciliation.");
    App.render();
  };

  ACTIONS["reconcile-payment"] = function (d) {
    const kase = U.kase(d.case);
    kase.payment.status = "Received";
    kase.payment.reconciledAt = DB.TODAY;
    kase.stage = "Paid";
    DB.pushNotif(kase, "Payment received", "ok", `Payment received and reconciled for <strong>${U.esc(kase.lead.companyName)}</strong>.`, `#/case/${kase.id}/payment`);
    U.toast("Payment marked Received. Acknowledgement sent to HR Contact and Finance.");
    App.render();
  };

  ACTIONS["continue-payment"] = function (d) {
    const kase = U.kase(d.case);
    location.hash = `#/case/${kase.id}/${J.nextStepKey(kase, "payment")}`;
  };

  /* ---------- Screen 17: Policy Issuance ---------- */
  SCREENS["issuance"] = function (kase) {
    const iss = kase.issuance;
    const lives = kase.censusValidation.accepted;
    const cur = U.currencyOf(kase);

    if (!iss && !kase.pendingIssuance) {
      kase.pendingIssuance = {
        policyNumber: `PA/EB/2026/${String(1000 + DB.CASES.indexOf(kase)).slice(-4)}`,
        startDate: kase.policyReq.effectiveDate, endDate: DB.calc.addDays(kase.policyReq.effectiveDate, 365),
        products: U.productsOf(kase), premium: kase.payment.total, livesCovered: lives
      };
    }
    const data = iss || kase.pendingIssuance;

    return `
    <div class="screen-head">
      <div class="screen-num">Screen 17</div>
      <div class="screen-title">Policy Issuance</div>
      <div class="screen-purpose">Issue the final policy documentation and close the sales journey.</div>
    </div>
    <div class="info-grid" style="margin-bottom:20px;">
      <div class="info-item"><div class="lbl">Policy Number</div><div class="val">${U.esc(data.policyNumber)}</div></div>
      <div class="info-item"><div class="lbl">Policy Start</div><div class="val">${U.fmtDate(data.startDate)}</div></div>
      <div class="info-item"><div class="lbl">Policy End</div><div class="val">${U.fmtDate(data.endDate)}</div></div>
      <div class="info-item"><div class="lbl">Products</div><div class="val">${U.esc(data.products.join(" + "))}</div></div>
      <div class="info-item"><div class="lbl">Premium</div><div class="val">${U.fmtMoney(data.premium, cur)}</div></div>
      <div class="info-item"><div class="lbl">Lives Covered</div><div class="val">${data.livesCovered}</div></div>
    </div>
    <div class="skip-note" style="margin-bottom:16px;">Policy Number and Employee Certificate generation reconcile exactly to the accepted census count (${lives}) at the point of issuance.</div>
    <div class="card" style="margin-bottom:16px;"><div class="card-head"><div class="card-title">Documents</div></div>
      <div class="card-body"><div class="doc-list">
        <div class="doc-row"><div class="doc-ico">PDF</div><div><div class="doc-name">Policy Schedule</div></div><button class="btn btn-sm" style="margin-left:auto;" data-action="issuance-download" data-doc="Policy Schedule">Download</button></div>
        <div class="doc-row"><div class="doc-ico">PDF</div><div><div class="doc-name">Tax Invoice</div></div><button class="btn btn-sm" style="margin-left:auto;" data-action="issuance-download" data-doc="Tax Invoice">Download</button></div>
        <div class="doc-row"><div class="doc-ico">PDF</div><div><div class="doc-name">Employee Certificates (${lives})</div></div><button class="btn btn-sm" style="margin-left:auto;" data-action="issuance-download" data-doc="Employee Certificates">Download</button></div>
        <div class="doc-row"><div class="doc-ico">KIT</div><div><div class="doc-name">Welcome Kit <span class="opt">optional</span></div></div><button class="btn btn-sm" style="margin-left:auto;" data-action="issuance-download" data-doc="Welcome Kit">Download</button></div>
      </div></div></div>
    <div class="screen-foot">
      <span class="page-meta">${iss && iss.finished ? "Closed Won — case is read-only" : "Send documents, then Finish to close the opportunity"}</span>
      <div class="right">
        ${!(iss && iss.finished) ? `<button type="button" class="btn btn-sm" data-action="issuance-send" data-case="${kase.id}">Send Email</button>
        <button type="button" class="btn btn-amber" data-action="issuance-finish" data-case="${kase.id}">Finish</button>` : `<span class="pill pill-green">Closed Won</span>`}
      </div>
    </div>`;
  };

  ACTIONS["issuance-download"] = function (d) { U.downloadStub(`${d.doc}.pdf`, d.doc); };

  ACTIONS["issuance-send"] = function (d) {
    const kase = U.kase(d.case);
    const recipients = "HR Contact" + (kase.brokerId ? `, ${U.esc(U.broker(kase.brokerId).name)},` : ",") + " and Finance";
    DB.pushNotif(kase, "Policy issued", "ok", `Policy documents sent for <strong>${U.esc(kase.lead.companyName)}</strong>.`, `#/case/${kase.id}/issuance`);
    U.toast(`Policy documents emailed to ${recipients}.`);
  };

  ACTIONS["issuance-finish"] = function (d) {
    const kase = U.kase(d.case);
    kase.issuance = Object.assign({}, kase.pendingIssuance, { issuedAt: DB.TODAY, documents: ["Policy Schedule", "Tax Invoice", "Employee Certificates (bulk)"], welcomeKitSent: false, finished: true });
    kase.stage = "Policy Issued";
    if (kase.opportunity) kase.opportunity.crmStage = "Closed Won";
    DB.pushNotif(kase, "Policy issued", "ok", `Policy <strong>${U.esc(kase.issuance.policyNumber)}</strong> issued — ${U.esc(kase.lead.companyName)}. Case closed.`, `#/case/${kase.id}/issuance`);
    U.toast(`Policy issued and case closed as <strong>Closed Won</strong>.`);
    App.render();
  };
})();
