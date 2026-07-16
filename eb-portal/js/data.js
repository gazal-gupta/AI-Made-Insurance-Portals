/* ============================================================
   Parivaar Assurance — Employee Benefits Sales Portal
   Mock data layer + business-rule calculators.
   In-memory sample book — refresh the page to reset.
   ============================================================ */
(function () {

  /* ---------- reference lists ---------- */
  const ROLES = ["Sales Executive", "Relationship Manager", "Broker", "Corporate HR", "Underwriter",
    "Senior Underwriter", "Finance", "Operations", "Business Head", "Policy Administration Team"];

  const PERSONAS = [
    { id: "U-SE-01", name: "Rohan Mehta", role: "Sales Executive", initials: "RM" },
    { id: "U-SM-01", name: "Karan Malhotra", role: "Sales Manager", initials: "KM" },
    { id: "U-UW-01", name: "Priya Nair", role: "Underwriter", initials: "PN" },
    { id: "U-SUW-01", name: "Vikram Rao", role: "Senior Underwriter", initials: "VR" },
    { id: "U-FIN-01", name: "Sunita Agarwal", role: "Finance", initials: "SA" },
    { id: "U-BH-01", name: "Ashok Kapoor", role: "Business Head", initials: "AK" }
  ];
  const CURRENT_USER = Object.assign({}, PERSONAS[0]);

  const SALES_EXECS = [
    { id: "U-SE-01", name: "Rohan Mehta", role: "Sales Executive", manager: "U-SM-01" },
    { id: "U-SE-02", name: "Ananya Desai", role: "Sales Executive", manager: "U-SM-01" },
    { id: "U-SM-01", name: "Karan Malhotra", role: "Sales Manager" }
  ];
  const UNDERWRITERS = [
    { id: "U-UW-01", name: "Priya Nair", role: "Underwriter" },
    { id: "U-SUW-01", name: "Vikram Rao", role: "Senior Underwriter" }
  ];
  const FINANCE = [{ id: "U-FIN-01", name: "Sunita Agarwal", role: "Finance" }];
  const BUSINESS_HEAD = { id: "U-BH-01", name: "Ashok Kapoor", role: "Business Head" };
  const FINANCE_HEAD = { id: "U-FH-01", name: "Meera Chatterjee", role: "Finance Head" };
  const OPERATIONS = { id: "U-OPS-01", name: "Deepak Joshi", role: "Operations" };
  const POLICY_ADMIN = { id: "U-PA-01", name: "Radha Pillai", role: "Policy Administration Team" };

  const BROKERS = [
    { id: "BRK-01", name: "Trinity Insurance Brokers Pvt Ltd", contact: "Nikhil Bhatt", email: "nikhil.bhatt@trinitybrokers.in" },
    { id: "BRK-02", name: "Coastline Risk Advisors LLP", contact: "Isha Kulkarni", email: "isha.k@coastlinerisk.in" },
    { id: "BRK-03", name: "RMS Insurance Brokers LLC", contact: "Yousuf Al Balushi", email: "yousuf.albalushi@rmsme.com",
      note: "Established 1979 — first licensed insurance broker in the Sultanate of Oman; largest Employee Benefits broker in Oman, also operating in the UAE and Qatar." }
  ];

  const INDUSTRIES = [
    { code: "IT", label: "IT / ITES", risk: "Low" },
    { code: "BFSI", label: "Banking, Financial Services & Insurance", risk: "Low" },
    { code: "PHARMA", label: "Pharmaceuticals", risk: "Medium" },
    { code: "TEXTILE", label: "Textiles & Apparel", risk: "Medium" },
    { code: "MFG", label: "Engineering & Manufacturing", risk: "Medium" },
    { code: "LOGISTICS", label: "Logistics & Freight", risk: "Medium" },
    { code: "RETAIL", label: "Retail & FMCG", risk: "Low" },
    { code: "FOOD", label: "Food Processing", risk: "Medium" },
    { code: "CONSTR", label: "Construction & Infrastructure", risk: "High" },
    { code: "CHEM", label: "Chemicals & Mining", risk: "High" },
    { code: "ENERGY", label: "Energy & Power", risk: "High" }
  ];
  const industry = code => INDUSTRIES.find(i => i.code === code) || INDUSTRIES[0];

  const CORPORATE_SIZE_BANDS = ["1–50", "51–200", "201–1000", "1000+"];
  function sizeBand(count) {
    if (count <= 50) return "1–50";
    if (count <= 200) return "51–200";
    if (count <= 1000) return "201–1000";
    return "1000+";
  }
  const FCL_TABLE = { "1–50": 500000, "51–200": 1000000, "201–1000": 2000000, "1000+": 3000000 };

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
  const MALE = ["Rohan", "Aarav", "Vikram", "Karan", "Suresh", "Anil", "Rajesh", "Sanjay", "Arjun", "Nikhil",
    "Manoj", "Deepak", "Ravi", "Vivek", "Ashok", "Pranav", "Kunal", "Siddharth", "Harish", "Amitabh"];
  const FEMALE = ["Priya", "Anjali", "Neha", "Pooja", "Kavya", "Meera", "Sneha", "Divya", "Ritu", "Shalini",
    "Anita", "Kirti", "Nisha", "Swati", "Radha", "Isha", "Tanvi", "Rekha", "Sunita", "Preeti"];
  const SURNAMES = ["Sharma", "Verma", "Iyer", "Nair", "Gupta", "Menon", "Reddy", "Rao", "Kulkarni", "Joshi",
    "Mehta", "Patel", "Singh", "Chatterjee", "Bhatt", "Malhotra", "Kapoor", "Desai", "Pillai", "Agarwal"];

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
      const salary = opts.withSalary ? Math.round((300000 + rand() * 2200000) / 5000) * 5000 : null;
      const empId = opts.prefix + String(i).padStart(4, "0");
      const isBlank = opts.blankNameIdx === i;
      rows.push({
        empId: (opts.duplicateIdx && opts.duplicateIdx === i) ? opts.prefix + "0001" : empId,
        name: isBlank ? "" : `${first} ${last}`,
        dob, gender: female ? "Female" : "Male",
        salary,
        coverage: rand() > 0.78 ? "Family Floater" : "Employee Only",
        blankName: isBlank
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
      if (r.blankName) { status = "Rejected"; reason = "Employee Name is blank"; }
      else if (seenIds.has(r.empId)) { status = "Rejected"; reason = "Duplicate Employee ID within file"; }
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

  /* ---------- premium calculators (Screen 12) ---------- */
  const SI_RATE = { 300000: 4200, 500000: 6800, 1000000: 10500, 2000000: 15800 };
  function calcGMCPremium(kase, siOverride, ridersOverride) {
    const b = kase.benefitGMC; if (!b) return 0;
    const lives = kase.censusValidation ? kase.censusValidation.accepted : (kase.employer ? kase.employer.employeeCount : 0);
    const si = siOverride || b.baseSumInsured;
    let perLife = SI_RATE[si] || Math.round(si * 0.012);
    if (b.familyDefinition && b.familyDefinition.includes("Children")) perLife *= 1.6;
    if (b.corporateBuffer) perLife += Math.round(b.corporateBuffer * 0.008);
    if (b.maternity) perLife += 950;
    const riders = ridersOverride || b;
    if (riders.opd) perLife += 1400;
    if (riders.dental) perLife += 350;
    if (riders.vision) perLife += 250;
    if (b.copay) perLife *= (1 - b.copay / 200);
    const loading = kase.underwriting && kase.underwriting.loadingPct ? 1 + kase.underwriting.loadingPct / 100 : 1;
    return Math.round(lives * perLife * loading / 100) * 100;
  }
  function calcGTLPremium(kase) {
    const g = kase.benefitGTL; if (!g) return 0;
    const rows = kase.censusValidation ? kase.censusValidation.rows.filter(r => r.status === "Accepted") : [];
    let total = 0;
    rows.forEach(r => {
      const cover = g.coverType === "Flat Cover" ? g.flatCover : Math.min(Math.max((r.salary || 0) * g.salaryMultiple, g.minimumCover), g.maximumCover);
      let rate = 0.55; // per 1000 sum assured, annual
      if (r.age > 45) rate = 0.95; else if (r.age > 35) rate = 0.7;
      total += (cover / 1000) * rate;
    });
    if (g.terminalIllness) total *= 1.03;
    if (g.accidentalDeath) total *= 1.05;
    if (g.permanentDisability) total *= 1.04;
    const loading = kase.underwriting && kase.underwriting.loadingPct ? 1 + kase.underwriting.loadingPct / 100 : 1;
    return Math.round(total * loading / 10) * 10;
  }
  function basePremium(kase) { return calcGMCPremium(kase) + calcGTLPremium(kase); }

  function quoteOptions(kase) {
    if (!kase.benefitGMC && !kase.benefitGTL) return [];
    const base = basePremium(kase);
    const opts = [
      { id: "A", name: "Option A — As Configured", premium: base,
        benefits: [kase.benefitGMC ? `GMC — SI ₹${(kase.benefitGMC.baseSumInsured/100000)}L, ${kase.benefitGMC.familyDefinition}` : null,
                   kase.benefitGTL ? `GTL — ${kase.benefitGTL.coverType}` : null].filter(Boolean) },
      { id: "B", name: "Option B — Enhanced", premium: Math.round(base * 1.22 / 100) * 100,
        benefits: [kase.benefitGMC ? "GMC — Higher SI slab, OPD rider added" : null, kase.benefitGTL ? "GTL — Accidental Death rider added" : null].filter(Boolean) },
      { id: "C", name: "Option C — Lean", premium: Math.round(base * 0.84 / 100) * 100,
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

  /* 1 — NimbusTech Solutions: fresh Lead only */
  CASES.push({
    id: "EB-2026-0001", createdDate: "2026-07-14", stage: "Lead",
    salesExecutiveId: "U-SE-01", brokerId: null,
    lead: {
      companyName: "NimbusTech Solutions Pvt Ltd", industry: "IT", corporateSize: "51–200",
      contactPerson: "Anjali Verma", designation: "Head — HR", mobile: "9821044567", email: "anjali.verma@nimbustech.in",
      leadSource: "Digital", expectedEmployeeCount: 140, products: ["GMC"], createdDate: "2026-07-14", duplicateFlag: false
    },
    opportunity: null, employer: null, policyReq: null, census: null, censusValidation: null,
    benefitGMC: null, benefitGTL: null, prevInsurance: null, underwriting: null,
    quotes: [], selectedQuoteId: null, proposal: null, negotiation: null, approval: null, payment: null, issuance: null
  });

  /* 2 — BluePeak Logistics: Opportunity + Employer Profile in progress */
  CASES.push({
    id: "EB-2026-0002", createdDate: "2026-06-30", stage: "Opportunity Created",
    salesExecutiveId: "U-SE-02", brokerId: "BRK-01",
    lead: {
      companyName: "BluePeak Logistics Pvt Ltd", industry: "LOGISTICS", corporateSize: "201–1000",
      contactPerson: "Suresh Iyer", designation: "VP — People Operations", mobile: "9845123390", email: "suresh.iyer@bluepeaklog.in",
      leadSource: "Broker", expectedEmployeeCount: 420, products: ["GMC", "GTL"], createdDate: "2026-06-30", duplicateFlag: false
    },
    opportunity: {
      name: "BluePeak Logistics - GMC/GTL - 2026", salesOwnerId: "U-SE-02", expectedPremium: 8200000,
      expectedCloseDate: "2026-08-20", probability: 60, crmStage: "Needs Analysis", products: ["GMC", "GTL"],
      notes: "Employer keen on family floater cover; wants GTL flat cover for warehouse staff.", attachments: []
    },
    employer: {
      legalName: "BluePeak Logistics Private Limited", tradeName: "BluePeak Logistics", pan: "AACCB1234F",
      gst: "27AACCB1234F1Z5", industry: "LOGISTICS", annualTurnover: 480000000, employeeCount: 420,
      officeLocations: ["Mumbai (HO)", "Pune", "Nagpur"], hrContact: "Suresh Iyer / suresh.iyer@bluepeaklog.in / 9845123390",
      financeContact: "Ritu Shalini / ritu.shalini@bluepeaklog.in", payrollFrequency: "Monthly",
      previousInsurer: "", currentBroker: "Trinity Insurance Brokers Pvt Ltd"
    },
    policyReq: null, census: null, censusValidation: null, benefitGMC: null, benefitGTL: null, prevInsurance: null,
    underwriting: null, quotes: [], selectedQuoteId: null, proposal: null, negotiation: null, approval: null, payment: null, issuance: null
  });

  /* 2b — Al Bahja Power & Energy LLC (Oman): brokered by RMS Insurance Brokers — demonstrates
     geography parameterisation (Section 1.4) beyond the India-first default: CR/VAT identity
     format instead of PAN/GST, OMR currency, +968 mobile format. */
  CASES.push({
    id: "EB-2026-0010", createdDate: "2026-07-10", stage: "Opportunity Created",
    salesExecutiveId: "U-SE-02", brokerId: "BRK-03", geography: "Oman", currency: "OMR",
    lead: {
      companyName: "Al Bahja Power & Energy LLC", industry: "ENERGY", corporateSize: "201–1000",
      contactPerson: "Fatma Al Habsi", designation: "HR & Admin Manager", mobile: "92345678", email: "fatma.alhabsi@albahjapower.om",
      leadSource: "Broker", expectedEmployeeCount: 450, products: ["GMC", "GTL"], createdDate: "2026-07-10", duplicateFlag: false
    },
    opportunity: {
      name: "Al Bahja Power & Energy - GMC/GTL - 2026", salesOwnerId: "U-SE-02", expectedPremium: 185000,
      expectedCloseDate: "2026-09-05", probability: 55, crmStage: "Needs Analysis", products: ["GMC", "GTL"],
      notes: "Introduced by RMS Insurance Brokers (Muscat) — largest EB broker in Oman, est. 1979. Power-plant O&M workforce; wants GTL accidental death rider given site risk profile.",
      attachments: []
    },
    employer: {
      legalName: "Al Bahja Power & Energy LLC", tradeName: "Al Bahja Power", crNumber: "1284563", vatin: "OM1100056324",
      industry: "ENERGY", annualTurnover: 42000000, employeeCount: 450,
      officeLocations: ["Muscat (HO)", "Sohar", "Duqm"], hrContact: "Fatma Al Habsi / fatma.alhabsi@albahjapower.om / +968 9234 5678",
      financeContact: "Salim Al Rawahi / salim.alrawahi@albahjapower.om", payrollFrequency: "Monthly",
      previousInsurer: "", currentBroker: "RMS Insurance Brokers LLC"
    },
    policyReq: null, census: null, censusValidation: null, benefitGMC: null, benefitGTL: null, prevInsurance: null,
    underwriting: null, quotes: [], selectedQuoteId: null, proposal: null, negotiation: null, approval: null, payment: null, issuance: null
  });

  /* 3 — Solaris Textiles: Census uploaded, validation has errors pending fix */
  {
    const asOf = "2026-08-01";
    const rows = genCensus(3301, 245, { asOf, minAge: 18, maxAge: 79, withSalary: false, prefix: "SOL-",
      outOfBandIdx: [7], duplicateIdx: 15, blankNameIdx: 21 });
    CASES.push({
      id: "EB-2026-0003", createdDate: "2026-06-10", stage: "Census Uploaded",
      salesExecutiveId: "U-SE-01", brokerId: null,
      lead: { companyName: "Solaris Textiles Ltd", industry: "TEXTILE", corporateSize: "201–1000",
        contactPerson: "Karan Singh", designation: "CHRO", mobile: "9900112233", email: "karan.singh@solaristextiles.in",
        leadSource: "Referral", expectedEmployeeCount: 260, products: ["GMC"], createdDate: "2026-06-10", duplicateFlag: false },
      opportunity: { name: "Solaris Textiles - GMC - 2026", salesOwnerId: "U-SE-01", expectedPremium: 3100000,
        expectedCloseDate: "2026-08-10", probability: 55, crmStage: "Quote", products: ["GMC"], notes: "", attachments: [] },
      employer: { legalName: "Solaris Textiles Limited", tradeName: "Solaris Textiles", pan: "AABCS5678K",
        gst: "24AABCS5678K1Z2", industry: "TEXTILE", annualTurnover: 210000000, employeeCount: 260,
        officeLocations: ["Surat"], hrContact: "Karan Singh / karan.singh@solaristextiles.in / 9900112233",
        financeContact: "", payrollFrequency: "Monthly", previousInsurer: "", currentBroker: "" },
      policyReq: { products: ["GMC"], effectiveDate: "2026-08-01", duration: "12 months", policyType: "Fresh",
        employerContribution: "100% Employer-funded", splitPct: null, coverageBasis: "Family Floater" },
      census: { fileName: "Solaris_Textiles_Census_v2.xlsx", uploadedAt: "2026-07-15", rows, hrConfirmedVariance: false },
      censusValidation: validateCensus(rows, asOf, 18, 79, false),
      benefitGMC: null, benefitGTL: null, prevInsurance: null, underwriting: null,
      quotes: [], selectedQuoteId: null, proposal: null, negotiation: null, approval: null, payment: null, issuance: null
    });
  }

  /* 4 — Vertex Engineering: Underwriting — Amber (loss ratio breach, Portability) */
  {
    const asOf = "2026-09-01";
    const rows = genCensus(4401, 1150, { asOf, minAge: 21, maxAge: 60, withSalary: true, prefix: "VTX-" });
    const kase = {
      id: "EB-2026-0004", createdDate: "2026-05-20", stage: "Underwriting",
      salesExecutiveId: "U-SE-01", brokerId: "BRK-02",
      lead: { companyName: "Vertex Engineering Pvt Ltd", industry: "MFG", corporateSize: "1000+",
        contactPerson: "Manoj Kulkarni", designation: "Head HR", mobile: "9811223344", email: "manoj.kulkarni@vertexeng.in",
        leadSource: "Broker", expectedEmployeeCount: 1150, products: ["GMC", "GTL"], createdDate: "2026-05-20", duplicateFlag: false },
      opportunity: { name: "Vertex Engineering - GMC/GTL - 2026", salesOwnerId: "U-SE-01", expectedPremium: 21500000,
        expectedCloseDate: "2026-09-15", probability: 65, crmStage: "Quote", products: ["GMC", "GTL"],
        notes: "Portability from incumbent insurer; prior claims history under review.", attachments: [{ name: "Vertex_Prior_Policy.pdf", size: "1.4 MB" }] },
      employer: { legalName: "Vertex Engineering Private Limited", tradeName: "Vertex Engineering", pan: "AACCV9988M",
        gst: "27AACCV9988M1ZR", industry: "MFG", annualTurnover: 1650000000, employeeCount: 1150,
        officeLocations: ["Pune", "Chakan", "Aurangabad"], hrContact: "Manoj Kulkarni / manoj.kulkarni@vertexeng.in / 9811223344",
        financeContact: "Preeti Rao / preeti.rao@vertexeng.in", payrollFrequency: "Monthly",
        previousInsurer: "Garuda General Insurance Co Ltd", currentBroker: "Coastline Risk Advisors LLP" },
      policyReq: { products: ["GMC", "GTL"], effectiveDate: asOf, duration: "12 months", policyType: "Portability",
        employerContribution: "Shared (Employer/Employee split)", splitPct: { employer: 75, employee: 25 }, coverageBasis: "Family Floater" },
      census: { fileName: "Vertex_Engineering_Census_Final.xlsx", uploadedAt: "2026-07-05", rows },
      censusValidation: validateCensus(rows, asOf, 18, 79, true),
      benefitGMC: { baseSumInsured: 500000, familyDefinition: "Employee, Spouse, 2 Children", roomRent: "Twin Sharing",
        copay: 10, deductible: 0, corporateBuffer: 2000000, maternity: true, pedWaived: true, dayCare: true, opd: false, dental: false, vision: false },
      benefitGTL: { coverType: "Salary Multiple", flatCover: null, salaryMultiple: 3, minimumCover: 500000, maximumCover: 3000000,
        terminalIllness: true, accidentalDeath: true, permanentDisability: false },
      prevInsurance: { currentInsurer: "Garuda General Insurance Co Ltd", policyNumber: "GGI/GMC/2025/88231",
        policyStart: "2025-09-01", policyEnd: "2026-08-31", livesCovered: 1080, premium: 18400000, claims: 13200000,
        majorClaims: "Two ongoing cardiac-surgery claims exceeding ₹10L each; one maternity complication claim.",
        reportFile: "Vertex_Claim_Experience_2025-26.pdf" },
      underwriting: null, quotes: [], selectedQuoteId: null, proposal: null, negotiation: null, approval: null, payment: null, issuance: null
    };
    kase.underwriting = {
      riskScore: 68, industryRiskClass: industry("MFG").risk, fclBreachIds: fclBreaches(kase),
      medicalFlags: [], decision: "Pending", decisionBy: null, decisionDate: null, requestInfoNote: "", loadingPct: 0, comments: ""
    };
    kase.underwriting.fclBreachIds = fclBreaches(kase);
    CASES.push(kase);
  }

  /* 5 — Crestline Retail: Underwriting — Red (FCL breach + High industry risk) */
  {
    const asOf = "2026-08-15";
    const rows = genCensus(5501, 310, { asOf, minAge: 19, maxAge: 58, withSalary: true, prefix: "CRL-" });
    const kase = {
      id: "EB-2026-0005", createdDate: "2026-06-18", stage: "Underwriting",
      salesExecutiveId: "U-SE-02", brokerId: null,
      lead: { companyName: "Crestline Retail Pvt Ltd", industry: "CONSTR", corporateSize: "201–1000",
        contactPerson: "Harish Bhatt", designation: "HR Manager", mobile: "9765432109", email: "harish.bhatt@crestlineretail.in",
        leadSource: "Cold Call", expectedEmployeeCount: 310, products: ["GTL"], createdDate: "2026-06-18", duplicateFlag: false },
      opportunity: { name: "Crestline Retail - GTL - 2026", salesOwnerId: "U-SE-02", expectedPremium: 2600000,
        expectedCloseDate: "2026-08-25", probability: 50, crmStage: "Quote", products: ["GTL"], notes: "Site workforce, high-value salary-multiple cover requested.", attachments: [] },
      employer: { legalName: "Crestline Retail Private Limited", tradeName: "Crestline Retail", pan: "AACCC4455N",
        gst: "06AACCC4455N1Z8", industry: "CONSTR", annualTurnover: 390000000, employeeCount: 310,
        officeLocations: ["Gurugram", "Faridabad"], hrContact: "Harish Bhatt / harish.bhatt@crestlineretail.in / 9765432109",
        financeContact: "", payrollFrequency: "Monthly", previousInsurer: "", currentBroker: "" },
      policyReq: { products: ["GTL"], effectiveDate: asOf, duration: "12 months", policyType: "Fresh",
        employerContribution: "100% Employer-funded", splitPct: null, coverageBasis: "Employee Only" },
      census: { fileName: "Crestline_Retail_Census.xlsx", uploadedAt: "2026-07-10", rows },
      censusValidation: validateCensus(rows, asOf, 18, 79, true),
      benefitGMC: null,
      benefitGTL: { coverType: "Salary Multiple", flatCover: null, salaryMultiple: 8, minimumCover: 500000, maximumCover: 8000000,
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

  /* 6 — Kavya FoodWorks: Quote Generated / Proposal Shared */
  {
    const asOf = "2026-07-25";
    const rows = genCensus(6601, 165, { asOf, minAge: 20, maxAge: 57, withSalary: false, prefix: "KFW-" });
    const kase = {
      id: "EB-2026-0006", createdDate: "2026-06-01", stage: "Proposal Shared",
      salesExecutiveId: "U-SE-01", brokerId: null,
      lead: { companyName: "Kavya FoodWorks Pvt Ltd", industry: "FOOD", corporateSize: "51–200",
        contactPerson: "Divya Menon", designation: "HR Lead", mobile: "9888776655", email: "divya.menon@kavyafoodworks.in",
        leadSource: "Event", expectedEmployeeCount: 165, products: ["GMC"], createdDate: "2026-06-01", duplicateFlag: false },
      opportunity: { name: "Kavya FoodWorks - GMC - 2026", salesOwnerId: "U-SE-01", expectedPremium: 1850000,
        expectedCloseDate: "2026-08-05", probability: 75, crmStage: "Negotiation", products: ["GMC"], notes: "", attachments: [] },
      employer: { legalName: "Kavya FoodWorks Private Limited", tradeName: "Kavya FoodWorks", pan: "AABCK2211P",
        gst: "29AABCK2211P1ZQ", industry: "FOOD", annualTurnover: 145000000, employeeCount: 165,
        officeLocations: ["Bengaluru"], hrContact: "Divya Menon / divya.menon@kavyafoodworks.in / 9888776655",
        financeContact: "Kirti Reddy / kirti.reddy@kavyafoodworks.in", payrollFrequency: "Monthly",
        previousInsurer: "", currentBroker: "" },
      policyReq: { products: ["GMC"], effectiveDate: asOf, duration: "12 months", policyType: "Fresh",
        employerContribution: "100% Employer-funded", splitPct: null, coverageBasis: "Family Floater" },
      census: { fileName: "Kavya_FoodWorks_Census.xlsx", uploadedAt: "2026-06-20", rows },
      censusValidation: validateCensus(rows, asOf, 18, 79, false),
      benefitGMC: { baseSumInsured: 300000, familyDefinition: "Employee, Spouse, 2 Children", roomRent: "Single Private AC",
        copay: 0, deductible: 0, corporateBuffer: 0, maternity: true, pedWaived: false, dayCare: true, opd: true, dental: false, vision: false },
      benefitGTL: null, prevInsurance: null, underwriting: null,
      quotes: [], selectedQuoteId: "A", proposal: null, negotiation: null, approval: null, payment: null, issuance: null
    };
    kase.underwriting = { riskScore: 34, industryRiskClass: industry("FOOD").risk, fclBreachIds: [], medicalFlags: [],
      decision: "Approve", decisionBy: "U-UW-01", decisionDate: "2026-07-08", requestInfoNote: "", loadingPct: 0, comments: "Clean group, standard terms." };
    kase.quotes = quoteOptions(kase);
    const premium = kase.quotes.find(q => q.id === "A").premium;
    const taxes = Math.round(premium * 0.18);
    kase.proposal = { premium, taxes, brokerage: 0, discountPct: 0, discount: 0,
      netPremium: premium + taxes, sentAt: "2026-07-12", sentTo: "Divya Menon (HR), no broker" };
    CASES.push(kase);
  }

  /* 7 — Aarav Pharma Industries: Negotiation — discount requested, needs Business Head */
  {
    const asOf = "2026-08-10";
    const rows = genCensus(7701, 1420, { asOf, minAge: 22, maxAge: 59, withSalary: true, prefix: "APH-" });
    const kase = {
      id: "EB-2026-0007", createdDate: "2026-05-05", stage: "Negotiation",
      salesExecutiveId: "U-SE-02", brokerId: "BRK-01",
      lead: { companyName: "Aarav Pharma Industries Ltd", industry: "PHARMA", corporateSize: "1000+",
        contactPerson: "Sanjay Reddy", designation: "CHRO", mobile: "9822334455", email: "sanjay.reddy@aaravpharma.in",
        leadSource: "Broker", expectedEmployeeCount: 1420, products: ["GMC", "GTL"], createdDate: "2026-05-05", duplicateFlag: false },
      opportunity: { name: "Aarav Pharma Industries - GMC/GTL - 2026", salesOwnerId: "U-SE-02", expectedPremium: 42000000,
        expectedCloseDate: "2026-08-30", probability: 70, crmStage: "Negotiation", products: ["GMC", "GTL"], notes: "", attachments: [] },
      employer: { legalName: "Aarav Pharma Industries Limited", tradeName: "Aarav Pharma", pan: "AACCA7766Q",
        gst: "24AACCA7766Q1Z1", industry: "PHARMA", annualTurnover: 2100000000, employeeCount: 1420,
        officeLocations: ["Ahmedabad", "Vadodara", "Indore"], hrContact: "Sanjay Reddy / sanjay.reddy@aaravpharma.in / 9822334455",
        financeContact: "Tanvi Iyer / tanvi.iyer@aaravpharma.in", payrollFrequency: "Monthly",
        previousInsurer: "", currentBroker: "Trinity Insurance Brokers Pvt Ltd" },
      policyReq: { products: ["GMC", "GTL"], effectiveDate: asOf, duration: "12 months", policyType: "Fresh",
        employerContribution: "100% Employer-funded", splitPct: null, coverageBasis: "Family Floater" },
      census: { fileName: "Aarav_Pharma_Census_Final.xlsx", uploadedAt: "2026-06-15", rows },
      censusValidation: validateCensus(rows, asOf, 18, 79, true),
      benefitGMC: { baseSumInsured: 1000000, familyDefinition: "Employee, Spouse, 2 Children", roomRent: "Single Private AC",
        copay: 0, deductible: 0, corporateBuffer: 5000000, maternity: true, pedWaived: true, dayCare: true, opd: true, dental: true, vision: false },
      benefitGTL: { coverType: "Flat Cover", flatCover: 1500000, salaryMultiple: null, minimumCover: 1500000, maximumCover: 1500000,
        terminalIllness: true, accidentalDeath: true, permanentDisability: true },
      prevInsurance: null, underwriting: null, quotes: [], selectedQuoteId: "A", proposal: null, approval: null, payment: null, issuance: null
    };
    kase.underwriting = { riskScore: 29, industryRiskClass: industry("PHARMA").risk, fclBreachIds: [], medicalFlags: [],
      decision: "Approve", decisionBy: "U-UW-01", decisionDate: "2026-06-25", requestInfoNote: "", loadingPct: 0, comments: "Approved at standard terms." };
    kase.quotes = quoteOptions(kase);
    const premium = kase.quotes.find(q => q.id === "A").premium;
    const taxes = Math.round(premium * 0.18);
    kase.proposal = { premium, taxes, brokerage: Math.round(premium * 0.03), discountPct: 0, discount: 0,
      netPremium: premium + taxes, sentAt: "2026-07-01", sentTo: "Sanjay Reddy (HR); Trinity Insurance Brokers" };
    kase.negotiation = {
      requests: [
        { type: "Discount Requested", detail: "HR has asked for a 7% discount citing a competing quote from another insurer.", date: "2026-07-08", by: "Corporate HR" },
        { type: "Benefit Changes", detail: "Requested OPD sub-limit increase from ₹15,000 to ₹25,000 per employee.", date: "2026-07-08", by: "Corporate HR" }
      ],
      salesComments: "Employer is price-sensitive but committed if we can land close to 7%. Recommend routing for Business Head approval rather than losing the case.",
      uwComments: "Benefit change (OPD limit) does not move risk beyond approved parameters — no UW re-referral needed.",
      financeComments: "", discountRequestedPct: 7, resubmitted: false
    };
    CASES.push(kase);
  }

  /* 8 — Silverline Freight Corp: Approval Workflow — Finance pending */
  {
    const asOf = "2026-07-28";
    const rows = genCensus(8801, 340, { asOf, minAge: 21, maxAge: 58, withSalary: false, prefix: "SLF-" });
    const kase = {
      id: "EB-2026-0008", createdDate: "2026-05-25", stage: "Negotiation",
      salesExecutiveId: "U-SE-01", brokerId: null,
      lead: { companyName: "Silverline Freight Corp", industry: "LOGISTICS", corporateSize: "201–1000",
        contactPerson: "Vivek Patel", designation: "HR Head", mobile: "9776655443", email: "vivek.patel@silverlinefreight.in",
        leadSource: "Referral", expectedEmployeeCount: 340, products: ["GMC"], createdDate: "2026-05-25", duplicateFlag: false },
      opportunity: { name: "Silverline Freight Corp - GMC - 2026", salesOwnerId: "U-SE-01", expectedPremium: 4100000,
        expectedCloseDate: "2026-08-01", probability: 85, crmStage: "Negotiation", products: ["GMC"], notes: "", attachments: [] },
      employer: { legalName: "Silverline Freight Corporation Pvt Ltd", tradeName: "Silverline Freight", pan: "AACCS3322R",
        gst: "27AACCS3322R1Z6", industry: "LOGISTICS", annualTurnover: 310000000, employeeCount: 340,
        officeLocations: ["Mumbai", "Nashik"], hrContact: "Vivek Patel / vivek.patel@silverlinefreight.in / 9776655443",
        financeContact: "Rekha Desai / rekha.desai@silverlinefreight.in", payrollFrequency: "Monthly",
        previousInsurer: "", currentBroker: "" },
      policyReq: { products: ["GMC"], effectiveDate: asOf, duration: "12 months", policyType: "Fresh",
        employerContribution: "100% Employer-funded", splitPct: null, coverageBasis: "Family Floater" },
      census: { fileName: "Silverline_Freight_Census.xlsx", uploadedAt: "2026-06-25", rows },
      censusValidation: validateCensus(rows, asOf, 18, 79, false),
      benefitGMC: { baseSumInsured: 500000, familyDefinition: "Employee, Spouse, 2 Children", roomRent: "Twin Sharing",
        copay: 0, deductible: 0, corporateBuffer: 0, maternity: false, pedWaived: true, dayCare: true, opd: false, dental: false, vision: false },
      benefitGTL: null, prevInsurance: null, underwriting: null, quotes: [], selectedQuoteId: "A", proposal: null, negotiation: null, payment: null, issuance: null
    };
    kase.underwriting = { riskScore: 22, industryRiskClass: industry("LOGISTICS").risk, fclBreachIds: [], medicalFlags: [],
      decision: "Approve", decisionBy: "U-UW-01", decisionDate: "2026-06-30", requestInfoNote: "", loadingPct: 0, comments: "Green — fast-track eligible." };
    kase.quotes = quoteOptions(kase);
    const premium = kase.quotes.find(q => q.id === "A").premium;
    const taxes = Math.round(premium * 0.18);
    kase.proposal = { premium, taxes, brokerage: 0, discountPct: 0, discount: 0, netPremium: premium + taxes,
      sentAt: "2026-07-03", sentTo: "Vivek Patel (HR)" };
    kase.negotiation = { requests: [], salesComments: "No changes requested — proceeding to approval as-is.", uwComments: "", financeComments: "", discountRequestedPct: 0, resubmitted: true };
    kase.approval = {
      steps: [
        { role: "Sales Manager", status: "Approved", by: "Karan Malhotra", date: "2026-07-14", comment: "Standard Green case, approved." },
        { role: "Underwriter", status: "Approved", by: "Priya Nair", date: "2026-07-15", comment: "Confirmed UW terms unchanged." },
        { role: "Finance", status: "Pending", by: null, date: null, comment: "" }
      ]
    };
    CASES.push(kase);
  }

  /* 9 — Zenith Manufacturing: Policy Issued (closed) */
  {
    const asOf = "2026-06-01";
    const rows = genCensus(9901, 1240, { asOf, minAge: 21, maxAge: 59, withSalary: true, prefix: "ZEN-" });
    const kase = {
      id: "EB-2026-0009", createdDate: "2026-04-02", stage: "Policy Issued",
      salesExecutiveId: "U-SE-02", brokerId: "BRK-02",
      lead: { companyName: "Zenith Manufacturing Ltd", industry: "MFG", corporateSize: "1000+",
        contactPerson: "Amitabh Singh", designation: "CHRO", mobile: "9700112244", email: "amitabh.singh@zenithmfg.in",
        leadSource: "Broker", expectedEmployeeCount: 1240, products: ["GMC", "GTL"], createdDate: "2026-04-02", duplicateFlag: false },
      opportunity: { name: "Zenith Manufacturing - GMC/GTL - 2026", salesOwnerId: "U-SE-02", expectedPremium: 23800000,
        expectedCloseDate: "2026-06-15", probability: 100, crmStage: "Closed Won", products: ["GMC", "GTL"], notes: "", attachments: [] },
      employer: { legalName: "Zenith Manufacturing Limited", tradeName: "Zenith Manufacturing", pan: "AACCZ1100S",
        gst: "24AACCZ1100S1Z9", industry: "MFG", annualTurnover: 3400000000, employeeCount: 1240,
        officeLocations: ["Vadodara", "Halol"], hrContact: "Amitabh Singh / amitabh.singh@zenithmfg.in / 9700112244",
        financeContact: "Nisha Kapoor / nisha.kapoor@zenithmfg.in", payrollFrequency: "Monthly",
        previousInsurer: "", currentBroker: "Coastline Risk Advisors LLP" },
      policyReq: { products: ["GMC", "GTL"], effectiveDate: asOf, duration: "12 months", policyType: "Fresh",
        employerContribution: "100% Employer-funded", splitPct: null, coverageBasis: "Family Floater" },
      census: { fileName: "Zenith_Manufacturing_Census.xlsx", uploadedAt: "2026-05-10", rows },
      censusValidation: validateCensus(rows, asOf, 18, 79, true),
      benefitGMC: { baseSumInsured: 500000, familyDefinition: "Employee, Spouse, 2 Children", roomRent: "Twin Sharing",
        copay: 0, deductible: 0, corporateBuffer: 3000000, maternity: true, pedWaived: true, dayCare: true, opd: false, dental: false, vision: false },
      benefitGTL: { coverType: "Salary Multiple", flatCover: null, salaryMultiple: 2, minimumCover: 500000, maximumCover: 3000000,
        terminalIllness: true, accidentalDeath: true, permanentDisability: false },
      prevInsurance: null, underwriting: null, quotes: [], selectedQuoteId: "A", proposal: null, negotiation: null, payment: null, issuance: null
    };
    kase.underwriting = { riskScore: 31, industryRiskClass: industry("MFG").risk, fclBreachIds: [], medicalFlags: [],
      decision: "Approve", decisionBy: "U-UW-01", decisionDate: "2026-05-16", requestInfoNote: "", loadingPct: 0, comments: "Approved, standard terms." };
    kase.quotes = quoteOptions(kase);
    const premium = kase.quotes.find(q => q.id === "A").premium;
    const taxes = Math.round(premium * 0.18);
    kase.proposal = { premium, taxes, brokerage: Math.round(premium * 0.025), discountPct: 3, discount: Math.round(premium * 0.03),
      netPremium: Math.round(premium * 0.97) + taxes, sentAt: "2026-05-20", sentTo: "Amitabh Singh (HR); Coastline Risk Advisors" };
    kase.negotiation = { requests: [{ type: "Discount Requested", detail: "3% loyalty discount requested for multi-year relationship.", date: "2026-05-22", by: "Corporate HR" }],
      salesComments: "Long-standing relationship; discount within Sales Manager delegated authority.", uwComments: "", financeComments: "Approved — within margin.", discountRequestedPct: 3, resubmitted: true };
    kase.approval = { steps: [
      { role: "Sales Manager", status: "Approved", by: "Karan Malhotra", date: "2026-05-24", comment: "Within delegated authority." },
      { role: "Underwriter", status: "Approved", by: "Priya Nair", date: "2026-05-25", comment: "No change to risk." },
      { role: "Finance", status: "Approved", by: "Sunita Agarwal", date: "2026-05-26", comment: "Reconciled against target margin." }
    ] };
    const total = kase.proposal.netPremium;
    kase.payment = { invoiceNo: "INV-2026-0091", premium: kase.proposal.netPremium - Math.round(kase.proposal.netPremium * 0.18 / 1.18),
      gst: Math.round(kase.proposal.netPremium * 0.18 / 1.18), total, mode: "NEFT", txnNumber: "NEFT2026052900231",
      proofFile: "Zenith_Payment_Proof.pdf", status: "Received", submittedAt: "2026-05-29", reconciledAt: "2026-05-30" };
    kase.issuance = { policyNumber: "PA/EB/2026/004120", startDate: asOf, endDate: "2027-05-31", products: ["GMC", "GTL"],
      premium: kase.proposal.netPremium, livesCovered: kase.censusValidation.accepted, issuedAt: "2026-06-01",
      documents: ["Policy Schedule", "Tax Invoice", "Employee Certificates (bulk)"], welcomeKitSent: true, finished: true };
    CASES.push(kase);
  }

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
    { company: "Trident Hospitality Group", product: "GMC", premium: 6800000, expiry: addDays(TODAY, 42), owner: "U-SE-01" },
    { company: "Orion Data Systems Pvt Ltd", product: "GMC + GTL", premium: 11400000, expiry: addDays(TODAY, 68), owner: "U-SE-02" },
    { company: "Falcon Steel Industries", product: "GTL", premium: 3150000, expiry: addDays(TODAY, 84), owner: "U-SE-01" }
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
      calcGMCPremium, calcGTLPremium, basePremium, quoteOptions, approvalRoute, genCensus, addDays
    },
    pushNotif
  };
})();
