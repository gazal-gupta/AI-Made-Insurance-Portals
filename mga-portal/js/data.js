// ---------------------------------------------------------------------------
// Mock data layer for the MGA Portal.
// In production each collection maps 1:1 to a REST resource (see the API view)
// so the UI can be re-pointed at live endpoints without structural changes.
// ---------------------------------------------------------------------------

const DATA = {

  // --- Capacity treaties (delegated authority agreements) -------------------
  treaties: [
    { id: 'T-2026-001', carrier: "Argo Re",                lob: 'Property CAT',        aggLimit: 25_000_000, bound: 18_600_000, maxLine: 5_000_000 },
    { id: 'T-2026-002', carrier: "Munich Re",              lob: 'Commercial Property', aggLimit: 40_000_000, bound: 23_100_000, maxLine: 4_000_000 },
    { id: 'T-2026-003', carrier: "Swiss Re",               lob: 'General Liability',   aggLimit: 30_000_000, bound: 27_800_000, maxLine: 3_000_000 },
    { id: 'T-2026-004', carrier: "Hannover Re",            lob: 'Professional Lines',  aggLimit: 15_000_000, bound: 14_600_000, maxLine: 2_000_000 },
    { id: 'T-2026-005', carrier: "Lloyd's Syndicate 2987", lob: 'Marine Cargo',        aggLimit: 20_000_000, bound: 9_200_000,  maxLine: 3_500_000 },
  ],

  classRestrictions: [
    { cls: 'Frame construction, > 4 storeys',      rule: 'Prohibited',                    treaty: 'T-2026-002' },
    { cls: 'Coastal wind — Tier 1 counties',       rule: 'Max line USD 2.5M',             treaty: 'T-2026-001' },
    { cls: 'Vacant or unoccupied buildings',       rule: 'Referral to carrier required',  treaty: 'T-2026-002' },
    { cls: 'Financial institutions D&O',           rule: 'Excluded',                      treaty: 'T-2026-004' },
    { cls: 'Refrigerated cargo (reefer)',          rule: 'Sub-limit USD 1M per conveyance', treaty: 'T-2026-005' },
  ],

  geoLimits: [
    { region: 'Florida — statewide',            limit: 12_000_000, exposure: 10_940_000 },
    { region: 'Gulf Coast — Tier 1 wind',       limit: 8_000_000,  exposure: 7_420_000 },
    { region: 'Texas — statewide',              limit: 10_000_000, exposure: 6_180_000 },
    { region: 'California — statewide',         limit: 15_000_000, exposure: 8_760_000 },
    { region: 'Northeast corridor (NY/NJ/CT)',  limit: 14_000_000, exposure: 9_310_000 },
  ],

  // --- Policy lifecycle ------------------------------------------------------
  // status: Quote -> Bound -> Issued -> (Endorsed) -> Renewal Due -> renewed
  policies: [
    { id: 'Q-10244', insured: 'Sterling Advisory Partners', lob: 'Professional Lines',  carrier: 'Hannover Re',            premium: 89_400,  limit: 1_500_000, effective: '2026-08-01', expiry: '2027-08-01', status: 'Quote' },
    { id: 'Q-10241', insured: 'Harbor Logistics LLC',       lob: 'Marine Cargo',        carrier: "Lloyd's Syndicate 2987", premium: 84_500,  limit: 2_000_000, effective: '2026-07-15', expiry: '2027-07-15', status: 'Quote' },
    { id: 'Q-10242', insured: 'Bluebonnet Farms Co-op',     lob: 'Commercial Property', carrier: 'Munich Re',              premium: 46_200,  limit: 3_500_000, effective: '2026-07-20', expiry: '2027-07-20', status: 'Quote' },
    { id: 'B-30112', insured: 'Crestline Hotels Group',     lob: 'Property CAT',        carrier: 'Argo Re',                premium: 312_000, limit: 5_000_000, effective: '2026-07-01', expiry: '2027-07-01', status: 'Bound' },
    { id: 'B-30113', insured: 'Nova Health Clinics',        lob: 'Professional Lines',  carrier: 'Hannover Re',            premium: 128_400, limit: 1_000_000, effective: '2026-07-05', expiry: '2027-07-05', status: 'Bound' },
    { id: 'P-77020', insured: 'Meridian Foods Inc',         lob: 'General Liability',   carrier: 'Swiss Re',               premium: 92_750,  limit: 2_000_000, effective: '2026-05-01', expiry: '2027-05-01', status: 'Issued' },
    { id: 'P-77021', insured: 'Atlas Machining',            lob: 'Commercial Property', carrier: 'Munich Re',              premium: 58_300,  limit: 1_250_000, effective: '2026-06-10', expiry: '2027-06-10', status: 'Issued' },
    { id: 'P-76991', insured: 'Pinewood Resorts',           lob: 'Property CAT',        carrier: 'Argo Re',                premium: 268_900, limit: 4_000_000, effective: '2025-08-01', expiry: '2026-08-01', status: 'Renewal Due' },
    { id: 'P-76984', insured: 'Gulf Breeze Marina',         lob: 'Marine Cargo',        carrier: "Lloyd's Syndicate 2987", premium: 71_600,  limit: 1_800_000, effective: '2026-03-15', expiry: '2027-03-15', status: 'Issued' },
    { id: 'P-76975', insured: 'Ironline Construction',      lob: 'General Liability',   carrier: 'Swiss Re',               premium: 118_200, limit: 2_500_000, effective: '2026-02-01', expiry: '2027-02-01', status: 'Issued' },
  ],

  // --- Bordereaux ------------------------------------------------------------
  bordereaux: [
    { id: 'BDX-2026-06-R', type: 'Risk',    period: 'Jun 2026', carrier: 'Munich Re',              format: 'ACORD',                  rows: 1391, status: 'Draft',     findings: null },
    { id: 'BDX-2026-06-P', type: 'Premium', period: 'Jun 2026', carrier: 'Argo Re',                format: "Lloyd's Coverholder v5.2", rows: 1284, status: 'Submitted', findings: { errors: 0, warnings: 2 } },
    { id: 'BDX-2026-06-C', type: 'Claims',  period: 'Jun 2026', carrier: 'Swiss Re',               format: "Lloyd's Coverholder v5.2", rows: 87,   status: 'Validated', findings: { errors: 0, warnings: 0 } },
    { id: 'BDX-2026-05-P', type: 'Premium', period: 'May 2026', carrier: 'Munich Re',              format: 'ACORD',                  rows: 1198, status: 'Submitted', findings: { errors: 0, warnings: 1 } },
    { id: 'BDX-2026-05-C', type: 'Claims',  period: 'May 2026', carrier: "Lloyd's Syndicate 2987", format: "Lloyd's Coverholder v5.2", rows: 64,   status: 'Submitted', findings: { errors: 0, warnings: 0 } },
  ],

  // Findings produced when BDX-2026-06-R is validated
  draftFindings: [
    { level: 'error',   row: 214, message: 'Risk postcode missing — required field in ACORD risk schema', fixable: true },
    { level: 'warning', row: 507, message: 'Sum insured USD 2.9M exceeds class line-size guideline (Coastal wind Tier 1, max 2.5M)' },
    { level: 'warning', row: 891, message: 'Premium currency GBP differs from treaty settlement currency USD — FX rate applied' },
  ],

  bdxSampleRows: {
    Risk: [
      ['UMR', 'Policy Ref', 'Insured', 'Inception', 'Expiry', 'Risk Postcode', 'Sum Insured', 'Currency'],
      ['B0999MERI2026', 'P-77021', 'Atlas Machining', '2026-06-10', '2027-06-10', '77042', '1250000', 'USD'],
      ['B0999MERI2026', 'P-76975', 'Ironline Construction', '2026-02-01', '2027-02-01', '30318', '2500000', 'USD'],
      ['B0999MERI2026', 'P-76984', 'Gulf Breeze Marina', '2026-03-15', '2027-03-15', '32561', '1800000', 'USD'],
    ],
    Premium: [
      ['UMR', 'Policy Ref', 'Insured', 'Gross Premium', 'Commission %', 'Net Premium', 'Instalment', 'Currency'],
      ['B0999MERI2026', 'P-77020', 'Meridian Foods Inc', '92750', '22.5', '71881.25', '1/1', 'USD'],
      ['B0999MERI2026', 'P-77021', 'Atlas Machining', '58300', '24.0', '44308.00', '1/1', 'USD'],
      ['B0999MERI2026', 'P-76991', 'Pinewood Resorts', '268900', '22.5', '208397.50', '2/4', 'USD'],
    ],
    Claims: [
      ['UMR', 'Claim Ref', 'Policy Ref', 'Loss Date', 'Status', 'Paid', 'Outstanding', 'Currency'],
      ['B0999MERI2026', 'CLM-88104', 'P-77020', '2026-06-12', 'Open', '0', '45000', 'USD'],
      ['B0999MERI2026', 'CLM-88097', 'P-76984', '2026-05-30', 'Open', '32500', '177500', 'USD'],
      ['B0999MERI2026', 'CLM-88061', 'P-76975', '2026-04-02', 'Closed', '18240', '0', 'USD'],
    ],
  },

  // --- Commissions -----------------------------------------------------------
  commissionStatements: [
    { carrier: 'Argo Re',                period: 'Jun 2026', gwp: 1_842_300, basePct: 22.5, overridePct: 2.5, profitShare: 55_300, status: 'Accrued' },
    { carrier: 'Munich Re',              period: 'Jun 2026', gwp: 1_286_450, basePct: 24.0, overridePct: 2.0, profitShare: 38_600, status: 'Paid' },
    { carrier: 'Swiss Re',               period: 'Jun 2026', gwp: 964_120,   basePct: 21.0, overridePct: 2.5, profitShare: 0,      status: 'Accrued', note: 'Profit share suspended — loss ratio above 65% trigger' },
    { carrier: 'Hannover Re',            period: 'Jun 2026', gwp: 512_800,   basePct: 25.0, overridePct: 3.0, profitShare: 21_500, status: 'Accrued' },
    { carrier: "Lloyd's Syndicate 2987", period: 'Jun 2026', gwp: 402_150,   basePct: 27.5, overridePct: 0,   profitShare: 18_900, status: 'Pending statement' },
  ],

  hierarchySplit: [
    { level: 'Carrier gross commission to MGA', pct: 22.5 },
    { level: 'Retail broker share',             pct: -10.0 },
    { level: 'Producer override',               pct: -2.5 },
    { level: 'MGA net retained',                pct: 10.0 },
  ],

  // --- Claims ----------------------------------------------------------------
  claims: [
    { id: 'CLM-88104', policy: 'P-77020', insured: 'Meridian Foods Inc',    lossDate: '2026-06-12', cause: 'Slip & fall — third party injury', tpa: 'Sedgwick',            status: 'Open',         reserve: 45_000,  paid: 0 },
    { id: 'CLM-88097', policy: 'P-76984', insured: 'Gulf Breeze Marina',    lossDate: '2026-05-30', cause: 'Cargo water damage in transit',    tpa: 'Charles Taylor',      status: 'Open',         reserve: 177_500, paid: 32_500 },
    { id: 'CLM-88089', policy: 'P-76991', insured: 'Pinewood Resorts',      lossDate: '2026-05-18', cause: 'Wind / hail roof damage',          tpa: 'Crawford & Company',  status: 'Under review', reserve: 87_500,  paid: 0 },
    { id: 'CLM-88061', policy: 'P-76975', insured: 'Ironline Construction', lossDate: '2026-04-02', cause: 'Third-party property damage',      tpa: 'Sedgwick',            status: 'Closed',       reserve: 0,       paid: 18_240 },
  ],

  // FNOL routing table: line of business -> default TPA
  tpaRouting: {
    'General Liability':   'Sedgwick',
    'Commercial Property': 'Crawford & Company',
    'Property CAT':        'Crawford & Company',
    'Professional Lines':  'Gallagher Bassett',
    'Marine Cargo':        'Charles Taylor',
  },

  tpas: [
    { name: 'Sedgwick',           api: 'REST v2 + webhooks', status: 'Connected', lastSync: '4 min ago' },
    { name: 'Crawford & Company', api: 'REST v2 + webhooks', status: 'Connected', lastSync: '11 min ago' },
    { name: 'Gallagher Bassett',  api: 'REST v1',            status: 'Connected', lastSync: '7 min ago' },
    { name: 'Charles Taylor',     api: 'SFTP + webhooks',    status: 'Degraded',  lastSync: '52 min ago', note: 'Webhook delivery retrying' },
  ],

  // --- Dashboard -------------------------------------------------------------
  gwpMonthly: [
    { m: 'Jul 25', v: 3.28 }, { m: 'Aug 25', v: 3.41 }, { m: 'Sep 25', v: 3.12 },
    { m: 'Oct 25', v: 3.66 }, { m: 'Nov 25', v: 3.58 }, { m: 'Dec 25', v: 3.94 },
    { m: 'Jan 26', v: 4.02 }, { m: 'Feb 26', v: 3.76 }, { m: 'Mar 26', v: 4.21 },
    { m: 'Apr 26', v: 4.05 }, { m: 'May 26', v: 4.38 }, { m: 'Jun 26', v: 4.62 },
  ],

  kpis: {
    gwpYtd: 24_800_000, gwpDelta: '+12.4% vs prior YTD',
    policiesInForce: 3412, pifDelta: '+186 this quarter',
    lossRatio: 58.4,
    commissionYtd: 5_640_000,
  },

  activity: [
    { at: '09:41', text: 'Premium bordereau BDX-2026-06-P submitted to Argo Re (Lloyd’s v5.2)' },
    { at: '09:12', text: 'FNOL received on P-77020 — routed to Sedgwick as CLM-88104' },
    { at: '08:55', text: 'Binder B-30113 created for Nova Health Clinics (Professional Lines)' },
    { at: '08:30', text: 'Aggregate alert: Hannover Re Professional Lines treaty at 97.3% of capacity' },
    { at: 'Yesterday', text: 'Jun 2026 commission statements generated for 5 carriers' },
  ],
};
