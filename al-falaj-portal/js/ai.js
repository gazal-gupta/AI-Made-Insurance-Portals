/* ============================================================
   Tier 1 AI features — client-side heuristics and template-based
   drafting only; nothing here calls an external model or backend.
   Every output is either a deterministic calculation over data
   already on the case, or text explicitly labeled "AI-drafted" that
   a human reviews before it is saved or sent anywhere.
   ============================================================ */
(function () {
  const U = UI;

  /* ---------- fuzzy string similarity (Levenshtein-based) ---------- */
  function levenshtein(a, b) {
    const m = a.length, n = b.length;
    if (!m) return n;
    if (!n) return m;
    let prev = Array.from({ length: n + 1 }, (_, j) => j);
    for (let i = 1; i <= m; i++) {
      const cur = [i];
      for (let j = 1; j <= n; j++) {
        cur[j] = a[i - 1] === b[j - 1] ? prev[j - 1] : 1 + Math.min(prev[j - 1], prev[j], cur[j - 1]);
      }
      prev = cur;
    }
    return prev[n];
  }

  function normalizeName(s) {
    return String(s || "").toLowerCase()
      .replace(/\b(llc|w\.?l\.?l|s\.?a\.?o\.?c|s\.?p\.?c|pvt|ltd|limited|group|holding|holdings|trading|co)\b/g, "")
      .replace(/[^a-z0-9]/g, "")
      .trim();
  }

  function similarity(a, b) {
    const na = normalizeName(a), nb = normalizeName(b);
    if (!na || !nb) return 0;
    if (na === nb) return 1;
    const dist = levenshtein(na, nb);
    return 1 - dist / Math.max(na.length, nb.length);
  }

  /* ---------- fuzzy duplicate-lead detection (Screen 2) ----------
     The hard rule (exact company + mobile match) still applies elsewhere;
     this is a soft layer that catches near-matches like "Al Bahja Power LLC"
     vs. "Al Bahja Power & Energy L.L.C." that an exact match would miss. */
  function findFuzzyDuplicate(companyName, excludeId) {
    let best = null;
    DB.CASES.forEach(c => {
      if (c.id === excludeId) return;
      const score = similarity(companyName, c.lead.companyName);
      if (score >= 0.72 && (!best || score > best.score)) best = { kase: c, score };
    });
    return best;
  }

  /* ---------- census anomaly detection (Screen 7) ----------
     Non-blocking, informational only — distinct from validateCensus's hard
     accept/reject rules. Flags things worth a human glance: two accepted rows
     that look like the same person under different Employee IDs, and salary
     values that are statistical outliers versus the rest of the group. */
  function censusAnomalies(rows) {
    const accepted = (rows || []).filter(r => r.status === "Accepted");
    const findings = [];

    for (let i = 0; i < accepted.length; i++) {
      for (let j = i + 1; j < accepted.length; j++) {
        const a = accepted[i], b = accepted[j];
        if (a.empId === b.empId || a.dob !== b.dob) continue;
        const score = similarity(a.name, b.name);
        if (score >= 0.85) {
          findings.push({
            type: "duplicate",
            detail: `"${a.name}" (${a.empId}) and "${b.name}" (${b.empId}) share the same DOB and a ${Math.round(score * 100)}% name match — possible duplicate entry under two Employee IDs.`
          });
        }
      }
    }

    const salaries = accepted.filter(r => r.salary).map(r => r.salary).sort((x, y) => x - y);
    if (salaries.length >= 5) {
      const q1 = salaries[Math.floor(salaries.length * 0.25)];
      const q3 = salaries[Math.floor(salaries.length * 0.75)];
      const iqr = q3 - q1;
      const lo = q1 - 1.5 * iqr, hi = q3 + 1.5 * iqr;
      accepted.filter(r => r.salary && (r.salary < lo || r.salary > hi)).forEach(r => {
        findings.push({
          type: "salary-outlier",
          detail: `${r.name} (${r.empId}) — salary ${Math.round(r.salary).toLocaleString()} is a statistical outlier versus the rest of the group (expected range ${Math.round(Math.max(lo, 0)).toLocaleString()}–${Math.round(hi).toLocaleString()}).`
        });
      });
    }
    return findings.slice(0, 25);
  }

  /* ---------- AI-drafted underwriting narrative (Screen 11) ---------- */
  function draftUnderwritingNarrative(kase) {
    const uw = DB.calc.ensureUnderwriting(kase);
    const tl = DB.calc.trafficLight(kase);
    const lr = DB.calc.lossRatio(kase.prevInsurance);
    const ageDist = DB.calc.ageDistribution(kase);
    const industryLabel = (DB.industry(kase.lead.industry) || {}).label || kase.lead.industry;
    const totalLives = Object.values(ageDist).reduce((a, b) => a + b, 0);
    const olderBand = (ageDist["51-60"] || 0) + (ageDist["61+"] || 0);
    const olderPct = totalLives ? Math.round((olderBand / totalLives) * 100) : 0;

    const sentences = [];
    sentences.push(`${kase.lead.companyName} (${industryLabel}) carries a composite risk score of ${uw.riskScore}/100, rated ${uw.industryRiskClass} industry risk.`);
    if (lr != null) {
      sentences.push(lr > 65
        ? `Prior claims experience shows a loss ratio of ${lr}%, exceeding the 65% referral threshold.`
        : `Prior claims experience shows a loss ratio of ${lr}%, within the acceptable threshold.`);
    } else {
      sentences.push("No prior claims experience was provided for this case (fresh policy, or not applicable).");
    }
    if (uw.fclBreachIds.length) {
      sentences.push(`${uw.fclBreachIds.length} member(s) exceed the Free Cover Limit and require individual medical underwriting before group approval.`);
    }
    if (totalLives && olderPct >= 25) {
      sentences.push(`The age profile skews older — ${olderPct}% of accepted lives are aged 51+, which typically increases expected claims frequency.`);
    }
    sentences.push(`Overall traffic-light assessment: ${tl || "not yet determined"}.`);
    return sentences.join(" ");
  }

  /* ---------- AI-drafted proposal cover note (Screen 13) ---------- */
  function draftProposalCoverNote(kase) {
    const p = kase.proposal;
    const cur = U.currencyOf(kase);
    const products = U.productsOf(kase).map(x => x === "GMC" ? "Group Medical Cover" : "Group Term Life").join(" and ");
    const lives = kase.censusValidation ? kase.censusValidation.accepted : (kase.employer ? kase.employer.employeeCount : "");
    const hrName = kase.employer && kase.employer.hrContact ? kase.employer.hrContact.split("/")[0].trim() : "HR Team";
    const effDate = U.fmtDate(kase.policyReq ? kase.policyReq.effectiveDate : DB.TODAY);

    let note = `Dear ${hrName},\n\n` +
      `Please find enclosed our proposal for ${products} covering ${lives} employee(s) of ${kase.lead.companyName}, ` +
      `at a net premium of ${U.fmtMoney(p.netPremium, cur)}`;
    if (p.discountPct > 0) note += ` (inclusive of a ${p.discountPct}% negotiated discount)`;
    note += `. Cover is proposed to incept on ${effDate}.\n\n` +
      `We would be glad to walk your team through the benefit structure at your convenience.`;
    return note;
  }

  /* ---------- lead win-probability score (Screen 3) ----------
     A separate, AI-suggested signal alongside the rep's own manually-entered Probability
     field — never overwrites it. Weighted from factors that correlate with faster/likelier
     closes in this book: industry risk, lead source, broker involvement, deal size band,
     and multi-product intent. Deterministic and explainable, not a black box. */
  function leadWinProbability(kase) {
    let score = 50;
    const risk = (DB.industry(kase.lead.industry) || {}).risk;
    score += risk === "Low" ? 10 : risk === "High" ? -12 : 0;
    const sweetSpotSizes = ["51–200", "201–1000"];
    if (sweetSpotSizes.includes(kase.lead.corporateSize)) score += 8;
    const sourceBoost = { Broker: 12, Referral: 9, Renewal: 15, Event: 4, Digital: 0, "Cold Call": -10 };
    score += sourceBoost[kase.lead.leadSource] || 0;
    if (kase.brokerId) score += 5;
    const products = (kase.opportunity ? kase.opportunity.products : kase.lead.products) || [];
    if (products.length > 1) score += 6;
    if (kase.lead.duplicateFlag) score -= 8;
    return Math.max(5, Math.min(95, Math.round(score)));
  }

  /* ---------- smart prioritization score (0-100, higher = more urgent) ----------
     Combines deal size, staleness, proximity to expected close, and underwriting
     risk into a single ranking signal — layered on top of, not replacing, the
     existing High/Medium/Low task priority. */
  function priorityScore(kase) {
    if (!kase) return 0;
    let score = 0;
    const premium = kase.proposal ? kase.proposal.netPremium : (kase.opportunity ? kase.opportunity.expectedPremium : 0);
    if (premium) score += Math.min(30, Math.log10(premium + 1) * 6);
    if (kase.createdDate) {
      const ageDays = Math.max(0, Math.round((new Date(DB.TODAY) - new Date(kase.createdDate)) / 86400000));
      score += Math.min(25, ageDays / 3);
    }
    if (kase.opportunity && kase.opportunity.expectedCloseDate) {
      const daysToClose = Math.round((new Date(kase.opportunity.expectedCloseDate) - new Date(DB.TODAY)) / 86400000);
      if (daysToClose <= 14) score += 25;
      else if (daysToClose <= 30) score += 12;
    }
    if (kase.underwriting) {
      const tl = DB.calc.trafficLight(kase);
      if (tl === "Red") score += 15; else if (tl === "Amber") score += 8;
    }
    if (kase.brokerId) score += 5;
    return Math.round(Math.min(100, score));
  }

  /* ---------- keyword-assisted case query (prototype for the Copilot's natural-language
     search) ---------- This is a deterministic keyword/regex parser, not true natural
     language understanding — it recognizes a fixed vocabulary (industry names, "renewal",
     "next month", "loss ratio under/over N%", traffic-light colors) and falls back to a
     fuzzy company-name search. A production build would swap this for an LLM-backed parser;
     labeled honestly wherever it's surfaced in the UI. */
  const INDUSTRY_SYNONYMS = {
    ENERGY: ["energy", "oil", "gas"], LOGISTICS: ["logistics", "ports", "free zone", "shipping"],
    CONSTR: ["construction", "infrastructure"], MFG: ["manufacturing", "industrial"],
    BFSI: ["bank", "financial", "bfsi"], TOURISM: ["tourism", "hospitality", "hotel"],
    RETAIL: ["retail", "trading"], FOOD: ["food", "agri"], TELECOM: ["telecom", "tech"],
    HEALTHCARE: ["healthcare", "pharma", "health"], GOVT: ["government", "govt", "semi-government"]
  };
  function queryCases(text) {
    const q = String(text || "").toLowerCase().trim();
    if (!q) return { matches: [], applied: [] };
    let matches = DB.CASES.filter(c => !(c.issuance && c.issuance.finished));
    const applied = [];

    for (const code in INDUSTRY_SYNONYMS) {
      if (INDUSTRY_SYNONYMS[code].some(kw => q.includes(kw))) {
        matches = matches.filter(c => c.lead.industry === code);
        applied.push(`industry = ${(DB.industry(code) || {}).label || code}`);
        break;
      }
    }

    if (/\brenew(al|ing|s)?\b/.test(q)) {
      const renewCompanies = new Set(DB.RENEWALS.map(r => r.company));
      matches = matches.filter(c => renewCompanies.has(c.lead.companyName));
      applied.push("upcoming renewal");
      if (/next month/.test(q)) {
        matches = matches.filter(c => {
          const r = DB.RENEWALS.find(x => x.company === c.lead.companyName);
          const days = r ? U.daysUntil(r.expiry) : null;
          return days != null && days > 30 && days <= 60;
        });
        applied.push("due in 31-60 days");
      } else if (/this month|30 days/.test(q)) {
        matches = matches.filter(c => {
          const r = DB.RENEWALS.find(x => x.company === c.lead.companyName);
          const days = r ? U.daysUntil(r.expiry) : null;
          return days != null && days <= 30;
        });
        applied.push("due within 30 days");
      }
    }

    const lrMatch = q.match(/loss ratio\D*(under|below|less than|over|above|greater than)\D*(\d+)/);
    if (lrMatch) {
      const dir = lrMatch[1], threshold = Number(lrMatch[2]);
      const isUnder = dir === "under" || dir === "below" || dir === "less than";
      matches = matches.filter(c => {
        const lr = DB.calc.lossRatio(c.prevInsurance);
        return lr != null && (isUnder ? lr < threshold : lr > threshold);
      });
      applied.push(`loss ratio ${isUnder ? "under" : "over"} ${threshold}%`);
    }

    ["red", "amber", "green"].forEach(tl => {
      if (new RegExp(`\\b${tl}\\b`).test(q)) {
        const label = tl[0].toUpperCase() + tl.slice(1);
        matches = matches.filter(c => c.underwriting && DB.calc.trafficLight(c) === label);
        applied.push(`traffic light = ${label}`);
      }
    });

    if (!applied.length) {
      matches = matches.filter(c => c.lead.companyName.toLowerCase().includes(q) || similarity(q, c.lead.companyName) > 0.4);
      applied.push("company name match");
    }

    return { matches: matches.slice(0, 10), applied };
  }

  /* ---------- role-aware Copilot ----------
     Recombines data already computed elsewhere (tasks, traffic light,
     reconciliation, commission) into a short, role-specific briefing —
     not a free-form chatbot, no external calls. */
  function copilotInsights(user) {
    const role = user.role;
    const items = [];
    const openCases = DB.CASES.filter(c => !(c.issuance && c.issuance.finished));

    if (role === "Broker") {
      const mine = openCases.filter(c => c.brokerId === user.brokerId);
      const broker = DB.BROKERS.find(b => b.id === user.brokerId);
      const byCur = {};
      DB.CASES.filter(c => c.brokerId === user.brokerId && c.proposal).forEach(c => {
        const cur = U.currencyOf(c);
        byCur[cur] = (byCur[cur] || 0) + DB.calc.brokerageFor(c, c.proposal.netPremium);
      });
      items.push({ text: `${mine.length} open case(s) placed through ${broker ? broker.name : "you"}.`, go: "#/broker-book" });
      items.push({
        text: Object.keys(byCur).length
          ? Object.entries(byCur).map(([cur, v]) => U.fmtMoney(v, cur)).join(" + ") + " in commission across priced proposals."
          : "No commission-bearing proposals yet.",
        go: "#/broker-book"
      });
      const top = mine.slice().sort((a, b) => priorityScore(b) - priorityScore(a))[0];
      if (top) items.push({ text: `Highest-priority case: ${top.lead.companyName} (${top.stage}).`, go: `#/case/${top.id}` });

    } else if (role === "Underwriter" || role === "Senior Underwriter") {
      const queue = openCases.filter(c => c.underwriting && c.underwriting.decision === "Pending");
      const withTl = queue.map(c => ({ c, tl: DB.calc.trafficLight(c) }));
      const reds = withTl.filter(x => x.tl === "Red").length;
      const ambers = withTl.filter(x => x.tl === "Amber").length;
      items.push({ text: `${queue.length} case(s) in the Underwriting queue — ${reds} Red, ${ambers} Amber.`, go: "#/underwriting-queue" });
      const worst = withTl.find(x => x.tl === "Red") || withTl.find(x => x.tl === "Amber");
      if (worst) items.push({ text: `Most urgent: ${worst.c.lead.companyName} (${worst.tl}) — ${DB.calc.ensureUnderwriting(worst.c).fclBreachIds.length} FCL breach(es).`, go: `#/case/${worst.c.id}/underwriting` });
      const highLr = queue.filter(c => { const lr = DB.calc.lossRatio(c.prevInsurance); return lr != null && lr > 65; });
      if (highLr.length) items.push({ text: `${highLr.length} case(s) exceed the 65% loss-ratio referral threshold.`, go: "#/underwriting-queue" });

    } else if (role === "Finance" || role === "Finance Head") {
      const unreconciled = openCases.filter(c => c.census && c.censusValidation && !DB.calc.reconciliation(c).withinTolerance && !c.census.hrConfirmedVariance);
      items.push({ text: `${unreconciled.length} case(s) blocked on census reconciliation, awaiting HR confirmation.`, go: "#/pipeline" });
      const pendingPayment = openCases.filter(c => c.approval && c.approval.steps.every(s => s.status === "Approved") && (!c.payment || c.payment.status !== "Received"));
      items.push({ text: `${pendingPayment.length} case(s) approved and awaiting premium payment.`, go: "#/pipeline" });

    } else if (role === "Business Head" || role === "Operations" || role === "Policy Admin") {
      const pendingApprovals = openCases.filter(c => c.approval && c.approval.steps.some(s => s.status === "Pending"));
      items.push({ text: `${pendingApprovals.length} case(s) awaiting an approval step.`, go: "#/approvals" });
      const value = openCases.filter(c => U.currencyOf(c) === "OMR").reduce((s, c) => s + (c.proposal ? c.proposal.netPremium : (c.opportunity ? c.opportunity.expectedPremium : 0)), 0);
      items.push({ text: `Open OMR pipeline value: ${U.fmtMoney(value, "OMR")} across ${openCases.length} case(s).`, go: "#/pipeline" });

    } else {
      const tasks = JOURNEY.deriveTasks().filter(t => t.ownerId === user.id && t.actionable)
        .sort((a, b) => priorityScore(U.kase(b.caseId)) - priorityScore(U.kase(a.caseId)));
      items.push({ text: `${tasks.length} actionable task(s) in your book, ranked by urgency.`, go: "#/dashboard" });
      tasks.slice(0, 3).forEach(t => items.push({ text: `${t.task} — ${t.company}`, go: t.go }));
      const dupFlags = openCases.filter(c => c.salesExecutiveId === user.id && c.lead.duplicateFlag);
      if (dupFlags.length) items.push({ text: `${dupFlags.length} lead(s) flagged as possible duplicates.`, go: "#/pipeline" });
    }

    if (!items.length) items.push({ text: "Nothing needs your attention right now.", go: "#/dashboard" });
    return items;
  }

  window.AI = {
    similarity, findFuzzyDuplicate, censusAnomalies,
    draftUnderwritingNarrative, draftProposalCoverNote,
    leadWinProbability, priorityScore, copilotInsights, queryCases
  };
})();
