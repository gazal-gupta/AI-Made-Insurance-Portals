/* ============================================================
   Journey engine — screen sequence, conditional skips, gating
   Encodes FRD Section 2 (End-to-End Journey) + Section 9 (Status Flow)
   ============================================================ */
(function () {
  const STEP_DEFS = [
    { key: "opportunity", num: 3, label: "Opportunity" },
    { key: "employer", num: 4, label: "Employer Profile" },
    { key: "policy-requirements", num: 5, label: "Policy Requirements" },
    { key: "census-upload", num: 6, label: "Employee Census Upload" },
    { key: "census-validation", num: 7, label: "Census Validation" },
    { key: "benefit-gmc", num: 8, label: "Benefit Configuration (GMC)", conditional: k => UI.productsOf(k).includes("GMC") },
    { key: "benefit-gtl", num: 9, label: "Benefit Configuration (GTL)", conditional: k => UI.productsOf(k).includes("GTL") },
    { key: "previous-insurance", num: 10, label: "Previous Insurance Experience",
      conditional: k => k.policyReq && (k.policyReq.policyType === "Portability" || k.policyReq.policyType === "Migration") },
    { key: "underwriting", num: 11, label: "Underwriting Workbench" },
    { key: "premium-quote", num: 12, label: "Premium Calc & Quote Comparison" },
    { key: "proposal", num: 13, label: "Proposal Review" },
    { key: "negotiation", num: 14, label: "Negotiation", optional: true },
    { key: "approval", num: 15, label: "Approval Workflow" },
    { key: "payment", num: 16, label: "Premium Payment" },
    { key: "issuance", num: 17, label: "Policy Issuance" }
  ];

  function activeSteps(kase) { return STEP_DEFS.filter(s => !s.conditional || s.conditional(kase)); }
  function allSteps() { return STEP_DEFS; }
  function isApplicable(kase, key) {
    const s = STEP_DEFS.find(x => x.key === key);
    return !s.conditional || s.conditional(kase);
  }

  function isDone(kase, key) {
    switch (key) {
      case "opportunity": return !!kase.opportunity;
      case "employer": return !!kase.employer;
      case "policy-requirements": return !!kase.policyReq;
      case "census-upload": return !!kase.census;
      case "census-validation": {
        if (!kase.censusValidation) return false;
        const rec = DB.calc.reconciliation(kase);
        return rec.withinTolerance || (kase.census && kase.census.hrConfirmedVariance);
      }
      case "benefit-gmc": return !!kase.benefitGMC;
      case "benefit-gtl": return !!kase.benefitGTL;
      case "previous-insurance": return !!kase.prevInsurance;
      case "underwriting": return !!kase.underwriting && kase.underwriting.decision === "Approve";
      case "premium-quote": return !!(kase.quotes && kase.quotes.length && kase.selectedQuoteId);
      case "proposal": return !!kase.proposal;
      case "negotiation": return !!kase.negotiation && kase.negotiation.resubmitted;
      case "approval": return !!kase.approval && kase.approval.steps.every(s => s.status === "Approved");
      case "payment": return !!kase.payment && kase.payment.status === "Received";
      case "issuance": return !!kase.issuance && kase.issuance.finished;
      default: return false;
    }
  }

  function isLocked(kase, key) {
    const steps = activeSteps(kase);
    const idx = steps.findIndex(s => s.key === key);
    if (idx <= 0) return false;
    for (let i = 0; i < idx; i++) {
      const s = steps[i];
      if (s.optional) continue;
      if (!isDone(kase, s.key)) return true;
    }
    return false;
  }

  function currentStepKey(kase) {
    const steps = activeSteps(kase);
    for (const s of steps) { if (!s.optional && !isDone(kase, s.key)) return s.key; }
    return steps[steps.length - 1].key;
  }

  function nextStepKey(kase, fromKey) {
    const steps = activeSteps(kase);
    const idx = steps.findIndex(s => s.key === fromKey);
    if (idx === -1) return fromKey;
    for (let i = idx + 1; i < steps.length; i++) {
      if (!steps[i].optional) return steps[i].key;
    }
    return steps[steps.length - 1].key;
  }

  function stepMeta(key) { return STEP_DEFS.find(s => s.key === key); }

  /* ---------- derived task list (Screen 1 "Pending Tasks") ---------- */
  function deriveTasks() {
    const out = [];
    DB.CASES.forEach(k => {
      if (k.issuance && k.issuance.finished) return;
      const co = k.lead.companyName;
      const add = (task, priority, actionable) => out.push({ caseId: k.id, ownerId: k.salesExecutiveId, company: co, task, priority, actionable, go: `#/case/${k.id}` });
      if (!k.opportunity) { add("Convert lead to Opportunity", "Medium", true); return; }
      if (!k.employer) { add("Complete Employer Profile", "High", true); return; }
      if (!k.policyReq) { add("Capture Policy Requirements", "High", true); return; }
      if (!k.census) { add("Upload Employee Census", "High", true); return; }
      if (!isDone(k, "census-validation")) { add("Resolve census validation / reconciliation errors", "High", true); return; }
      if (isApplicable(k, "benefit-gmc") && !k.benefitGMC) { add("Configure Benefit (GMC)", "Medium", true); return; }
      if (isApplicable(k, "benefit-gtl") && !k.benefitGTL) { add("Configure Benefit (GTL)", "Medium", true); return; }
      if (isApplicable(k, "previous-insurance") && !k.prevInsurance) { add("Capture Previous Insurance Experience", "Medium", true); return; }
      if (!k.underwriting || k.underwriting.decision === "Pending") { add("Awaiting Underwriting decision", "Low", false); return; }
      if (k.underwriting.decision === "Request Information") { add("Respond to Underwriter query", "High", true); return; }
      if (k.underwriting.decision !== "Approve") return;
      if (!k.quotes || !k.quotes.length || !k.selectedQuoteId) { add("Generate & select quote option", "Medium", true); return; }
      if (!k.proposal) { add("Generate Proposal", "Medium", true); return; }
      if (k.negotiation && !k.negotiation.resubmitted) { add("Resubmit quote after negotiation", "High", true); return; }
      if (!k.approval) { add("Route proposal to Approval Workflow", "Medium", true); return; }
      const pendingStep = k.approval.steps.find(s => s.status === "Pending");
      if (pendingStep) { add(`Awaiting ${pendingStep.role} approval`, "Low", false); return; }
      if (!k.payment || k.payment.status !== "Received") { add("Follow up on premium payment", "High", true); return; }
      if (!k.issuance) { add("Complete Policy Issuance", "Medium", true); return; }
    });
    const order = { High: 0, Medium: 1, Low: 2 };
    return out.sort((a, b) => order[a.priority] - order[b.priority]);
  }

  window.JOURNEY = { STEP_DEFS, activeSteps, allSteps, isApplicable, isDone, isLocked, currentStepKey, nextStepKey, stepMeta, deriveTasks };
})();
