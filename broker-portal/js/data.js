/* ============================================================
   Albright & Hayes — demo data layer
   All dates are generated relative to "today" so the renewal
   pipeline, invoices and claims always look current.
   ============================================================ */
(function () {
  const DAY = 86400000;
  const inDays = n => new Date(Date.now() + n * DAY);

  /* ---------- Markets ---------- */
  const MARKETS = {
    UK: "UK Insurer",
    LLOYDS: "Lloyd's Market",
    RI: "Reinsurance"
  };

  const UK_INSURERS = ["Aviva", "AXA UK", "RSA", "Zurich UK", "Allianz UK", "Direct Line Group", "LV= General Insurance", "Hiscox UK", "AXA Health", "Allianz Care"];
  const SYNDICATES = [
    { name: "Beazley", num: "2623" }, { name: "Hiscox", num: "33" }, { name: "Brit", num: "2987" },
    { name: "Atrium", num: "609" }, { name: "Tokio Marine Kiln", num: "510" }, { name: "MS Amlin", num: "2001" }, { name: "Chaucer", num: "1084" }
  ];
  const REINSURERS = ["Swiss Re", "Munich Re", "Hannover Re", "SCOR"];

  const PRODUCTS = {
    Motor:   { code: "MTR", line: "Motor",  rate: 0.011,  ipt: 0.12 },
    Home:    { code: "HME", line: "Home",   rate: 0.0032, ipt: 0.12 },
    Health:  { code: "HLT", line: "Health", rate: 0.04,   ipt: 0.12 },
    "Commercial Property": { code: "CPR", line: "Specialty", rate: 0.0022, ipt: 0.12 },
    Liability: { code: "LIA", line: "Specialty", rate: 0.004, ipt: 0.12 },
    "Marine Hull":  { code: "MAR", line: "Specialty", rate: 0.009, ipt: 0 },
    "Marine Cargo": { code: "MAR", line: "Specialty", rate: 0.0045, ipt: 0 },
    "Professional Indemnity": { code: "PIN", line: "Specialty", rate: 0.006, ipt: 0.12 },
    Energy:  { code: "ENG", line: "Specialty", rate: 0.012, ipt: 0.12 },
    Cyber:   { code: "CYB", line: "Specialty", rate: 0.005, ipt: 0.12 },
    Travel:  { code: "TRV", line: "Travel", rate: 0.002,  ipt: 0.20 },
    "Reinsurance Treaty": { code: "RIT", line: "Reinsurance", rate: 0, ipt: 0 },
    "Reinsurance XoL":    { code: "RIX", line: "Reinsurance", rate: 0, ipt: 0 },
    "Reinsurance Facultative": { code: "RIF", line: "Reinsurance", rate: 0, ipt: 0 }
  };

  /* ---------- Clients ---------- */
  const clients = [
    { id: "C001", name: "Margot Lefèvre",              type: "Individual", segment: "Standard",   city: "Lyon",       country: "France",         cc: "FR", region: "EU", email: "m.lefevre@orange.fr",          phone: "+33 6 71 44 20 18", since: 2019, exec: "Priya Nair" },
    { id: "C002", name: "Hugo van der Berg",           type: "Individual", segment: "Standard",   city: "Amsterdam",  country: "Netherlands",    cc: "NL", region: "EU", email: "hugo.vdberg@ziggo.nl",          phone: "+31 6 2344 8812",  since: 2021, exec: "Sofia Keller" },
    { id: "C003", name: "Aidan O'Connor",              type: "Individual", segment: "Standard",   city: "Dublin",     country: "Ireland",        cc: "IE", region: "EU", email: "aidan.oconnor@eircom.ie",       phone: "+353 87 220 4471", since: 2018, exec: "Priya Nair" },
    { id: "C004", name: "Eleanor Pemberton",           type: "Individual", segment: "Standard",   city: "London",     country: "United Kingdom", cc: "GB", region: "UK", email: "e.pemberton@btinternet.com",    phone: "+44 7911 284 550", since: 2016, exec: "Eleanor Whitcombe" },
    { id: "C005", name: "Rajesh Patel",                type: "Individual", segment: "Standard",   city: "Leicester",  country: "United Kingdom", cc: "GB", region: "UK", email: "rajesh.patel@gmail.com",        phone: "+44 7700 900 331", since: 2020, exec: "James Ashworth" },
    { id: "C006", name: "Whitfield Logistics Ltd",     type: "Corporate",  segment: "Key Client", city: "Manchester", country: "United Kingdom", cc: "GB", region: "UK", email: "risk@whitfieldlogistics.co.uk", phone: "+44 161 496 0122", since: 2014, exec: "Eleanor Whitcombe" },
    { id: "C007", name: "Thames & Crown Hotels Group", type: "Corporate",  segment: "Key Client", city: "London",     country: "United Kingdom", cc: "GB", region: "UK", email: "insurance@thamescrown.com",     phone: "+44 20 7946 0810", since: 2012, exec: "Eleanor Whitcombe" },
    { id: "C008", name: "NordSee Shipping GmbH",       type: "Corporate",  segment: "Key Client", city: "Hamburg",    country: "Germany",        cc: "DE", region: "EU", email: "versicherung@nordsee-shipping.de", phone: "+49 40 3286 4410", since: 2017, exec: "Sofia Keller" },
    { id: "C009", name: "Caledonia Renewables plc",    type: "Corporate",  segment: "Key Client", city: "Edinburgh",  country: "United Kingdom", cc: "GB", region: "UK", email: "insurance@caledoniarenewables.com", phone: "+44 131 496 0770", since: 2019, exec: "James Ashworth" },
    { id: "C010", name: "Beaumont & Associés SARL",    type: "Corporate",  segment: "Standard",   city: "Paris",      country: "France",         cc: "FR", region: "EU", email: "contact@beaumont-associes.fr",  phone: "+33 1 42 68 53 00", since: 2022, exec: "Sofia Keller" },
    { id: "C011", name: "Sofia Marchetti",             type: "Individual", segment: "Standard",   city: "Milan",      country: "Italy",          cc: "IT", region: "EU", email: "sofia.marchetti@libero.it",     phone: "+39 347 118 2204", since: 2023, exec: "Priya Nair" },
    { id: "C012", name: "Harrington Estates Ltd",      type: "Corporate",  segment: "Standard",   city: "York",       country: "United Kingdom", cc: "GB", region: "UK", email: "office@harringtonestates.co.uk", phone: "+44 1904 610 442", since: 2015, exec: "James Ashworth" },
    { id: "C013", name: "Iberia Cargo SA",             type: "Corporate",  segment: "Standard",   city: "Madrid",     country: "Spain",          cc: "ES", region: "EU", email: "seguros@iberiacargo.es",        phone: "+34 91 559 2280",  since: 2021, exec: "Sofia Keller" },
    { id: "C014", name: "Mutual Provident of Ireland", type: "Corporate",  segment: "Cedant",     city: "Dublin",     country: "Ireland",        cc: "IE", region: "EU", email: "reinsurance@mutualprovident.ie", phone: "+353 1 872 6600", since: 2016, exec: "Eleanor Whitcombe" },
    { id: "C015", name: "Alpenland Krankenversicherung AG", type: "Corporate", segment: "Cedant", city: "Vienna",     country: "Austria",        cc: "AT", region: "EU", email: "rueck@alpenland-kv.at",         phone: "+43 1 512 4470",   since: 2020, exec: "James Ashworth" }
  ];

  /* ---------- Policies ----------
     expiryIn: days from today · termDays: policy period length
     renewal: { status, premium } appears once expiry is inside the pipeline window */
  function pol(o) {
    const term = o.termDays || 365;
    const expiry = inDays(o.expiryIn);
    const inception = new Date(expiry.getTime() - term * DAY);
    return Object.assign({ status: "In Force", termDays: term, expiry, inception, iptRate: PRODUCTS[o.product].ipt, line: PRODUCTS[o.product].line }, o);
  }

  const policies = [
    // ----- Renewal pipeline (matches the reference dashboard) -----
    pol({ id: "ALB-HME-2025-1102", clientId: "C001", product: "Home",   market: MARKETS.UK, insurer: "AXA UK",            expiryIn: 3,  premium: 840,   sumInsured: 260000,  commission: 0.15, renewal: { status: "Quote ready",    premium: 885 } }),
    pol({ id: "ALB-HME-2025-8422", clientId: "C002", product: "Home",   market: MARKETS.UK, insurer: "Aviva",             expiryIn: 7,  premium: 1250,  sumInsured: 390000,  commission: 0.15, renewal: { status: "Awaiting client", premium: 1100 } }),
    pol({ id: "ALB-HLT-2025-0041", clientId: "C003", product: "Health", market: MARKETS.UK, insurer: "AXA Health",        expiryIn: 12, premium: 3400,  sumInsured: 85000,   commission: 0.10, renewal: { status: "Auto-renew",     premium: 3570 } }),
    pol({ id: "ALB-HME-2025-5519", clientId: "C004", product: "Home",   market: MARKETS.UK, insurer: "RSA",               expiryIn: 15, premium: 1120,  sumInsured: 350000,  commission: 0.15, renewal: { status: "Re-marketing",   premium: 1450 } }),
    pol({ id: "ALB-MTR-2025-3391", clientId: "C005", product: "Motor",  market: MARKETS.UK, insurer: "Direct Line Group", expiryIn: 21, premium: 680,   sumInsured: 24000,   commission: 0.125, renewal: { status: "Quote ready",   premium: 710 } }),
    pol({ id: "ALB-PIN-2025-0402", clientId: "C010", product: "Professional Indemnity", market: MARKETS.LLOYDS, insurer: "Tokio Marine Kiln", syndicate: "510", umr: "B0713AH2500402", lead: "Tokio Marine Kiln 510 (100%)", expiryIn: 27, premium: 15800, sumInsured: 2000000, commission: 0.20, renewal: { status: "Quote ready", premium: 17050 }, note: "Written via Lloyd's Insurance Company SA (Brussels) for EEA risk." }),

    // ----- 31–90 day window -----
    pol({ id: "ALB-MTR-2026-0187", clientId: "C006", product: "Motor",  market: MARKETS.UK, insurer: "Zurich UK",  expiryIn: 38, premium: 48500, sumInsured: 2100000, commission: 0.175, renewal: { status: "Quote ready", premium: 52300 }, desc: "Fleet — 42 vehicles" }),
    pol({ id: "ALB-CPR-2026-0295", clientId: "C007", product: "Commercial Property", market: MARKETS.LLOYDS, insurer: "Hiscox", syndicate: "33", umr: "B0713AH2600295", lead: "Hiscox 33 (65%), Chaucer 1084 (35%)", expiryIn: 55, premium: 64000, sumInsured: 48000000, commission: 0.20, renewal: { status: "Awaiting client", premium: 68480 }, desc: "Hotel portfolio — 9 properties" }),
    pol({ id: "ALB-MAR-2026-0501", clientId: "C013", product: "Marine Cargo", market: MARKETS.LLOYDS, insurer: "Brit", syndicate: "2987", umr: "B0713AH2600501", lead: "Brit 2987 (55%), MS Amlin 2001 (45%)", expiryIn: 64, premium: 38400, sumInsured: 12500000, commission: 0.20, renewal: { status: "Awaiting client", premium: 40320 }, desc: "Open cover — European routes" }),
    pol({ id: "ALB-MAR-2026-0310", clientId: "C008", product: "Marine Hull", market: MARKETS.LLOYDS, insurer: "Atrium", syndicate: "609", umr: "B0713AH2600310", lead: "Atrium 609 (60%), Beazley 2623 (40%)", expiryIn: 83, premium: 86500, sumInsured: 9600000, commission: 0.20, renewal: { status: "Re-marketing", premium: 97745 }, desc: "MV Nordwind & MV Ostsee" }),

    // ----- Longer-dated live book -----
    pol({ id: "ALB-HME-2026-0458", clientId: "C012", product: "Commercial Property", market: MARKETS.UK, insurer: "Aviva", expiryIn: 96,  premium: 8900,  sumInsured: 4000000, commission: 0.175, desc: "Property owners — 14 lets" }),
    pol({ id: "ALB-MTR-2026-0470", clientId: "C012", product: "Motor",  market: MARKETS.UK, insurer: "LV= General Insurance", expiryIn: 96,  premium: 3150, sumInsured: 145000, commission: 0.125 }),
    pol({ id: "ALB-LIA-2026-0368", clientId: "C009", product: "Liability", market: MARKETS.UK, insurer: "Zurich UK", expiryIn: 118, premium: 22600, sumInsured: 10000000, commission: 0.175, desc: "Environmental & public liability" }),
    pol({ id: "ALB-MAR-2025-0329", clientId: "C008", product: "Marine Cargo", market: MARKETS.LLOYDS, insurer: "MS Amlin", syndicate: "2001", umr: "B0713AH2500329", lead: "MS Amlin 2001 (100%)", expiryIn: 142, premium: 42300, sumInsured: 8000000, commission: 0.20 }),
    pol({ id: "ALB-MTR-2026-0523", clientId: "C001", product: "Motor",  market: MARKETS.UK, insurer: "AXA UK", expiryIn: 156, premium: 610, sumInsured: 19000, commission: 0.125 }),
    pol({ id: "ALB-HLT-2026-0419", clientId: "C011", product: "Health", market: MARKETS.UK, insurer: "Allianz Care", expiryIn: 171, premium: 2150, sumInsured: 60000, commission: 0.10 }),
    pol({ id: "ALB-ENG-2026-0355", clientId: "C009", product: "Energy", market: MARKETS.LLOYDS, insurer: "Beazley", syndicate: "2623", umr: "B0713AH2600355", lead: "Beazley 2623 (50%), Atrium 609 (30%), Brit 2987 (20%)", expiryIn: 196, premium: 128000, sumInsured: 96000000, commission: 0.20, desc: "Offshore wind — construction all risks" }),
    pol({ id: "ALB-CPR-2026-0221", clientId: "C006", product: "Commercial Property", market: MARKETS.UK, insurer: "Aviva", expiryIn: 204, premium: 12400, sumInsured: 7800000, commission: 0.175, desc: "Warehouses — Manchester & Leeds" }),
    pol({ id: "ALB-HME-2026-0431", clientId: "C011", product: "Home",   market: MARKETS.UK, insurer: "Zurich UK", expiryIn: 233, premium: 980, sumInsured: 310000, commission: 0.15 }),
    pol({ id: "ALB-CYB-2026-0544", clientId: "C006", product: "Cyber",  market: MARKETS.LLOYDS, insurer: "Beazley", syndicate: "2623", umr: "B0713AH2600544", lead: "Beazley 2623 (100%)", expiryIn: 363, premium: 9600, sumInsured: 2000000, commission: 0.225, status: "Pending", desc: "Bound — awaiting signed slip" }),
    pol({ id: "ALB-LIA-2026-0244", clientId: "C007", product: "Liability", market: MARKETS.UK, insurer: "Allianz UK", expiryIn: 262, premium: 18750, sumInsured: 15000000, commission: 0.175, desc: "Employers' & public liability" }),
    pol({ id: "ALB-MTR-2026-0512", clientId: "C004", product: "Motor",  market: MARKETS.UK, insurer: "Aviva", expiryIn: 289, premium: 540, sumInsured: 16500, commission: 0.125 }),
    pol({ id: "ALB-TRV-2026-0551", clientId: "C002", product: "Travel", market: MARKETS.UK, insurer: "Allianz UK", expiryIn: 302, premium: 185, sumInsured: 10000, commission: 0.15, status: "Pending", desc: "Annual multi-trip" }),
    pol({ id: "ALB-HLT-2026-0530", clientId: "C007", product: "Health", market: MARKETS.UK, insurer: "AXA Health", expiryIn: 321, premium: 27400, sumInsured: 0, commission: 0.10, desc: "Group scheme — 118 employees" }),

    // ----- Reinsurance -----
    pol({ id: "ALB-RIT-2026-0012", clientId: "C014", product: "Reinsurance Treaty", market: MARKETS.RI, insurer: "Swiss Re", expiryIn: 175, termDays: 365, premium: 240000, sumInsured: 0, commission: 0.025,
          treaty: { type: "Quota Share — Property", detail: "25% cession · Estimated ceded premium £240,000", cedant: "Mutual Provident of Ireland", panel: "Swiss Re (100%)" } }),
    pol({ id: "ALB-RIX-2026-0013", clientId: "C014", product: "Reinsurance XoL", market: MARKETS.RI, insurer: "Munich Re", expiryIn: 175, termDays: 365, premium: 96000, sumInsured: 5000000, commission: 0.025,
          treaty: { type: "Property Catastrophe XoL", detail: "Layer 1 — £5,000,000 xs £1,000,000", cedant: "Mutual Provident of Ireland", panel: "Munich Re (60%), Hannover Re (40%)" } }),
    pol({ id: "ALB-RIF-2026-0021", clientId: "C015", product: "Reinsurance Facultative", market: MARKETS.RI, insurer: "SCOR", expiryIn: 112, termDays: 365, premium: 54000, sumInsured: 3000000, commission: 0.025,
          treaty: { type: "Facultative — Group Health", detail: "Surplus cover on group health portfolio", cedant: "Alpenland Krankenversicherung AG", panel: "SCOR (100%)" } }),
    pol({ id: "ALB-RIX-2026-0027", clientId: "C015", product: "Reinsurance XoL", market: MARKETS.RI, insurer: "Swiss Re", expiryIn: 112, termDays: 365, premium: 38500, sumInsured: 2000000, commission: 0.025,
          treaty: { type: "Health Excess of Loss", detail: "£2,000,000 xs £500,000 per life", cedant: "Alpenland Krankenversicherung AG", panel: "Swiss Re (100%)" } }),

    // ----- Recently ended -----
    pol({ id: "ALB-PIN-2025-0389", clientId: "C010", product: "Professional Indemnity", market: MARKETS.UK, insurer: "Hiscox UK", expiryIn: -12, premium: 4800, sumInsured: 1000000, commission: 0.175, status: "Lapsed" }),
    pol({ id: "ALB-HME-2025-0233", clientId: "C005", product: "Home", market: MARKETS.UK, insurer: "RSA", expiryIn: -45, premium: 760, sumInsured: 240000, commission: 0.15, status: "Cancelled" })
  ];

  /* ---------- Quotes ---------- */
  function q(o) { return Object.assign({ created: inDays(o.createdIn), validUntil: inDays(o.createdIn + 30) }, o); }
  const quotes = [
    q({ id: "ALB-Q-2026-0096", clientId: "C009", product: "Energy", market: MARKETS.LLOYDS, insurer: "Beazley 2623", premium: 96000, status: "Presented", createdIn: -3,  desc: "Construction all risks — Phase 2 array" }),
    q({ id: "ALB-Q-2026-0095", clientId: "C008", product: "Marine Hull", market: MARKETS.LLOYDS, insurer: "Atrium 609", premium: 14200, status: "Awaiting Client", createdIn: -5, desc: "War risks extension — Red Sea routing" }),
    q({ id: "ALB-Q-2026-0094", clientId: "C011", product: "Travel", market: MARKETS.UK, insurer: "Allianz UK", premium: 240, status: "Draft", createdIn: -6, desc: "Annual multi-trip — worldwide" }),
    q({ id: "ALB-Q-2026-0093", clientId: "C013", product: "Marine Cargo", market: MARKETS.LLOYDS, insurer: "Brit 2987", premium: 6800, status: "Presented", createdIn: -8, desc: "Single voyage — project cargo to Rotterdam" }),
    q({ id: "ALB-Q-2026-0092", clientId: "C001", product: "Home", market: MARKETS.UK, insurer: "AXA UK", premium: 885, status: "Awaiting Client", createdIn: -9, desc: "Renewal terms — ALB-HME-2025-1102" }),
    q({ id: "ALB-Q-2026-0091", clientId: "C012", product: "Commercial Property", market: MARKETS.UK, insurer: "Aviva", premium: 2400, status: "Draft", createdIn: -11, desc: "Portfolio extension — 3 new lets" }),
    q({ id: "ALB-Q-2026-0090", clientId: "C007", product: "Commercial Property", market: MARKETS.LLOYDS, insurer: "Chaucer 1084", premium: 21500, status: "Presented", createdIn: -13, desc: "Terrorism cover — hotel portfolio" }),
    q({ id: "ALB-Q-2026-0089", clientId: "C015", product: "Reinsurance XoL", market: MARKETS.RI, insurer: "Swiss Re", premium: 41200, status: "Draft", createdIn: -15, desc: "Aggregate XoL renewal indication" }),
    q({ id: "ALB-Q-2026-0088", clientId: "C004", product: "Motor", market: MARKETS.UK, insurer: "Aviva", premium: 480, status: "Bound", createdIn: -19, desc: "Second vehicle — bound as ALB-MTR-2026-0512" }),
    q({ id: "ALB-Q-2026-0087", clientId: "C010", product: "Cyber", market: MARKETS.UK, insurer: "Hiscox UK", premium: 5200, status: "Declined", createdIn: -24, desc: "Client declined — budget" }),
    q({ id: "ALB-Q-2026-0086", clientId: "C006", product: "Cyber", market: MARKETS.LLOYDS, insurer: "Beazley 2623", premium: 9600, status: "Bound", createdIn: -28, desc: "Bound as ALB-CYB-2026-0544" })
  ];

  /* ---------- Claims ---------- */
  function cl(o) { return Object.assign({ lossDate: inDays(o.lossIn), reported: inDays(o.lossIn + (o.reportLag || 1)) }, o); }
  const claims = [
    cl({ id: "ALB-CLM-2026-0141", policyId: "ALB-MTR-2026-0187", clientId: "C006", peril: "Collision", status: "Open", reserve: 8400, paid: 0, excess: 500, adjuster: "Crawford & Company", lossIn: -6,
         desc: "Fleet vehicle WX18 KLM collision on M62 J24. Third-party claim expected.",
         timeline: [[-6, "FNOL received", "Reported by fleet manager via portal"], [-5, "Claim acknowledged", "Insurer reference ZU-88412 issued"], [-3, "Adjuster appointed", "Crawford & Company instructed"]] }),
    cl({ id: "ALB-CLM-2026-0138", policyId: "ALB-CPR-2026-0295", clientId: "C007", peril: "Escape of water", status: "Under Review", reserve: 42000, paid: 0, excess: 2500, adjuster: "Sedgwick", lossIn: -14,
         desc: "Burst riser main, floors 3–5, Kensington property. Business interruption element under assessment.",
         timeline: [[-14, "FNOL received", ""], [-12, "Adjuster appointed", "Sedgwick — major loss team"], [-7, "Reserve set", "£42,000 including BI estimate"], [-2, "Documents requested", "Awaiting repair quotations"]] }),
    cl({ id: "ALB-CLM-2026-0135", policyId: "ALB-MAR-2026-0310", clientId: "C008", peril: "Heavy weather", status: "Open", reserve: 128000, paid: 0, excess: 25000, adjuster: "Charles Taylor Adjusting", lossIn: -21,
         desc: "MV Nordwind — deck cargo and hatch cover damage, North Sea storm. Lloyd's lead notified.",
         timeline: [[-21, "FNOL received", ""], [-20, "Lead syndicate notified", "Atrium 609 via ECF"], [-16, "Surveyor appointed", "Charles Taylor — Hamburg office"], [-4, "Interim report", "Repair estimate €142,000 pending"]] }),
    cl({ id: "ALB-CLM-2026-0129", policyId: "ALB-MTR-2025-3391", clientId: "C005", peril: "Windscreen", status: "Settled", reserve: 320, paid: 320, excess: 75, adjuster: "—", lossIn: -34,
         desc: "Windscreen chip repair — approved supplier network.",
         timeline: [[-34, "FNOL received", ""], [-33, "Approved repairer booked", ""], [-28, "Settled", "£320 paid to Autoglass"]] }),
    cl({ id: "ALB-CLM-2026-0126", policyId: "ALB-MTR-2025-3391", clientId: "C005", peril: "Theft", status: "Approved", reserve: 9800, paid: 0, excess: 250, adjuster: "Davies Group", lossIn: -41,
         desc: "Vehicle stolen from driveway, recovered burnt out. Total loss agreed.",
         timeline: [[-41, "FNOL received", ""], [-38, "Police report received", "Crime ref 44/8812/26"], [-20, "Total loss agreed", "PAV £9,800 less excess"], [-6, "Approved", "Awaiting payment run"]] }),
    cl({ id: "ALB-CLM-2026-0122", policyId: "ALB-HME-2025-5519", clientId: "C004", peril: "Storm", status: "Settled", reserve: 4150, paid: 4150, excess: 350, adjuster: "—", lossIn: -60,
         desc: "Storm Kathleen — ridge tiles and chimney flashing.",
         timeline: [[-60, "FNOL received", ""], [-52, "Estimate approved", ""], [-38, "Settled", "£4,150 paid to client"]] }),
    cl({ id: "ALB-CLM-2026-0119", policyId: "ALB-HLT-2026-0419", clientId: "C011", peril: "Outpatient treatment", status: "Settled", reserve: 860, paid: 860, excess: 0, adjuster: "—", lossIn: -68,
         desc: "Diagnostics and physiotherapy — pre-authorised.",
         timeline: [[-68, "Claim submitted", ""], [-61, "Settled", "Paid direct to provider"]] }),
    cl({ id: "ALB-CLM-2026-0117", policyId: "ALB-HME-2026-0458", clientId: "C012", peril: "Fire", status: "Under Review", reserve: 26500, paid: 5000, excess: 1000, adjuster: "QuestGates", lossIn: -75,
         desc: "Kitchen fire in tenanted property, Micklegate. Interim payment made.",
         timeline: [[-75, "FNOL received", ""], [-70, "Adjuster appointed", "QuestGates"], [-44, "Interim payment", "£5,000 emergency works"], [-10, "Final schedule under review", ""]] }),
    cl({ id: "ALB-CLM-2026-0112", policyId: "ALB-PIN-2025-0402", clientId: "C010", peril: "Professional negligence", status: "Open", reserve: 75000, paid: 0, excess: 10000, adjuster: "Clyde & Co (panel)", lossIn: -90,
         desc: "Claim notification — alleged design fault in structural survey. Circumstances notified to syndicate.",
         timeline: [[-90, "Circumstance notified", ""], [-84, "Panel counsel instructed", "Clyde & Co"], [-30, "Reserve set", "£75,000"], [-8, "Mediation proposed", ""]] }),
    cl({ id: "ALB-CLM-2026-0108", policyId: "ALB-HLT-2025-0041", clientId: "C003", peril: "Inpatient treatment", status: "Declined", reserve: 0, paid: 0, excess: 0, adjuster: "—", lossIn: -104,
         desc: "Pre-existing condition exclusion applied. Client advised of appeal route.",
         timeline: [[-104, "Claim submitted", ""], [-92, "Declined", "Exclusion 4(b) — pre-existing condition"]] }),
    cl({ id: "ALB-CLM-2026-0104", policyId: "ALB-ENG-2026-0355", clientId: "C009", peril: "Cable damage", status: "Settled", reserve: 64000, paid: 64000, excess: 15000, adjuster: "McLarens", lossIn: -118,
         desc: "Export cable damaged during trenching — Firth of Forth array.",
         timeline: [[-118, "FNOL received", ""], [-110, "Lead syndicate agreed reserve", ""], [-51, "Settled", "£64,000 net of excess"]] })
  ];

  /* ---------- Invoices ---------- */
  function inv(o) { return Object.assign({ issued: inDays(o.dueIn - 30), due: inDays(o.dueIn) }, o); }
  const invoices = [
    inv({ id: "ALB-INV-2026-0644", policyId: "ALB-CYB-2026-0544", clientId: "C006", descr: "Cyber — new business premium",        amount: 10752, dueIn: 18,  status: "Unpaid" }),
    inv({ id: "ALB-INV-2026-0641", policyId: "ALB-HLT-2026-0530", clientId: "C007", descr: "Group health — instalment 3 of 4",    amount: 7672,  dueIn: 9,   status: "Unpaid" }),
    inv({ id: "ALB-INV-2026-0640", policyId: "ALB-TRV-2026-0551", clientId: "C002", descr: "Annual travel premium",               amount: 222,   dueIn: 6,   status: "Unpaid" }),
    inv({ id: "ALB-INV-2026-0637", policyId: "ALB-MAR-2026-0310", clientId: "C008", descr: "Marine hull — instalment 2 of 2",     amount: 43250, dueIn: -4,  status: "Unpaid" }),
    inv({ id: "ALB-INV-2026-0633", policyId: "ALB-HME-2025-5519", clientId: "C004", descr: "Home renewal deposit",                amount: 560,   dueIn: -9,  status: "Unpaid" }),
    inv({ id: "ALB-INV-2026-0629", policyId: "ALB-MTR-2026-0187", clientId: "C006", descr: "Fleet motor — instalment 4 of 4",     amount: 13580, dueIn: -2,  status: "Part-paid", paidAmount: 6790 }),
    inv({ id: "ALB-INV-2026-0625", policyId: "ALB-RIF-2026-0021", clientId: "C015", descr: "Facultative premium — Q3 bordereau",  amount: 13500, dueIn: 14,  status: "Unpaid" }),
    inv({ id: "ALB-INV-2026-0621", policyId: "ALB-ENG-2026-0355", clientId: "C009", descr: "Energy CAR — instalment 2 of 4",      amount: 35840, dueIn: -1,  status: "Paid", paidOn: inDays(-3), method: "BACS" }),
    inv({ id: "ALB-INV-2026-0618", policyId: "ALB-CPR-2026-0295", clientId: "C007", descr: "Property — instalment 3 of 4",        amount: 17920, dueIn: -12, status: "Paid", paidOn: inDays(-13), method: "Direct Debit" }),
    inv({ id: "ALB-INV-2026-0614", policyId: "ALB-LIA-2026-0368", clientId: "C009", descr: "Liability annual premium",            amount: 25312, dueIn: -19, status: "Paid", paidOn: inDays(-21), method: "BACS" }),
    inv({ id: "ALB-INV-2026-0610", policyId: "ALB-RIT-2026-0012", clientId: "C014", descr: "Treaty premium — Q2 settlement",      amount: 60000, dueIn: -24, status: "Paid", paidOn: inDays(-26), method: "SWIFT" }),
    inv({ id: "ALB-INV-2026-0606", policyId: "ALB-HLT-2025-0041", clientId: "C003", descr: "Health annual premium",               amount: 3808,  dueIn: -31, status: "Paid", paidOn: inDays(-33), method: "Card" }),
    inv({ id: "ALB-INV-2026-0601", policyId: "ALB-MAR-2026-0501", clientId: "C013", descr: "Cargo open cover — Q2 adjustment",    amount: 9600,  dueIn: -38, status: "Paid", paidOn: inDays(-36), method: "SWIFT" }),
    inv({ id: "ALB-INV-2026-0597", policyId: "ALB-MTR-2026-0512", clientId: "C004", descr: "Motor annual premium",                amount: 605,   dueIn: -44, status: "Paid", paidOn: inDays(-45), method: "Direct Debit" })
  ];

  /* ---------- Book-level stats (whole book — the tables above are the working sample) ---------- */
  const bookStats = {
    activePolicies: { value: 1284, delta: 2.4 },
    gwpMtd:         { value: 284500, delta: 12.1 },
    commissionMtd:  { value: 34140, delta: 8.5 },
    renewals30:     { value: 142, delta: null },
    outstanding:    { value: 18250, delta: -4.2 },
    newQuotes:      { value: 38, delta: 15.0 },
    portfolio: [
      { name: "Motor",  count: 845, gwp: 1840000, share: 42, color: "var(--s1)", icon: "motor" },
      { name: "Home",   count: 312, gwp: 1420000, share: 32, color: "var(--s2)", icon: "home" },
      { name: "Health", count: 127, gwp: 1140000, share: 26, color: "var(--s3)", icon: "health" }
    ],
    geo: { uk: 82, eu: 18 },
    marketSplit: [
      { name: "UK Insurers", share: 61, gwp: 3320000, color: "var(--s1)" },
      { name: "Lloyd's Market", share: 27, gwp: 1470000, color: "var(--s2)" },
      { name: "Reinsurance", share: 12, gwp: 650000, color: "var(--s4)" }
    ],
    gwpByLine: [
      { name: "Motor", gwp: 1840000, color: "var(--s1)" },
      { name: "Home", gwp: 1420000, color: "var(--s2)" },
      { name: "Health", gwp: 1140000, color: "var(--s3)" },
      { name: "Marine & Specialty", gwp: 986000, color: "var(--s4)" },
      { name: "Reinsurance", gwp: 648000, color: "var(--s5)" }
    ],
    // trailing 12 months GWP written (£)
    gwpTrend: [312, 298, 340, 355, 331, 372, 389, 361, 402, 418, 396, 285].map((v, i) => ({ m: i, gwp: v * 1000 }))
  };

  window.DB = { clients, policies, quotes, claims, invoices, bookStats, MARKETS, UK_INSURERS, SYNDICATES, REINSURERS, PRODUCTS, inDays, DAY };
})();
