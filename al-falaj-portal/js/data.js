/* ============================================================
   Al Falaj Assurance — Employee Benefits Sales Portal (Oman)
   Mock data layer + business-rule calculators.
   In-memory sample book — refresh the page to reset.
   ============================================================ */
(function () {

  /* ---------- reference lists ---------- */
  const ROLES = ["Sales Executive", "Relationship Manager", "Broker", "Corporate HR", "Underwriter",
    "Senior Underwriter", "Finance", "Operations", "Business Head", "Policy Administration Team"];

  const PERSONAS = [
    { id: "U-SE-01", name: "Salim Al Balushi", role: "Sales Executive", initials: "SB" },
    { id: "U-SM-01", name: "Nasser Al Rashdi", role: "Sales Manager", initials: "NR" },
    { id: "U-UW-01", name: "Mariam Al Hinai", role: "Underwriter", initials: "MH" },
    { id: "U-SUW-01", name: "Khalid Al Farsi", role: "Senior Underwriter", initials: "KF" },
    { id: "U-FIN-01", name: "Layla Al Zadjali", role: "Finance", initials: "LZ" },
    { id: "U-BH-01", name: "Hamed Al Kindi", role: "Business Head", initials: "HK" },
    { id: "BU-01", name: "Yousuf Al Balushi", role: "Broker", initials: "YB", brokerId: "BRK-01" },
    { id: "BU-02", name: "Rashid Al Amri", role: "Broker", initials: "RA", brokerId: "BRK-02" },
    { id: "BU-03", name: "Suad Al Riyami", role: "Broker", initials: "SR", brokerId: "BRK-03" }
  ];
  const CURRENT_USER = Object.assign({}, PERSONAS[0]);

  const SALES_EXECS = [
    { id: "U-SE-01", name: "Salim Al Balushi", role: "Sales Executive", manager: "U-SM-01" },
    { id: "U-SE-02", name: "Fatima Al Saidi", role: "Sales Executive", manager: "U-SM-01" },
    { id: "U-SM-01", name: "Nasser Al Rashdi", role: "Sales Manager" }
  ];
  const UNDERWRITERS = [
    { id: "U-UW-01", name: "Mariam Al Hinai", role: "Underwriter" },
    { id: "U-SUW-01", name: "Khalid Al Farsi", role: "Senior Underwriter" }
  ];
  const FINANCE = [{ id: "U-FIN-01", name: "Layla Al Zadjali", role: "Finance" }];
  const BUSINESS_HEAD = { id: "U-BH-01", name: "Hamed Al Kindi", role: "Business Head" };
  const FINANCE_HEAD = { id: "U-FH-01", name: "Noora Al Harthy", role: "Finance Head" };
  const OPERATIONS = { id: "U-OPS-01", name: "Yousuf Al Maskari", role: "Operations" };
  const POLICY_ADMIN = { id: "U-PA-01", name: "Amal Al Lawati", role: "Policy Administration Team" };

  const BROKERS = [
    { id: "BRK-01", name: "RMS Insurance Brokers LLC", contact: "Yousuf Al Balushi", email: "yousuf.albalushi@rmsme.com",
      commissionRate: 0.03,
      note: "Established 1979 — first licensed insurance broker in the Sultanate of Oman; largest Employee Benefits broker in Oman, also operating in the UAE and Qatar." },
    { id: "BRK-02", name: "Gulf Shield Insurance Brokers LLC", contact: "Rashid Al Amri", email: "rashid.alamri@gulfshieldbrokers.om", commissionRate: 0.025 },
    { id: "BRK-03", name: "Al Nahda Brokerage Services LLC", contact: "Suad Al Riyami", email: "suad.alriyami@alnahdabrokers.om", commissionRate: 0.0275 }
  ];

  const INDUSTRIES = [
    { code: "ENERGY", label: "Oil, Gas & Energy", risk: "High" },
    { code: "LOGISTICS", label: "Logistics, Ports & Free Zones", risk: "Medium" },
    { code: "CONSTR", label: "Construction & Infrastructure", risk: "High" },
    { code: "MFG", label: "Manufacturing & Industrial", risk: "Medium" },
    { code: "BFSI", label: "Banking & Financial Services", risk: "Low" },
    { code: "TOURISM", label: "Tourism & Hospitality", risk: "Medium" },
    { code: "RETAIL", label: "Retail & Trading", risk: "Low" },
    { code: "FOOD", label: "Food Processing & Agribusiness", risk: "Medium" },
    { code: "TELECOM", label: "Telecommunications", risk: "Low" },
    { code: "HEALTHCARE", label: "Healthcare & Pharma", risk: "Medium" },
    { code: "GOVT", label: "Government & Semi-Government Enterprises", risk: "Low" }
  ];
  const industry = code => INDUSTRIES.find(i => i.code === code) || INDUSTRIES[0];

  const CORPORATE_SIZE_BANDS = ["1–50", "51–200", "201–1000", "1000+"];
  function sizeBand(count) {
    if (count <= 50) return "1–50";
    if (count <= 200) return "51–200";
    if (count <= 1000) return "201–1000";
    return "1000+";
  }
  /* Free Cover Limit by group-size band, in OMR */
  const FCL_TABLE = { "1–50": 15000, "51–200": 30000, "201–1000": 60000, "1000+": 90000 };

  /* ---------- Approval Matrix (Section 6, verbatim) ---------- */
  const APPROVAL_MATRIX = [
    { condition: "Discount up to 5%", approvers: "Sales Manager", notes: "Sales Executive submits; Sales Manager approves within workflow.", sla: "1 business day" },
    { condition: "Discount 5% to 10%", approvers: "Sales Manager + Business Head", notes: "Escalated automatically beyond Sales Manager's delegated authority.", sla: "2 business days" },
    { condition: "Discount above 10%", approvers: "Business Head + Finance Head", notes: "Requires joint sign-off; cannot be approved by Sales Manager alone.", sla: "3 business days" },
    { condition: "Loss Ratio above 65% (renewal/portability)", approvers: "Underwriter + Senior Underwriter", notes: "Auto-referred from Screen 11 traffic-light logic.", sla: "2 business days" },
    { condition: "FCL breach (GTL individual member)", approvers: "Underwriter (Medical UW)", notes: "Individual member requires medical underwriting outcome before group approval.", sla: "As per medical UW SLA" },
    { condition: "Any Red traffic-light case", approvers: "Senior Underwriter", notes: "Sales Executives are not authorised to action Red cases.", sla: "2 business days" },
    { condition: "Standard proposal, no discount, Green UW", approvers: "Sales Manager only", notes: "Fast-track approval; Finance sign-off remains mandatory before payment stage.", sla: "Same business day" }
  ];

  /* ---------- Notification Matrix (Section 7, verbatim) ---------- */
  const NOTIFICATION_MATRIX = [
    { event: "Lead created", recipients: "Contact Person; Sales Manager", channel: "Email", content: "Lead confirmation / new lead alert" },
    { event: "Census uploaded", recipients: "HR Contact; Sales Executive", channel: "Email", content: "Upload confirmation with file summary" },
    { event: "Underwriting decision recorded", recipients: "Sales Executive; (Senior Underwriter if Amber/Red)", channel: "Email + in-app", content: "Decision notification / referral alert" },
    { event: "Proposal sent", recipients: "HR Contact; Broker (if applicable)", channel: "Email", content: "Proposal PDF with read receipt tracking" },
    { event: "Approval step completed", recipients: "Next approver in sequence", channel: "In-app task + email", content: "Sequential approval task notification" },
    { event: "Final approval granted", recipients: "Sales Executive", channel: "Email + in-app", content: "Approval confirmation" },
    { event: "Payment received", recipients: "HR Contact; Finance", channel: "Email", content: "Payment acknowledgement" },
    { event: "Payment reconciliation overdue", recipients: "Finance", channel: "Email + in-app", content: "SLA breach alert (default 2 business days)" },
    { event: "Policy issued", recipients: "HR Contact; Broker; Finance; Operations", channel: "Email", content: "Policy documents and closure notification" },
    { event: "Renewal due within 90 days", recipients: "Sales Executive; Sales Manager", channel: "In-app + email", content: "Renewal pipeline alert" }
  ];

  const KEY_DOCUMENTS = ["Employee Census", "Previous Policy Copy", "Claim Experience Report", "Proposal",
    "Underwriting Questionnaire", "Payment Receipt", "Policy Schedule", "Tax Invoice", "Employee Certificate"];

  const STATUS_FLOW = ["Lead", "Qualified", "Opportunity Created", "Employer Profile Completed", "Census Uploaded",
    "Underwriting", "Quote Generated", "Proposal Shared", "Negotiation", "Approved", "Paid", "Policy Issued"];

  /* ---------- seeded PRNG + census generator ---------- */
  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const MALE = ["Ahmed", "Salim", "Khalid", "Nasser", "Hamed", "Said", "Yousuf", "Waleed", "Rashid", "Talal",
    "Sultan", "Mohammed", "Abdullah", "Faisal", "Majid", "Zayed", "Hilal", "Adil", "Marwan", "Bader"];
  const FEMALE = ["Fatima", "Aisha", "Mariam", "Layla", "Noora", "Salma", "Amal", "Huda", "Reem", "Shaikha",
    "Maha", "Wafa", "Asma", "Zainab", "Munira", "Ghalia", "Rana", "Dina", "Iman", "Suad"];
  const SURNAMES = ["Al Balushi", "Al Habsi", "Al Hinai", "Al Farsi", "Al Rashdi", "Al Zadjali", "Al Kindi",
    "Al Saidi", "Al Harthy", "Al Maskari", "Al Lawati", "Al Busaidi", "Al Ghafri", "Al Mahrooqi", "Al Wahaibi",
    "Al Kalbani", "Al Amri", "Al Riyami", "Al Shukaili", "Al Abri"];

  function isoDob(rand, minAge, maxAge, asOf) {
    // day-offset from asOf, not year+random-month/day, so the resulting computeAge()
    // always lands inside [minAge, maxAge] rather than drifting ±1 across birthdays
    const minDays = Math.round(minAge * 365.25);
    const maxDays = Math.round((maxAge + 1) * 365.25) - 1;
    const days = minDays + Math.floor(rand() * (maxDays - minDays + 1));
    const d = new Date(new Date(asOf).getTime() - days * 86400000);
    return d.toISOString().slice(0, 10);
  }

  function genCensus(seed, count, opts) {
    const rand = mulberry32(seed);
    const rows = [];
    for (let i = 1; i <= count; i++) {
      const female = rand() > 0.62;
      const first = female ? FEMALE[Math.floor(rand() * FEMALE.length)] : MALE[Math.floor(rand() * MALE.length)];
      const last = SURNAMES[Math.floor(rand() * SURNAMES.length)];
      const outOfBand = opts.outOfBandIdx && opts.outOfBandIdx.includes(i);
      const dob = isoDob(rand, outOfBand ? 82 : (opts.minAge || 21), outOfBand ? 85 : (opts.maxAge || 58), opts.asOf);
      const salary = opts.withSalary ? Math.round((3000 + rand() * 24000) / 50) * 50 : null;
      const empId = opts.prefix + String(i).padStart(4, "0");
      const isBlank = opts.blankNameIdx === i;
      rows.push({
        empId: (opts.duplicateIdx && opts.duplicateIdx === i) ? opts.prefix + "0001" : empId,
        name: isBlank ? "" : `${first} ${last}`,
        dob, gender: female ? "Female" : "Male",
        salary,
        coverage: rand() > 0.78 ? "Family Floater" : "Employee Only"
      });
    }
    return rows;
  }

  function computeAge(dob, asOf) {
    const d = new Date(dob), ref = new Date(asOf);
    let age = ref.getFullYear() - d.getFullYear();
    const m = ref.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && ref.getDate() < d.getDate())) age--;
    return age;
  }

  /* ---------- census validation engine (Screen 7) ---------- */
  function validateCensus(rows, asOf, minAge, maxAge, salaryRequired) {
    const seenIds = new Set();
    let accepted = 0, rejected = 0;
    const out = rows.map(r => {
      const age = computeAge(r.dob, asOf);
      let status = "Accepted", reason = "";
      if (!r.name || !String(r.name).trim()) { status = "Rejected"; reason = "Employee Name is blank"; }
      else if (!r.empId || !String(r.empId).trim()) { status = "Rejected"; reason = "Employee ID is blank"; }
      else if (seenIds.has(r.empId)) { status = "Rejected"; reason = "Duplicate Employee ID within file"; }
      else if (Number.isNaN(age)) { status = "Rejected"; reason = "DOB could not be read — check the date format"; }
      else if (age < minAge || age > maxAge) { status = "Rejected"; reason = `Age out of range (${age}, band ${minAge}-${maxAge})`; }
      else if (salaryRequired && !r.salary) { status = "Rejected"; reason = "Salary mandatory for Salary Multiple / Shared contribution"; }
      seenIds.add(r.empId);
      if (status === "Accepted") accepted++; else rejected++;
      return Object.assign({}, r, { age, status, reason });
    });
    return { rows: out, accepted, rejected };
  }

  /* ---------- employee-count reconciliation (Section 5, cross-screen rule) ---------- */
  function reconciliation(kase, tolerancePct) {
    tolerancePct = tolerancePct || 5;
    const declared = kase.employer ? kase.employer.employeeCount : kase.lead.expectedEmployeeCount;
    if (!kase.census) return { declared, uploaded: null, variancePct: null, withinTolerance: true };
    const uploaded = kase.census.rows.length;
    const variancePct = Math.round(Math.abs(declared - uploaded) / declared * 1000) / 10;
    return { declared, uploaded, variancePct, withinTolerance: variancePct <= tolerancePct };
  }

  /* ---------- underwriting calculators (Screen 11) ---------- */
  function lossRatio(prev) {
    if (!prev || !prev.premium) return null;
    return Math.round((prev.claims / prev.premium) * 1000) / 10;
  }

  function fclBreaches(kase) {
    if (!kase.benefitGTL) return [];
    const fcl = FCL_TABLE[sizeBand(kase.employer ? kase.employer.employeeCount : kase.lead.expectedEmployeeCount)];
    const rows = (kase.censusValidation ? kase.censusValidation.rows : []).filter(r => r.status === "Accepted");
    const g = kase.benefitGTL;
    return rows.filter(r => {
      const raw = g.coverType === "Flat Cover" ? g.flatCover : (r.salary || 0) * g.salaryMultiple;
      const cover = Math.min(Math.max(raw, g.minimumCover), g.maximumCover);
      return cover > fcl;
    }).map(r => r.empId);
  }

  function computeRiskScore(kase) {
    let score = 20;
    const lr = lossRatio(kase.prevInsurance);
    if (lr != null && lr > 65) score += 25; else if (lr != null && lr > 50) score += 10;
    const risk = industry(kase.lead.industry).risk;
    score += risk === "High" ? 30 : risk === "Medium" ? 15 : 0;
    score += Math.min(fclBreaches(kase).length, 20);
    return Math.min(99, score);
  }

  function ensureUnderwriting(kase) {
    if (kase.underwriting) return kase.underwriting;
    kase.underwriting = {
      riskScore: computeRiskScore(kase), industryRiskClass: industry(kase.lead.industry).risk,
      fclBreachIds: fclBreaches(kase), medicalFlags: [], decision: "Pending", decisionBy: null,
      decisionDate: null, requestInfoNote: "", loadingPct: 0, comments: ""
    };
    return kase.underwriting;
  }

  function ageDistribution(kase) {
    const rows = (kase.censusValidation ? kase.censusValidation.rows : []).filter(r => r.status === "Accepted");
    const buckets = { "18-30": 0, "31-40": 0, "41-50": 0, "51-60": 0, "61+": 0 };
    rows.forEach(r => {
      if (r.age <= 30) buckets["18-30"]++;
      else if (r.age <= 40) buckets["31-40"]++;
      else if (r.age <= 50) buckets["41-50"]++;
      else if (r.age <= 60) buckets["51-60"]++;
      else buckets["61+"]++;
    });
    return buckets;
  }

  function trafficLight(kase) {
    const uw = kase.underwriting; if (!uw) return null;
    let breaches = 0;
    const lr = lossRatio(kase.prevInsurance);
    if (lr !== null && lr > 65) breaches++;
    if (uw.fclBreachIds.length > 0) breaches++;
    const indRisk = industry(kase.lead.industry).risk;
    if (indRisk === "High") breaches++;
    if (breaches === 0) return "Green";
    if (breaches >= 2) return "Red";
    return "Amber";
  }

  /* ---------- premium calculators (Screen 12) — OMR ---------- */
  const SI_RATE = { 5000: 140, 10000: 230, 20000: 370, 30000: 480 };
  function calcGMCPremium(kase, siOverride, ridersOverride) {
    const b = kase.benefitGMC; if (!b) return 0;
    const lives = kase.censusValidation ? kase.censusValidation.accepted : (kase.employer ? kase.employer.employeeCount : 0);
    const si = siOverride || b.baseSumInsured;
    let perLife = SI_RATE[si] || Math.round(si * 0.024);
    if (b.familyDefinition && b.familyDefinition.includes("Children")) perLife *= 1.6;
    if (b.corporateBuffer) perLife += Math.round(b.corporateBuffer * 0.008);
    if (b.maternity) perLife += 22;
    const riders = ridersOverride || b;
    if (riders.opd) perLife += 32;
    if (riders.dental) perLife += 8;
    if (riders.vision) perLife += 6;
    if (b.copay) perLife *= (1 - b.copay / 200);
    const loading = kase.underwriting && kase.underwriting.loadingPct ? 1 + kase.underwriting.loadingPct / 100 : 1;
    return Math.round(lives * perLife * loading);
  }
  function calcGTLPremium(kase) {
    const g = kase.benefitGTL; if (!g) return 0;
    const rows = kase.censusValidation ? kase.censusValidation.rows.filter(r => r.status === "Accepted") : [];
    let total = 0;
    rows.forEach(r => {
      const cover = g.coverType === "Flat Cover" ? g.flatCover : Math.min(Math.max((r.salary || 0) * g.salaryMultiple, g.minimumCover), g.maximumCover);
      let rate = 1.1; // per 1000 sum assured, annual
      if (r.age > 45) rate = 2.4; else if (r.age > 35) rate = 1.6;
      total += (cover / 1000) * rate;
    });
    if (g.terminalIllness) total *= 1.03;
    if (g.accidentalDeath) total *= 1.05;
    if (g.permanentDisability) total *= 1.04;
    const loading = kase.underwriting && kase.underwriting.loadingPct ? 1 + kase.underwriting.loadingPct / 100 : 1;
    return Math.round(total * loading);
  }
  function basePremium(kase) { return calcGMCPremium(kase) + calcGTLPremium(kase); }

  /* ---------- brokerage / commission (Section 3: "Broker represents the employer
     commercially"; each broker's own negotiated rate, not a flat platform default) ---------- */
  function brokerageFor(kase, premium) {
    if (!kase.brokerId) return 0;
    const b = BROKERS.find(x => x.id === kase.brokerId);
    return Math.round(premium * ((b && b.commissionRate) || 0.025));
  }

  function quoteOptions(kase) {
    if (!kase.benefitGMC && !kase.benefitGTL) return [];
    const base = basePremium(kase);
    const opts = [
      { id: "A", name: "Option A — As Configured", premium: base,
        benefits: [kase.benefitGMC ? `GMC — SI OMR ${kase.benefitGMC.baseSumInsured.toLocaleString()}, ${kase.benefitGMC.familyDefinition}` : null,
                   kase.benefitGTL ? `GTL — ${kase.benefitGTL.coverType}` : null].filter(Boolean) },
      { id: "B", name: "Option B — Enhanced", premium: Math.round(base * 1.22),
        benefits: [kase.benefitGMC ? "GMC — Higher SI slab, OPD rider added" : null, kase.benefitGTL ? "GTL — Accidental Death rider added" : null].filter(Boolean) },
      { id: "C", name: "Option C — Lean", premium: Math.round(base * 0.84),
        benefits: [kase.benefitGMC ? "GMC — Base SI, no optional riders" : null, kase.benefitGTL ? "GTL — Flat Cover, no riders" : null].filter(Boolean) }
    ];
    return opts;
  }

  /* ---------- discount / approval routing (Approval Matrix, Section 6) ---------- */
  function approvalRoute(kase) {
    const discount = kase.proposal ? kase.proposal.discountPct : 0;
    const tl = trafficLight(kase);
    const lr = lossRatio(kase.prevInsurance);
    const steps = [{ role: "Sales Manager", status: "Pending" }];
    steps.push({ role: "Underwriter", status: "Pending" });
    steps.push({ role: "Finance", status: "Pending" });
    const needsBH = discount > 5 || tl === "Red" || (lr !== null && lr > 65);
    if (needsBH) steps.push({ role: "Business Head", status: "Pending", required: true });
    return { steps, needsBH, reason: discount > 10 ? "Discount above 10% — Business Head + Finance Head joint sign-off" :
      discount > 5 ? "Discount 5–10% — escalated to Business Head" :
      tl === "Red" ? "Red traffic-light case — Senior Underwriter authority required" :
      (lr !== null && lr > 65) ? "Loss ratio above 65% — Underwriter + Senior Underwriter referral" :
      "Standard proposal — fast-track, Sales Manager only" };
  }

  /* ---------- notifications log ---------- */
  const NOTIFICATIONS = [];
  let notifSeq = 1;
  function pushNotif(kase, event, kind, txt, go) {
    NOTIFICATIONS.unshift({ id: "N-" + (notifSeq++), ts: kase ? kase.createdDate : new Date().toISOString(), event, kind, txt, go, caseId: kase ? kase.id : null });
  }

  /* ================================================================
     Seed cases — one per major stage of the assisted sales journey
     ================================================================ */
  const CASES = [];
  const TODAY = "2026-07-16";

  function addDays(iso, n) { const d = new Date(iso); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }

  /* 1 — Al Amerat Tech Solutions: fresh Lead only */
  CASES.push({
    id: "EB-2026-0001", createdDate: "2026-07-14", stage: "Lead",
    salesExecutiveId: "U-SE-01", brokerId: null,
    lead: {
      companyName: "Al Amerat Tech Solutions LLC", industry: "TELECOM", corporateSize: "51–200",
      contactPerson: "Aisha Al Habsi", designation: "HR Manager", mobile: "91234567", email: "aisha.alhabsi@alamerattech.om",
      leadSource: "Digital", expectedEmployeeCount: 130, products: ["GMC"], createdDate: "2026-07-14", duplicateFlag: false
    },
    opportunity: null, employer: null, policyReq: null, census: null, censusValidation: null,
    benefitGMC: null, benefitGTL: null, prevInsurance: null, underwriting: null,
    quotes: [], selectedQuoteId: null, proposal: null, negotiation: null, approval: null, payment: null, issuance: null
  });

  /* 2 — Al Bahja Power & Energy: Opportunity + Employer Profile in progress, brokered by RMS */
  CASES.push({
    id: "EB-2026-0010", createdDate: "2026-07-10", stage: "Opportunity Created",
    salesExecutiveId: "U-SE-02", brokerId: "BRK-01",
    lead: {
      companyName: "Al Bahja Power & Energy LLC", industry: "ENERGY", corporateSize: "201–1000",
      contactPerson: "Fatma Al Habsi", designation: "HR & Admin Manager", mobile: "92345678", email: "fatma.alhabsi@albahjapower.om",
      leadSource: "Broker", expectedEmployeeCount: 450, products: ["GMC", "GTL"], createdDate: "2026-07-10", duplicateFlag: false
    },
    opportunity: {
      name: "Al Bahja Power & Energy - GMC/GTL - 2026", salesOwnerId: "U-SE-02", expectedPremium: 155000,
      expectedCloseDate: "2026-09-05", probability: 55, crmStage: "Needs Analysis", products: ["GMC", "GTL"],
      notes: "Introduced by RMS Insurance Brokers (Muscat) — largest EB broker in Oman, est. 1979. Power-plant O&M workforce; wants GTL accidental death rider given site risk profile.",
      attachments: []
    },
    employer: {
      legalName: "Al Bahja Power & Energy LLC", tradeName: "Al Bahja Power", crNumber: "1284563", vatin: "OM1100056324",
      industry: "ENERGY", annualTurnover: 18000000, employeeCount: 450,
      officeLocations: ["Muscat (HO)", "Sohar", "Duqm"], hrContact: "Fatma Al Habsi / fatma.alhabsi@albahjapower.om / +968 9234 5678",
      financeContact: "Salim Al Rawahi / salim.alrawahi@albahjapower.om", payrollFrequency: "Monthly",
      previousInsurer: "", currentBroker: "RMS Insurance Brokers LLC"
    },
    policyReq: null, census: null, censusValidation: null, benefitGMC: null, benefitGTL: null, prevInsurance: null,
    underwriting: null, quotes: [], selectedQuoteId: null, proposal: null, negotiation: null, approval: null, payment: null, issuance: null
  });

  /* 3 — Salalah Gateway Logistics: Opportunity + Employer Profile in progress, brokered by Gulf Shield */
  CASES.push({
    id: "EB-2026-0002", createdDate: "2026-06-30", stage: "Opportunity Created",
    salesExecutiveId: "U-SE-02", brokerId: "BRK-02",
    lead: {
      companyName: "Salalah Gateway Logistics LLC", industry: "LOGISTICS", corporateSize: "201–1000",
      contactPerson: "Waleed Al Kalbani", designation: "VP — People Operations", mobile: "95123390", email: "waleed.alkalbani@salalahgateway.om",
      leadSource: "Broker", expectedEmployeeCount: 420, products: ["GMC", "GTL"], createdDate: "2026-06-30", duplicateFlag: false
    },
    opportunity: {
      name: "Salalah Gateway Logistics - GMC/GTL - 2026", salesOwnerId: "U-SE-02", expectedPremium: 150000,
      expectedCloseDate: "2026-08-20", probability: 60, crmStage: "Needs Analysis", products: ["GMC", "GTL"],
      notes: "Employer keen on family floater cover; wants GTL flat cover for port and warehouse staff.", attachments: []
    },
    employer: {
      legalName: "Salalah Gateway Logistics LLC", tradeName: "Salalah Gateway Logistics", crNumber: "1198432", vatin: "OM1100078812",
      industry: "LOGISTICS", annualTurnover: 9500000, employeeCount: 420,
      officeLocations: ["Salalah (HO)", "Muscat", "Duqm"], hrContact: "Waleed Al Kalbani / waleed.alkalbani@salalahgateway.om / +968 9512 3390",
      financeContact: "Rana Al Ghafri / rana.alghafri@salalahgateway.om", payrollFrequency: "Monthly",
      previousInsurer: "", currentBroker: "Gulf Shield Insurance Brokers LLC"
    },
    policyReq: null, census: null, censusValidation: null, benefitGMC: null, benefitGTL: null, prevInsurance: null,
    underwriting: null, quotes: [], selectedQuoteId: null, proposal: null, negotiation: null, approval: null, payment: null, issuance: null
  });

  /* 4 — Dhofar Al Waha Trading & Textiles: Census uploaded, validation has errors pending fix */
  {
    const asOf = "2026-08-01";
    const rows = genCensus(3301, 245, { asOf, minAge: 18, maxAge: 79, withSalary: false, prefix: "DAW-",
      outOfBandIdx: [7], duplicateIdx: 15, blankNameIdx: 21 });
    CASES.push({
      id: "EB-2026-0003", createdDate: "2026-06-10", stage: "Census Uploaded",
      salesExecutiveId: "U-SE-01", brokerId: null,
      lead: { companyName: "Dhofar Al Waha Trading & Textiles LLC", industry: "MFG", corporateSize: "201–1000",
        contactPerson: "Talal Al Mahrooqi", designation: "CHRO", mobile: "99001122", email: "talal.almahrooqi@dhofarwaha.om",
        leadSource: "Referral", expectedEmployeeCount: 260, products: ["GMC"], createdDate: "2026-06-10", duplicateFlag: false },
      opportunity: { name: "Dhofar Al Waha Trading & Textiles - GMC - 2026", salesOwnerId: "U-SE-01", expectedPremium: 47000,
        expectedCloseDate: "2026-08-10", probability: 55, crmStage: "Quote", products: ["GMC"], notes: "", attachments: [] },
      employer: { legalName: "Dhofar Al Waha Trading & Textiles LLC", tradeName: "Dhofar Al Waha", crNumber: "1345678",
        vatin: "OM1100091234", industry: "MFG", annualTurnover: 4200000, employeeCount: 260,
        officeLocations: ["Salalah"], hrContact: "Talal Al Mahrooqi / talal.almahrooqi@dhofarwaha.om / 99001122",
        financeContact: "", payrollFrequency: "Monthly", previousInsurer: "", currentBroker: "" },
      policyReq: { products: ["GMC"], effectiveDate: "2026-08-01", duration: "12 months", policyType: "Fresh",
        employerContribution: "100% Employer-funded", splitPct: null, coverageBasis: "Family Floater" },
      census: { fileName: "Dhofar_Al_Waha_Census_v2.xlsx", uploadedAt: "2026-07-15", rows, hrConfirmedVariance: false },
      censusValidation: validateCensus(rows, asOf, 18, 79, false),
      benefitGMC: null, benefitGTL: null, prevInsurance: null, underwriting: null,
      quotes: [], selectedQuoteId: null, proposal: null, negotiation: null, approval: null, payment: null, issuance: null
    });
  }

  /* 5 — Sohar Steel Engineering: Underwriting — Amber (loss ratio breach, Portability) */
  {
    const asOf = "2026-09-01";
    const rows = genCensus(4401, 1150, { asOf, minAge: 21, maxAge: 60, withSalary: true, prefix: "SSE-" });
    const kase = {
      id: "EB-2026-0004", createdDate: "2026-05-20", stage: "Underwriting",
      salesExecutiveId: "U-SE-01", brokerId: "BRK-02",
      lead: { companyName: "Sohar Steel Engineering LLC", industry: "MFG", corporateSize: "1000+",
        contactPerson: "Marwan Al Wahaibi", designation: "Head HR", mobile: "98112233", email: "marwan.alwahaibi@soharsteel.om",
        leadSource: "Broker", expectedEmployeeCount: 1150, products: ["GMC", "GTL"], createdDate: "2026-05-20", duplicateFlag: false },
      opportunity: { name: "Sohar Steel Engineering - GMC/GTL - 2026", salesOwnerId: "U-SE-01", expectedPremium: 450000,
        expectedCloseDate: "2026-09-15", probability: 65, crmStage: "Quote", products: ["GMC", "GTL"],
        notes: "Portability from incumbent insurer; prior claims history under review.", attachments: [{ name: "Sohar_Prior_Policy.pdf", size: "1.4 MB" }] },
      employer: { legalName: "Sohar Steel Engineering LLC", tradeName: "Sohar Steel Engineering", crNumber: "1099887",
        vatin: "OM1100034521", industry: "MFG", annualTurnover: 65000000, employeeCount: 1150,
        officeLocations: ["Sohar (HO)", "Sohar Port Free Zone", "Ibri"], hrContact: "Marwan Al Wahaibi / marwan.alwahaibi@soharsteel.om / 98112233",
        financeContact: "Munira Al Ghafri / munira.alghafri@soharsteel.om", payrollFrequency: "Monthly",
        previousInsurer: "Gulf Crescent Insurance Co SAOG", currentBroker: "Gulf Shield Insurance Brokers LLC" },
      policyReq: { products: ["GMC", "GTL"], effectiveDate: asOf, duration: "12 months", policyType: "Portability",
        employerContribution: "Shared (Employer/Employee split)", splitPct: { employer: 75, employee: 25 }, coverageBasis: "Family Floater" },
      census: { fileName: "Sohar_Steel_Census_Final.xlsx", uploadedAt: "2026-07-05", rows },
      censusValidation: validateCensus(rows, asOf, 18, 79, true),
      benefitGMC: { baseSumInsured: 10000, familyDefinition: "Employee, Spouse, 2 Children", roomRent: "Twin Sharing",
        copay: 10, deductible: 0, corporateBuffer: 20000, maternity: true, pedWaived: true, dayCare: true, opd: false, dental: false, vision: false },
      benefitGTL: { coverType: "Salary Multiple", flatCover: null, salaryMultiple: 3, minimumCover: 10000, maximumCover: 90000,
        terminalIllness: true, accidentalDeath: true, permanentDisability: false },
      prevInsurance: { currentInsurer: "Gulf Crescent Insurance Co SAOG", policyNumber: "GCI/GMC/2025/44210",
        policyStart: "2025-09-01", policyEnd: "2026-08-31", livesCovered: 1080, premium: 230000, claims: 165000,
        majorClaims: "Two ongoing cardiac-surgery claims exceeding OMR 5,000 each; one maternity complication claim.",
        reportFile: "Sohar_Claim_Experience_2025-26.pdf", policyDocFile: "Gulf_Crescent_Prior_Policy_Copy.pdf" },
      underwriting: null, quotes: [], selectedQuoteId: null, proposal: null, negotiation: null, approval: null, payment: null, issuance: null
    };
    kase.underwriting = {
      riskScore: 68, industryRiskClass: industry("MFG").risk, fclBreachIds: fclBreaches(kase),
      medicalFlags: [], decision: "Pending", decisionBy: null, decisionDate: null, requestInfoNote: "", loadingPct: 0, comments: ""
    };
    kase.underwriting.fclBreachIds = fclBreaches(kase);
    CASES.push(kase);
  }

  /* 6 — Duqm Infrastructure & Construction: Underwriting — Red (FCL breach + High industry risk) */
  {
    const asOf = "2026-08-15";
    const rows = genCensus(5501, 310, { asOf, minAge: 19, maxAge: 58, withSalary: true, prefix: "DIC-" });
    const kase = {
      id: "EB-2026-0005", createdDate: "2026-06-18", stage: "Underwriting",
      salesExecutiveId: "U-SE-02", brokerId: null,
      lead: { companyName: "Duqm Infrastructure & Construction LLC", industry: "CONSTR", corporateSize: "201–1000",
        contactPerson: "Bader Al Shukaili", designation: "HR Manager", mobile: "97654321", email: "bader.alshukaili@duqminfra.om",
        leadSource: "Cold Call", expectedEmployeeCount: 310, products: ["GTL"], createdDate: "2026-06-18", duplicateFlag: false },
      opportunity: { name: "Duqm Infrastructure & Construction - GTL - 2026", salesOwnerId: "U-SE-02", expectedPremium: 42000,
        expectedCloseDate: "2026-08-25", probability: 50, crmStage: "Quote", products: ["GTL"], notes: "Site workforce, high-value salary-multiple cover requested.", attachments: [] },
      employer: { legalName: "Duqm Infrastructure & Construction LLC", tradeName: "Duqm Infrastructure", crNumber: "1276543",
        vatin: "OM1100067723", industry: "CONSTR", annualTurnover: 12000000, employeeCount: 310,
        officeLocations: ["Duqm", "Al Amerat"], hrContact: "Bader Al Shukaili / bader.alshukaili@duqminfra.om / 97654321",
        financeContact: "", payrollFrequency: "Monthly", previousInsurer: "", currentBroker: "" },
      policyReq: { products: ["GTL"], effectiveDate: asOf, duration: "12 months", policyType: "Fresh",
        employerContribution: "100% Employer-funded", splitPct: null, coverageBasis: "Employee Only" },
      census: { fileName: "Duqm_Infra_Census.xlsx", uploadedAt: "2026-07-10", rows },
      censusValidation: validateCensus(rows, asOf, 18, 79, true),
      benefitGMC: null,
      benefitGTL: { coverType: "Salary Multiple", flatCover: null, salaryMultiple: 8, minimumCover: 10000, maximumCover: 150000,
        terminalIllness: false, accidentalDeath: true, permanentDisability: true },
      prevInsurance: null, underwriting: null, quotes: [], selectedQuoteId: null, proposal: null, negotiation: null, approval: null, payment: null, issuance: null
    };
    kase.underwriting = {
      riskScore: 81, industryRiskClass: industry("CONSTR").risk, fclBreachIds: [],
      medicalFlags: [], decision: "Pending", decisionBy: null, decisionDate: null, requestInfoNote: "", loadingPct: 0, comments: ""
    };
    kase.underwriting.fclBreachIds = fclBreaches(kase);
    CASES.push(kase);
  }

  /* 7 — Barka Fresh Foods: Quote Generated / Proposal Shared */
  {
    const asOf = "2026-07-25";
    const rows = genCensus(6601, 165, { asOf, minAge: 20, maxAge: 57, withSalary: false, prefix: "BFF-" });
    const kase = {
      id: "EB-2026-0006", createdDate: "2026-06-01", stage: "Proposal Shared",
      salesExecutiveId: "U-SE-01", brokerId: null,
      lead: { companyName: "Barka Fresh Foods LLC", industry: "FOOD", corporateSize: "51–200",
        contactPerson: "Ghalia Al Riyami", designation: "HR Lead", mobile: "98887766", email: "ghalia.alriyami@barkafoods.om",
        leadSource: "Event", expectedEmployeeCount: 165, products: ["GMC"], createdDate: "2026-06-01", duplicateFlag: false },
      opportunity: { name: "Barka Fresh Foods - GMC - 2026", salesOwnerId: "U-SE-01", expectedPremium: 28000,
        expectedCloseDate: "2026-08-05", probability: 75, crmStage: "Negotiation", products: ["GMC"], notes: "", attachments: [] },
      employer: { legalName: "Barka Fresh Foods LLC", tradeName: "Barka Fresh Foods", crNumber: "1156789",
        vatin: "OM1100045678", industry: "FOOD", annualTurnover: 3200000, employeeCount: 165,
        officeLocations: ["Barka"], hrContact: "Ghalia Al Riyami / ghalia.alriyami@barkafoods.om / 98887766",
        financeContact: "Dina Al Kalbani / dina.alkalbani@barkafoods.om", payrollFrequency: "Monthly",
        previousInsurer: "", currentBroker: "" },
      policyReq: { products: ["GMC"], effectiveDate: asOf, duration: "12 months", policyType: "Fresh",
        employerContribution: "100% Employer-funded", splitPct: null, coverageBasis: "Family Floater" },
      census: { fileName: "Barka_Fresh_Foods_Census.xlsx", uploadedAt: "2026-06-20", rows },
      censusValidation: validateCensus(rows, asOf, 18, 79, false),
      benefitGMC: { baseSumInsured: 5000, familyDefinition: "Employee, Spouse, 2 Children", roomRent: "Single Private AC",
        copay: 0, deductible: 0, corporateBuffer: 0, maternity: true, pedWaived: false, dayCare: true, opd: true, dental: false, vision: false },
      benefitGTL: null, prevInsurance: null, underwriting: null,
      quotes: [], selectedQuoteId: "A", proposal: null, negotiation: null, approval: null, payment: null, issuance: null
    };
    kase.underwriting = { riskScore: 34, industryRiskClass: industry("FOOD").risk, fclBreachIds: [], medicalFlags: [],
      decision: "Approve", decisionBy: "U-UW-01", decisionDate: "2026-07-08", requestInfoNote: "", loadingPct: 0, comments: "Clean group, standard terms." };
    kase.quotes = quoteOptions(kase);
    const premium = kase.quotes.find(q => q.id === "A").premium;
    const taxes = Math.round(premium * 0.05);
    kase.proposal = { premium, taxes, brokerage: 0, discountPct: 0, discount: 0,
      netPremium: premium + taxes, sentAt: "2026-07-12", sentTo: "Ghalia Al Riyami (HR), no broker" };
    CASES.push(kase);
  }

  /* 8 — Nizwa Pharma & Healthcare: Negotiation — discount requested, needs Business Head, brokered by RMS */
  {
    const asOf = "2026-08-10";
    const rows = genCensus(7701, 1420, { asOf, minAge: 22, maxAge: 59, withSalary: true, prefix: "NPH-" });
    const kase = {
      id: "EB-2026-0007", createdDate: "2026-05-05", stage: "Negotiation",
      salesExecutiveId: "U-SE-02", brokerId: "BRK-01",
      lead: { companyName: "Nizwa Pharma & Healthcare LLC", industry: "HEALTHCARE", corporateSize: "1000+",
        contactPerson: "Sultan Al Abri", designation: "CHRO", mobile: "98223344", email: "sultan.alabri@nizwapharma.om",
        leadSource: "Broker", expectedEmployeeCount: 1420, products: ["GMC", "GTL"], createdDate: "2026-05-05", duplicateFlag: false },
      opportunity: { name: "Nizwa Pharma & Healthcare - GMC/GTL - 2026", salesOwnerId: "U-SE-02", expectedPremium: 1100000,
        expectedCloseDate: "2026-08-30", probability: 70, crmStage: "Negotiation", products: ["GMC", "GTL"], notes: "", attachments: [] },
      employer: { legalName: "Nizwa Pharma & Healthcare LLC", tradeName: "Nizwa Pharma", crNumber: "1387654",
        vatin: "OM1100088123", industry: "HEALTHCARE", annualTurnover: 85000000, employeeCount: 1420,
        officeLocations: ["Nizwa (HO)", "Muscat", "Sohar"], hrContact: "Sultan Al Abri / sultan.alabri@nizwapharma.om / 98223344",
        financeContact: "Asma Al Lawati / asma.allawati@nizwapharma.om", payrollFrequency: "Monthly",
        previousInsurer: "", currentBroker: "RMS Insurance Brokers LLC" },
      policyReq: { products: ["GMC", "GTL"], effectiveDate: asOf, duration: "12 months", policyType: "Fresh",
        employerContribution: "100% Employer-funded", splitPct: null, coverageBasis: "Family Floater" },
      census: { fileName: "Nizwa_Pharma_Census_Final.xlsx", uploadedAt: "2026-06-15", rows },
      censusValidation: validateCensus(rows, asOf, 18, 79, true),
      benefitGMC: { baseSumInsured: 20000, familyDefinition: "Employee, Spouse, 2 Children", roomRent: "Single Private AC",
        copay: 0, deductible: 0, corporateBuffer: 60000, maternity: true, pedWaived: true, dayCare: true, opd: true, dental: true, vision: false },
      benefitGTL: { coverType: "Flat Cover", flatCover: 25000, salaryMultiple: null, minimumCover: 25000, maximumCover: 25000,
        terminalIllness: true, accidentalDeath: true, permanentDisability: true },
      prevInsurance: null, underwriting: null, quotes: [], selectedQuoteId: "A", proposal: null, approval: null, payment: null, issuance: null
    };
    kase.underwriting = { riskScore: 29, industryRiskClass: industry("HEALTHCARE").risk, fclBreachIds: [], medicalFlags: [],
      decision: "Approve", decisionBy: "U-UW-01", decisionDate: "2026-06-25", requestInfoNote: "", loadingPct: 0, comments: "Approved at standard terms." };
    kase.quotes = quoteOptions(kase);
    const premium = kase.quotes.find(q => q.id === "A").premium;
    const taxes = Math.round(premium * 0.05);
    kase.proposal = { premium, taxes, brokerage: brokerageFor(kase, premium), discountPct: 0, discount: 0,
      netPremium: premium + taxes, sentAt: "2026-07-01", sentTo: "Sultan Al Abri (HR); RMS Insurance Brokers" };
    kase.negotiation = {
      requests: [
        { type: "Discount Requested", detail: "HR has asked for a 7% discount citing a competing quote from another insurer.", date: "2026-07-08", by: "Corporate HR" },
        { type: "Benefit Changes", detail: "Requested OPD sub-limit increase from OMR 300 to OMR 500 per employee.", date: "2026-07-08", by: "Corporate HR" }
      ],
      salesComments: "Employer is price-sensitive but committed if we can land close to 7%. Recommend routing for Business Head approval rather than losing the case.",
      uwComments: "Benefit change (OPD limit) does not move risk beyond approved parameters — no UW re-referral needed.",
      financeComments: "", discountRequestedPct: 7, resubmitted: false
    };
    CASES.push(kase);
  }

  /* 9 — Sur Maritime Freight: Approval Workflow — Finance pending */
  {
    const asOf = "2026-07-28";
    const rows = genCensus(8801, 340, { asOf, minAge: 21, maxAge: 58, withSalary: false, prefix: "SMF-" });
    const kase = {
      id: "EB-2026-0008", createdDate: "2026-05-25", stage: "Negotiation",
      salesExecutiveId: "U-SE-01", brokerId: null,
      lead: { companyName: "Sur Maritime Freight LLC", industry: "LOGISTICS", corporateSize: "201–1000",
        contactPerson: "Adil Al Amri", designation: "HR Head", mobile: "97766554", email: "adil.alamri@surmaritime.om",
        leadSource: "Referral", expectedEmployeeCount: 340, products: ["GMC"], createdDate: "2026-05-25", duplicateFlag: false },
      opportunity: { name: "Sur Maritime Freight - GMC - 2026", salesOwnerId: "U-SE-01", expectedPremium: 68000,
        expectedCloseDate: "2026-08-01", probability: 85, crmStage: "Negotiation", products: ["GMC"], notes: "", attachments: [] },
      employer: { legalName: "Sur Maritime Freight LLC", tradeName: "Sur Maritime Freight", crNumber: "1234567",
        vatin: "OM1100023456", industry: "LOGISTICS", annualTurnover: 7800000, employeeCount: 340,
        officeLocations: ["Sur", "Muscat"], hrContact: "Adil Al Amri / adil.alamri@surmaritime.om / 97766554",
        financeContact: "Wafa Al Busaidi / wafa.albusaidi@surmaritime.om", payrollFrequency: "Monthly",
        previousInsurer: "", currentBroker: "" },
      policyReq: { products: ["GMC"], effectiveDate: asOf, duration: "12 months", policyType: "Fresh",
        employerContribution: "100% Employer-funded", splitPct: null, coverageBasis: "Family Floater" },
      census: { fileName: "Sur_Maritime_Census.xlsx", uploadedAt: "2026-06-25", rows },
      censusValidation: validateCensus(rows, asOf, 18, 79, false),
      benefitGMC: { baseSumInsured: 10000, familyDefinition: "Employee, Spouse, 2 Children", roomRent: "Twin Sharing",
        copay: 0, deductible: 0, corporateBuffer: 0, maternity: false, pedWaived: true, dayCare: true, opd: false, dental: false, vision: false },
      benefitGTL: null, prevInsurance: null, underwriting: null, quotes: [], selectedQuoteId: "A", proposal: null, negotiation: null, payment: null, issuance: null
    };
    kase.underwriting = { riskScore: 22, industryRiskClass: industry("LOGISTICS").risk, fclBreachIds: [], medicalFlags: [],
      decision: "Approve", decisionBy: "U-UW-01", decisionDate: "2026-06-30", requestInfoNote: "", loadingPct: 0, comments: "Green — fast-track eligible." };
    kase.quotes = quoteOptions(kase);
    const premium = kase.quotes.find(q => q.id === "A").premium;
    const taxes = Math.round(premium * 0.05);
    kase.proposal = { premium, taxes, brokerage: 0, discountPct: 0, discount: 0, netPremium: premium + taxes,
      sentAt: "2026-07-03", sentTo: "Adil Al Amri (HR)" };
    kase.negotiation = { requests: [], salesComments: "No changes requested — proceeding to approval as-is.", uwComments: "", financeComments: "", discountRequestedPct: 0, resubmitted: true };
    kase.approval = {
      steps: [
        { role: "Sales Manager", status: "Approved", by: "Nasser Al Rashdi", date: "2026-07-14", comment: "Standard Green case, approved." },
        { role: "Underwriter", status: "Approved", by: "Mariam Al Hinai", date: "2026-07-15", comment: "Confirmed UW terms unchanged." },
        { role: "Finance", status: "Pending", by: null, date: null, comment: "" }
      ]
    };
    CASES.push(kase);
  }

  /* 10 — Rustaq Manufacturing Industries: Policy Issued (closed), brokered by Al Nahda */
  {
    const asOf = "2026-06-01";
    const rows = genCensus(9901, 1240, { asOf, minAge: 21, maxAge: 59, withSalary: true, prefix: "RMI-" });
    const kase = {
      id: "EB-2026-0009", createdDate: "2026-04-02", stage: "Policy Issued",
      salesExecutiveId: "U-SE-02", brokerId: "BRK-03",
      lead: { companyName: "Rustaq Manufacturing Industries LLC", industry: "MFG", corporateSize: "1000+",
        contactPerson: "Majid Al Busaidi", designation: "CHRO", mobile: "97001122", email: "majid.albusaidi@rustaqmfg.om",
        leadSource: "Broker", expectedEmployeeCount: 1240, products: ["GMC", "GTL"], createdDate: "2026-04-02", duplicateFlag: false },
      opportunity: { name: "Rustaq Manufacturing Industries - GMC/GTL - 2026", salesOwnerId: "U-SE-02", expectedPremium: 460000,
        expectedCloseDate: "2026-06-15", probability: 100, crmStage: "Closed Won", products: ["GMC", "GTL"], notes: "", attachments: [] },
      employer: { legalName: "Rustaq Manufacturing Industries LLC", tradeName: "Rustaq Manufacturing", crNumber: "1109988",
        vatin: "OM1100011002", industry: "MFG", annualTurnover: 55000000, employeeCount: 1240,
        officeLocations: ["Rustaq (HO)", "Sohar"], hrContact: "Majid Al Busaidi / majid.albusaidi@rustaqmfg.om / 97001122",
        financeContact: "Zainab Al Riyami / zainab.alriyami@rustaqmfg.om", payrollFrequency: "Monthly",
        previousInsurer: "", currentBroker: "Al Nahda Brokerage Services LLC" },
      policyReq: { products: ["GMC", "GTL"], effectiveDate: asOf, duration: "12 months", policyType: "Fresh",
        employerContribution: "100% Employer-funded", splitPct: null, coverageBasis: "Family Floater" },
      census: { fileName: "Rustaq_Manufacturing_Census.xlsx", uploadedAt: "2026-05-10", rows },
      censusValidation: validateCensus(rows, asOf, 18, 79, true),
      benefitGMC: { baseSumInsured: 10000, familyDefinition: "Employee, Spouse, 2 Children", roomRent: "Twin Sharing",
        copay: 0, deductible: 0, corporateBuffer: 30000, maternity: true, pedWaived: true, dayCare: true, opd: false, dental: false, vision: false },
      benefitGTL: { coverType: "Salary Multiple", flatCover: null, salaryMultiple: 2, minimumCover: 10000, maximumCover: 60000,
        terminalIllness: true, accidentalDeath: true, permanentDisability: false },
      prevInsurance: null, underwriting: null, quotes: [], selectedQuoteId: "A", proposal: null, negotiation: null, payment: null, issuance: null
    };
    kase.underwriting = { riskScore: 31, industryRiskClass: industry("MFG").risk, fclBreachIds: [], medicalFlags: [],
      decision: "Approve", decisionBy: "U-UW-01", decisionDate: "2026-05-16", requestInfoNote: "", loadingPct: 0, comments: "Approved, standard terms." };
    kase.quotes = quoteOptions(kase);
    const premium = kase.quotes.find(q => q.id === "A").premium;
    const taxes = Math.round(premium * 0.05);
    kase.proposal = { premium, taxes, brokerage: brokerageFor(kase, premium), discountPct: 3, discount: Math.round(premium * 0.03),
      netPremium: Math.round(premium * 0.97) + taxes, sentAt: "2026-05-20", sentTo: "Majid Al Busaidi (HR); Al Nahda Brokerage Services" };
    kase.negotiation = { requests: [{ type: "Discount Requested", detail: "3% loyalty discount requested for multi-year relationship.", date: "2026-05-22", by: "Corporate HR" }],
      salesComments: "Long-standing relationship; discount within Sales Manager delegated authority.", uwComments: "", financeComments: "Approved — within margin.", discountRequestedPct: 3, resubmitted: true };
    kase.approval = { steps: [
      { role: "Sales Manager", status: "Approved", by: "Nasser Al Rashdi", date: "2026-05-24", comment: "Within delegated authority." },
      { role: "Underwriter", status: "Approved", by: "Mariam Al Hinai", date: "2026-05-25", comment: "No change to risk." },
      { role: "Finance", status: "Approved", by: "Layla Al Zadjali", date: "2026-05-26", comment: "Reconciled against target margin." }
    ] };
    const total = kase.proposal.netPremium;
    kase.payment = { invoiceNo: "INV-2026-0091", premium: kase.proposal.netPremium - Math.round(kase.proposal.netPremium * 0.05 / 1.05),
      gst: Math.round(kase.proposal.netPremium * 0.05 / 1.05), total, mode: "Bank Transfer", txnNumber: "BT2026052900231",
      proofFile: "Rustaq_Payment_Proof.pdf", status: "Received", submittedAt: "2026-05-29", reconciledAt: "2026-05-30" };
    kase.issuance = { policyNumber: "AFA/EB/2026/004120", startDate: asOf, endDate: "2027-05-31", products: ["GMC", "GTL"],
      premium: kase.proposal.netPremium, livesCovered: kase.censusValidation.accepted, issuedAt: "2026-06-01",
      documents: ["Policy Schedule", "Tax Invoice", "Employee Certificates (bulk)"], welcomeKitSent: true, finished: true };
    CASES.push(kase);
  }

  /* 11 — Marina Heights Construction (UAE): Employer Profile Completed, brokered by RMS's Dubai office.
     Demonstrates the UAE identity format (Trade License / VAT TRN) and AED currency. */
  CASES.push({
    id: "EB-2026-0011", createdDate: "2026-07-08", stage: "Employer Profile Completed",
    salesExecutiveId: "U-SE-01", brokerId: "BRK-01", geography: "UAE", currency: "AED",
    lead: {
      companyName: "Marina Heights Construction LLC", industry: "CONSTR", corporateSize: "201–1000",
      contactPerson: "Khalid Al Mazrouei", designation: "HR Director", mobile: "501234567", email: "khalid.almazrouei@marinaheights.ae",
      leadSource: "Broker", expectedEmployeeCount: 380, products: ["GMC", "GTL"], createdDate: "2026-07-08", duplicateFlag: false
    },
    opportunity: {
      name: "Marina Heights Construction - GMC/GTL - 2026", salesOwnerId: "U-SE-01", expectedPremium: 980000,
      expectedCloseDate: "2026-09-20", probability: 45, crmStage: "Qualification", products: ["GMC", "GTL"],
      notes: "Introduced by RMS Insurance Brokers — Dubai office. Site-based construction workforce; DEWA-compliant medical network requested.",
      attachments: []
    },
    employer: {
      legalName: "Marina Heights Construction LLC", tradeName: "Marina Heights Construction", tradeLicense: "DED-784512",
      vatTrn: "100234567800003", industry: "CONSTR", annualTurnover: 42000000, employeeCount: 380,
      officeLocations: ["Dubai (HO)", "Abu Dhabi", "Sharjah"], hrContact: "Khalid Al Mazrouei / khalid.almazrouei@marinaheights.ae / +971 50 123 4567",
      financeContact: "Noor Al Falasi / noor.alfalasi@marinaheights.ae", payrollFrequency: "Monthly",
      previousInsurer: "", currentBroker: "RMS Insurance Brokers LLC"
    },
    policyReq: null, census: null, censusValidation: null, benefitGMC: null, benefitGTL: null, prevInsurance: null,
    underwriting: null, quotes: [], selectedQuoteId: null, proposal: null, negotiation: null, approval: null, payment: null, issuance: null
  });

  /* 12 — Lusail Energy Solutions (Qatar): Opportunity Created, brokered by RMS's Doha office.
     Demonstrates the Qatar identity format (CR / Tax Card, no VAT under the GCC framework yet) and QAR currency. */
  CASES.push({
    id: "EB-2026-0012", createdDate: "2026-07-12", stage: "Opportunity Created",
    salesExecutiveId: "U-SE-02", brokerId: "BRK-01", geography: "Qatar", currency: "QAR",
    lead: {
      companyName: "Lusail Energy Solutions WLL", industry: "ENERGY", corporateSize: "1000+",
      contactPerson: "Fahad Al Kaabi", designation: "Head of Human Capital", mobile: "55123456", email: "fahad.alkaabi@lusailenergy.qa",
      leadSource: "Broker", expectedEmployeeCount: 1100, products: ["GMC", "GTL"], createdDate: "2026-07-12", duplicateFlag: false
    },
    opportunity: {
      name: "Lusail Energy Solutions - GMC/GTL - 2026", salesOwnerId: "U-SE-02", expectedPremium: 4800000,
      expectedCloseDate: "2026-10-01", probability: 55, crmStage: "Needs Analysis", products: ["GMC", "GTL"],
      notes: "Introduced by RMS Insurance Brokers — Doha office. LNG/gas sector workforce; expatriate-heavy census expected, high FCL exposure likely for GTL.",
      attachments: []
    },
    employer: null, policyReq: null, census: null, censusValidation: null, benefitGMC: null, benefitGTL: null, prevInsurance: null,
    underwriting: null, quotes: [], selectedQuoteId: null, proposal: null, negotiation: null, approval: null, payment: null, issuance: null
  });

  /* ---------- notifications derived from seed state (Notification Matrix, Section 7) ---------- */
  CASES.forEach(k => {
    pushNotif(k, "Lead created", "info", `Lead confirmation sent to <strong>${k.lead.contactPerson}</strong> — ${k.lead.companyName}`, `#/case/${k.id}/opportunity`);
    if (k.census) pushNotif(k, "Census uploaded", "info", `Census uploaded for <strong>${k.lead.companyName}</strong> — ${k.census.rows.length} rows`, `#/case/${k.id}/census-validation`);
    if (k.underwriting && k.underwriting.decision !== "Pending") {
      const tl = trafficLight(k);
      pushNotif(k, "Underwriting decision recorded", tl === "Red" ? "warn" : tl === "Amber" ? "warn" : "ok",
        `Underwriting <strong>${k.underwriting.decision}</strong> for ${k.lead.companyName} (${tl})`, `#/case/${k.id}/underwriting`);
    } else if (k.underwriting) {
      const tl = trafficLight(k);
      if (tl === "Red") pushNotif(k, "Underwriting decision recorded", "warn", `Referral alert: <strong>${k.lead.companyName}</strong> is Red — Senior Underwriter action required`, `#/case/${k.id}/underwriting`);
      else if (tl === "Amber") pushNotif(k, "Underwriting decision recorded", "warn", `Referral alert: <strong>${k.lead.companyName}</strong> is Amber — refer for review`, `#/case/${k.id}/underwriting`);
    }
    if (k.proposal) pushNotif(k, "Proposal sent", "ok", `Proposal PDF sent for <strong>${k.lead.companyName}</strong>`, `#/case/${k.id}/proposal`);
    if (k.approval) {
      const pending = k.approval.steps.find(s => s.status === "Pending");
      if (pending) pushNotif(k, "Approval step completed", "warn", `<strong>${pending.role}</strong> approval pending — ${k.lead.companyName}`, `#/case/${k.id}/approval`);
    }
    if (k.payment && k.payment.status === "Received") pushNotif(k, "Payment received", "ok", `Payment received and reconciled — <strong>${k.lead.companyName}</strong>`, `#/case/${k.id}/payment`);
    if (k.issuance) pushNotif(k, "Policy issued", "ok", `Policy <strong>${k.issuance.policyNumber}</strong> issued — ${k.lead.companyName}`, `#/case/${k.id}/issuance`);
  });

  /* ---------- in-force book nearing renewal (dashboard Screen 1 widget; renewal journey itself is out of scope) ---------- */
  const RENEWALS = [
    { company: "Muttrah Hospitality Group", product: "GMC", premium: 62000, expiry: addDays(TODAY, 42), owner: "U-SE-01" },
    { company: "Seeb Data Systems LLC", product: "GMC + GTL", premium: 98000, expiry: addDays(TODAY, 68), owner: "U-SE-02" },
    { company: "Ibra Steel Industries LLC", product: "GTL", premium: 27000, expiry: addDays(TODAY, 84), owner: "U-SE-01" }
  ];
  RENEWALS.forEach(r => pushNotif(null, "Renewal due within 90 days", "warn", `<strong>${r.company}</strong> ${r.product} policy renews in ${daysBetween(TODAY, r.expiry)} days`, "#/dashboard"));
  function daysBetween(a, b) { return Math.round((new Date(b) - new Date(a)) / 86400000); }

  window.DB = {
    ROLES, PERSONAS, CURRENT_USER, SALES_EXECS, UNDERWRITERS, FINANCE, BUSINESS_HEAD, FINANCE_HEAD, OPERATIONS, POLICY_ADMIN,
    BROKERS, INDUSTRIES, industry, CORPORATE_SIZE_BANDS, sizeBand, FCL_TABLE,
    APPROVAL_MATRIX, NOTIFICATION_MATRIX, KEY_DOCUMENTS, STATUS_FLOW,
    CASES, NOTIFICATIONS, RENEWALS, TODAY,
    calc: {
      computeAge, validateCensus, reconciliation, lossRatio, fclBreaches, computeRiskScore, ensureUnderwriting, ageDistribution, trafficLight,
      calcGMCPremium, calcGTLPremium, basePremium, brokerageFor, quoteOptions, approvalRoute, genCensus, addDays
    },
    pushNotif
  };
})();
