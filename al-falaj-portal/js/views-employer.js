/* ============================================================
   Screens 4–7: Employer Profile · Policy Requirements ·
   Employee Census Upload · Census Validation
   ============================================================ */
(function () {
  const U = UI, J = JOURNEY;
  window.SCREENS = window.SCREENS || {};

  /* ---------- Screen 4: Employer Profile ---------- */
  /* Identity fields are parameterised per geography (FRD §1.4). Oman is the default,
     active market; India/UAE/Qatar stay fully functional but only render when a case
     explicitly sets that geography — hidden from the default UI, not removed. */
  function identityFieldsHtml(geo, e) {
    if (geo === "India") return `
        <div class="field-row"><label>PAN <span class="req">*</span></label>
          <input class="input" name="pan" placeholder="AAAAA9999A" maxlength="10" value="${U.esc(e ? e.pan : "")}">
          <div class="hint">5 letters, 4 digits, 1 letter. Format-validated only in this release (NSDL verification is Phase 2).</div></div>
        <div class="field-row"><label>GST <span class="opt">optional</span></label>
          <input class="input" name="gst" placeholder="15-character GSTIN" maxlength="15" value="${U.esc(e ? e.gst : "")}"></div>`;
    if (geo === "UAE") return `
        <div class="field-row"><label>Trade License Number <span class="req">*</span></label>
          <input class="input" name="tradeLicense" value="${U.esc(e ? e.tradeLicense : "")}">
          <div class="hint">Geography: UAE — identity format parameterised per FRD §1.4 (PAN/GST substituted with Trade License/VAT TRN).</div></div>
        <div class="field-row"><label>VAT TRN <span class="opt">optional</span></label>
          <input class="input" name="vatTrn" placeholder="100xxxxxxxxxxxx" value="${U.esc(e ? e.vatTrn : "")}"></div>`;
    if (geo === "Qatar") return `
        <div class="field-row"><label>Commercial Registration (CR) Number <span class="req">*</span></label>
          <input class="input" name="crNumberQatar" value="${U.esc(e ? e.crNumberQatar : "")}">
          <div class="hint">Geography: Qatar — identity format parameterised per FRD §1.4 (PAN/GST substituted with CR/Tax Card). Qatar has not yet implemented VAT under the GCC framework.</div></div>
        <div class="field-row"><label>Tax Card Number <span class="opt">optional</span></label>
          <input class="input" name="taxCard" placeholder="GTA-xxxxxxx" value="${U.esc(e ? e.taxCard : "")}"></div>`;
    return `
        <div class="field-row"><label>Commercial Registration (CR) Number <span class="req">*</span></label>
          <input class="input" name="crNumber" value="${U.esc(e ? e.crNumber : "")}">
          <div class="hint">Geography: Oman — identity format parameterised per FRD §1.4 (PAN/GST substituted with CR/VATIN).</div></div>
        <div class="field-row"><label>VATIN <span class="opt">optional</span></label>
          <input class="input" name="vatin" placeholder="OM1xxxxxxxxxxx" value="${U.esc(e ? e.vatin : "")}"></div>`;
  }

  SCREENS["employer"] = function (kase) {
    const e = kase.employer;
    const geo = U.geographyOf(kase);
    const industryOpts = DB.INDUSTRIES.map(i => `<option value="${i.code}" ${(e ? e.industry : kase.lead.industry) === i.code ? "selected" : ""}>${U.esc(i.label)}</option>`).join("");
    const brokerDefault = kase.brokerId ? U.broker(kase.brokerId).name : "";

    return `
    <div class="screen-head">
      <div class="screen-num">Screen 4</div>
      <div class="screen-title">Employer Profile</div>
      <div class="screen-purpose">Capture statutory, financial, and organisational details of the employer for underwriting and compliance.</div>
    </div>
    ${geo === "Oman" ? `<div class="field-row" style="margin-bottom:14px;">
      <button type="button" class="btn btn-sm" data-action="stub-moc-fetch" data-case="${kase.id}">Auto-fetch from Ministry of Commerce (prototype) →</button>
      <div class="hint">Would pre-fill Legal Name, Industry, CR Number and headcount directly from Oman's business registry. Simulated for this demo — needs a live MOC/Ministry of Labour API integration to work for real.</div>
    </div>` : ""}
    <form id="screenForm">
      <div class="screen-grid">
        <div class="field-row"><label>Legal Name <span class="req">*</span></label>
          <input class="input" name="legalName" value="${U.esc(e ? e.legalName : kase.lead.companyName)}"></div>
        <div class="field-row"><label>Trade Name <span class="opt">optional — defaults to Legal Name</span></label>
          <input class="input" name="tradeName" value="${U.esc(e ? e.tradeName : "")}"></div>
        ${identityFieldsHtml(geo, e)}
        <div class="field-row"><label>Industry <span class="req">*</span></label><select class="select" name="industry">${industryOpts}</select></div>
        <div class="field-row"><label>Annual Turnover <span class="opt">optional</span></label>
          <input class="input" name="annualTurnover" type="number" min="0" value="${e ? e.annualTurnover : ""}"></div>
        <div class="field-row"><label>Employee Count <span class="req">*</span></label>
          <input class="input" name="employeeCount" type="number" min="1" value="${e ? e.employeeCount : kase.lead.expectedEmployeeCount}">
          <div class="hint">Becomes the reference count for census reconciliation at Screen 7.</div></div>
        <div class="field-row"><label>Payroll Frequency <span class="req">*</span></label>
          <select class="select" name="payrollFrequency">
            ${["Monthly", "Fortnightly", "Weekly"].map(f => `<option ${(e ? e.payrollFrequency : "Monthly") === f ? "selected" : ""}>${f}</option>`).join("")}</select></div>
        <div class="field-row full"><label>Office Locations <span class="req">*</span> <span class="opt">one per line, at least one required</span></label>
          <textarea class="input" name="officeLocations" style="min-height:56px;">${U.esc(e ? e.officeLocations.join("\n") : "")}</textarea></div>
        <div class="field-row"><label>HR Contact <span class="req">*</span></label>
          <input class="input" name="hrContact" value="${U.esc(e ? e.hrContact : `${kase.lead.contactPerson} / ${kase.lead.email} / ${kase.lead.mobile}`)}"></div>
        <div class="field-row"><label>Finance Contact <span class="opt">optional</span></label>
          <input class="input" name="financeContact" value="${U.esc(e ? e.financeContact : "")}"></div>
        <div class="field-row"><label>Previous Insurer <span class="opt">optional</span></label>
          <input class="input" name="previousInsurer" value="${U.esc(e ? e.previousInsurer : "")}"></div>
        <div class="field-row"><label>Current Broker <span class="opt">auto-filled from Lead</span></label>
          <input class="input" name="currentBroker" value="${U.esc(e ? e.currentBroker : brokerDefault)}" ${kase.brokerId ? "readonly" : ""}></div>
      </div>
      <div class="screen-foot">
        <span></span>
        <div class="right"><button type="button" class="btn btn-amber" data-action="save-employer" data-case="${kase.id}">Save &amp; Continue →</button></div>
      </div>
    </form>`;
  };

  ACTIONS["stub-moc-fetch"] = function (d) {
    const kase = U.kase(d.case);
    const form = document.getElementById("screenForm");
    if (!form) return;
    // Prototype only: illustrates the intended "zero-touch employer profiling" UX from a
    // live Oman Ministry of Commerce / Ministry of Labour integration. No external service
    // is actually called — these are plausible canned values pre-filled for the demo.
    const cr = form.querySelector('[name="crNumber"]');
    const vatin = form.querySelector('[name="vatin"]');
    if (cr) cr.value = "1" + String(200000 + Math.floor(Math.random() * 799999));
    if (vatin) vatin.value = "OM1" + String(100000000000 + Math.floor(Math.random() * 899999999999)).slice(0, 12);
    const empCountEl = form.querySelector('[name="employeeCount"]');
    if (empCountEl && !empCountEl.value) empCountEl.value = kase.lead.expectedEmployeeCount;
    U.toast("Prototype fetch complete — CR Number and VATIN pre-filled from a (simulated) Ministry of Commerce lookup. This demo does not call a live government API; review before saving.", "warn");
  };

  ACTIONS["save-employer"] = function (d) {
    const kase = U.kase(d.case);
    const fd = new FormData(document.getElementById("screenForm"));
    const geo = U.geographyOf(kase);
    const errors = [];
    if (!fd.get("legalName")) errors.push("Legal Name is required.");
    if (geo === "India") {
      if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test((fd.get("pan") || "").toUpperCase())) errors.push("PAN must match format AAAAA9999A.");
      if (fd.get("gst") && fd.get("gst").length !== 15) errors.push("GSTIN must be 15 characters.");
    } else if (geo === "UAE") {
      if (!fd.get("tradeLicense")) errors.push("Trade License Number is required.");
    } else if (geo === "Qatar") {
      if (!fd.get("crNumberQatar")) errors.push("Commercial Registration (CR) Number is required.");
    } else {
      if (!fd.get("crNumber")) errors.push("Commercial Registration (CR) Number is required.");
    }
    if (!(Number(fd.get("employeeCount")) > 0)) errors.push("Employee Count must be greater than 0.");
    const locations = (fd.get("officeLocations") || "").split("\n").map(s => s.trim()).filter(Boolean);
    if (locations.length === 0) errors.push("At least one Office Location is required.");
    if (!fd.get("hrContact")) errors.push("HR Contact is required.");
    if (errors.length) { U.toast(errors.join("<br>"), "err"); return; }

    kase.employer = {
      legalName: fd.get("legalName"), tradeName: fd.get("tradeName") || fd.get("legalName"),
      pan: geo === "India" ? (fd.get("pan") || "").toUpperCase() : undefined, gst: geo === "India" ? fd.get("gst") : undefined,
      crNumber: geo === "Oman" ? fd.get("crNumber") : undefined, vatin: geo === "Oman" ? fd.get("vatin") : undefined,
      tradeLicense: geo === "UAE" ? fd.get("tradeLicense") : undefined, vatTrn: geo === "UAE" ? fd.get("vatTrn") : undefined,
      crNumberQatar: geo === "Qatar" ? fd.get("crNumberQatar") : undefined, taxCard: geo === "Qatar" ? fd.get("taxCard") : undefined,
      industry: fd.get("industry"), annualTurnover: Number(fd.get("annualTurnover")) || null,
      employeeCount: Number(fd.get("employeeCount")), officeLocations: locations,
      hrContact: fd.get("hrContact"), financeContact: fd.get("financeContact") || "",
      payrollFrequency: fd.get("payrollFrequency"), previousInsurer: fd.get("previousInsurer") || "",
      currentBroker: fd.get("currentBroker") || ""
    };
    U.toast(`Employer Profile saved for <strong>${U.esc(kase.lead.companyName)}</strong>.`);
    location.hash = `#/case/${kase.id}/${J.nextStepKey(kase, "employer")}`;
  };

  /* ---------- Screen 5: Policy Requirements ---------- */
  SCREENS["policy-requirements"] = function (kase) {
    const p = kase.policyReq;
    const products = U.productsOf(kase);
    const minEff = DB.calc.addDays(DB.TODAY, 7);
    const shared = p && p.employerContribution === "Shared (Employer/Employee split)";
    return `
    <div class="screen-head">
      <div class="screen-num">Screen 5</div>
      <div class="screen-title">Policy Requirements</div>
      <div class="screen-purpose">Capture the high-level coverage structure and commercial terms the employer wants quoted.</div>
    </div>
    <form id="screenForm">
      <div class="screen-grid">
        <div class="field-row full"><label>Products <span class="req">*</span></label>
          <div class="check-row">${["GMC", "GTL"].map(pr => `<label class="check-opt"><input type="checkbox" name="products" value="${pr}" ${products.includes(pr) ? "checked" : ""} disabled> ${pr === "GMC" ? "Group Medical" : "Group Term Life"}</label>`).join("")}</div>
          <div class="hint">Carried forward from Opportunity — edit on Screen 3 if this needs to change.</div></div>
        <div class="field-row"><label>Policy Effective Date <span class="req">*</span></label>
          <input class="input" name="effectiveDate" type="date" min="${minEff}" value="${p ? p.effectiveDate : minEff}">
          <div class="hint">Cannot be earlier than today + 7 days (configurable minimum lead time).</div></div>
        <div class="field-row"><label>Policy Duration <span class="req">*</span></label>
          <select class="select" name="duration"><option ${(!p || p.duration === "12 months") ? "selected" : ""}>12 months</option><option ${p && p.duration === "Co-terminus" ? "selected" : ""}>Co-terminus</option></select></div>
        <div class="field-row full"><label>Policy Type <span class="req">*</span></label>
          <div class="radio-row">${["Fresh", "Portability", "Migration"].map(t => `<label class="radio-opt"><input type="radio" name="policyType" value="${t}" ${(p ? p.policyType : "Fresh") === t ? "checked" : ""}> ${t}</label>`).join("")}</div>
          <div class="hint">Portability or Migration makes Screen 10 (Previous Insurance Experience) mandatory rather than optional.</div></div>
        <div class="field-row full"><label>Employer Contribution <span class="req">*</span></label>
          <div class="radio-row">
            <label class="radio-opt"><input type="radio" name="employerContribution" value="100% Employer-funded" data-cond-target="#splitRow" data-cond-value="__never__" ${(!p || p.employerContribution === "100% Employer-funded") ? "checked" : ""}> 100% Employer-funded</label>
            <label class="radio-opt"><input type="radio" name="employerContribution" value="Shared (Employer/Employee split)" data-cond-target="#splitRow" data-cond-value="Shared (Employer/Employee split)" ${shared ? "checked" : ""}> Shared (Employer/Employee split)</label>
          </div></div>
        <div class="field-row full" id="splitRow" style="display:${shared ? "block" : "none"};">
          <label>Contribution Split <span class="req">*</span> <span class="opt">must total 100%</span></label>
          <div class="screen-grid" style="margin-top:0;">
            <div class="field-row"><input class="input" name="splitEmployer" type="number" min="0" max="100" placeholder="Employer %" value="${p && p.splitPct ? p.splitPct.employer : 75}"></div>
            <div class="field-row"><input class="input" name="splitEmployee" type="number" min="0" max="100" placeholder="Employee %" value="${p && p.splitPct ? p.splitPct.employee : 25}"></div>
          </div></div>
        <div class="field-row full"><label>Coverage Basis <span class="req">*</span></label>
          <div class="radio-row">${["Employee Only", "Family Floater"].map(c => `<label class="radio-opt"><input type="radio" name="coverageBasis" value="${c}" ${(p ? p.coverageBasis : "Family Floater") === c ? "checked" : ""}> ${c}</label>`).join("")}</div></div>
      </div>
      <div class="screen-foot"><span></span>
        <div class="right"><button type="button" class="btn btn-amber" data-action="save-policyreq" data-case="${kase.id}">Save &amp; Continue →</button></div>
      </div>
    </form>`;
  };

  ACTIONS["save-policyreq"] = function (d) {
    const kase = U.kase(d.case);
    const fd = new FormData(document.getElementById("screenForm"));
    const errors = [];
    if (!fd.get("effectiveDate")) errors.push("Policy Effective Date is required.");
    const minEff = DB.calc.addDays(DB.TODAY, 7);
    if (fd.get("effectiveDate") < minEff) errors.push(`Policy Effective Date cannot be earlier than ${U.fmtDate(minEff)}.`);
    if (!fd.get("policyType")) errors.push("Policy Type is required.");
    if (!fd.get("employerContribution")) errors.push("Employer Contribution is required.");
    let splitPct = null;
    if (fd.get("employerContribution") === "Shared (Employer/Employee split)") {
      const emp = Number(fd.get("splitEmployer")), ee = Number(fd.get("splitEmployee"));
      if (emp + ee !== 100) errors.push("Contribution split must total 100%.");
      splitPct = { employer: emp, employee: ee };
    }
    if (!fd.get("coverageBasis")) errors.push("Coverage Basis is required.");
    if (errors.length) { U.toast(errors.join("<br>"), "err"); return; }

    kase.policyReq = {
      products: U.productsOf(kase), effectiveDate: fd.get("effectiveDate"), duration: fd.get("duration"),
      policyType: fd.get("policyType"), employerContribution: fd.get("employerContribution"),
      splitPct, coverageBasis: fd.get("coverageBasis")
    };
    U.toast(`Policy Requirements saved for <strong>${U.esc(kase.lead.companyName)}</strong>.`);
    location.hash = `#/case/${kase.id}/${J.nextStepKey(kase, "policy-requirements")}`;
  };

  /* ---------- Screen 6: Employee Census Upload ---------- */
  const CENSUS_ROW_LIMIT = 50000;
  SCREENS["census-upload"] = function (kase) {
    const c = kase.census;
    return `
    <div class="screen-head">
      <div class="screen-num">Screen 6</div>
      <div class="screen-title">Employee Census Upload</div>
      <div class="screen-purpose">Upload the employer's employee-level data required for rating and underwriting.</div>
    </div>
    <div class="field-row">
      <label>Download Template</label>
      <button type="button" class="btn btn-sm" data-action="download-census-template">Download census template (.csv)</button>
      <div class="hint">Standard template — Employee Name, Employee ID, DOB, Gender, Salary, Coverage.</div>
    </div>
    <div class="field-row" style="margin-top:16px;">
      <label>Upload File <span class="req">*</span> <span class="opt">XLSX/CSV, max 25MB, row limit ${CENSUS_ROW_LIMIT.toLocaleString()} (default)</span></label>
      <input type="file" id="censusFileInput" accept=".xlsx,.xls,.csv" style="display:none" data-action="upload-census-file" data-case="${kase.id}">
      <div class="dropzone" data-action="trigger-census-file">
        <div class="dz-title">${c ? "Replace uploaded file" : "Click to upload census file"}</div>
        <div class="dz-sub">${c ? U.esc(c.fileName) + " — uploaded " + U.fmtDate(c.uploadedAt) : "XLSX or CSV, matching the template headers"}</div>
      </div>
      <div class="hint">
        Column headers are matched flexibly (e.g. "Emp Name" or "Full Name" both work) — but a file missing a required column is still blocked.
        <a data-action="generate-sample-census" data-case="${kase.id}" style="cursor:pointer;">No file handy? Generate a sample census →</a>
      </div>
    </div>
    <div class="field-row" style="margin-top:16px;">
      <label>Employee Count <span class="opt">system — auto-derived from file row count</span></label>
      <input class="input" readonly value="${c ? c.rows.length + " rows" + (c.rowLimitHit ? ` (of ${c.totalParsed.toLocaleString()} in file — row limit applied)` : "") : "—"}">
    </div>
    ${c ? `<div class="field-row"><label>Errors Summary</label>
      <input class="input" readonly value="${kase.censusValidation ? kase.censusValidation.rejected + " row(s) failed validation" : "Not yet validated"}"></div>` : ""}
    ${c && c.detectedColumns ? `<div class="card" style="margin-top:16px;"><div class="card-head"><div><div class="card-title">AI-Assisted Column Mapping</div><div class="card-sub">Your file's headers, matched to the system's fields automatically</div></div></div>
      <div class="card-body"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>System Field</th><th>Matched Column Header</th></tr></thead>
      <tbody>${c.detectedColumns.map(m => `<tr><td>${U.esc(m.field)}</td><td class="cell-sub">"${U.esc(m.header)}"</td></tr>`).join("")}</tbody></table></div></div>
    </div>` : ""}
    <div class="skip-note">Business rule: upload is blocked if the file does not match the published template column headers. Employee Count derived from the file must reconcile with the Employer Profile Employee Count within tolerance; variance beyond tolerance requires HR confirmation before proceeding.</div>
    <div class="screen-foot">
      <span></span>
      <div class="right"><button type="button" class="btn btn-amber" data-action="validate-census" data-case="${kase.id}" ${!c ? "disabled" : ""}>Validate →</button></div>
    </div>`;
  };

  ACTIONS["download-census-template"] = function () {
    U.exportCSV("EB_Census_Template.csv", ["Employee Name", "Employee ID", "DOB (YYYY-MM-DD)", "Gender", "Salary (if applicable)", "Coverage (Employee Only / Family Floater)"], [["", "", "", "", "", ""]]);
  };

  ACTIONS["trigger-census-file"] = function () {
    const input = document.getElementById("censusFileInput");
    if (input) input.click();
  };

  ACTIONS["upload-census-file"] = function (d, el) {
    const kase = U.kase(d.case);
    const file = el.files && el.files[0];
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) { U.toast("File exceeds the 25MB upload limit.", "err"); el.value = ""; return; }

    const reader = new FileReader();
    reader.onload = function () {
      const result = XLSXImport.parseWorkbook(reader.result, CENSUS_ROW_LIMIT);
      if (result.parseError) { U.toast(result.parseError, "err"); el.value = ""; return; }
      if (result.missingColumns && result.missingColumns.length) {
        U.toast(`Upload blocked — file is missing required column(s): <strong>${result.missingColumns.join(", ")}</strong>. Please use the downloaded template.`, "err");
        el.value = "";
        return;
      }
      kase.census = {
        fileName: file.name, uploadedAt: DB.TODAY, rows: result.rows, hrConfirmedVariance: false,
        totalParsed: result.totalParsed, rowLimitHit: result.rowLimitHit, detectedColumns: result.detectedColumns
      };
      kase.censusValidation = null;
      DB.pushNotif(kase, "Census uploaded", "info", `Census uploaded for <strong>${U.esc(kase.lead.companyName)}</strong> — ${result.rows.length} rows`, `#/case/${kase.id}/census-validation`);
      U.toast(result.rowLimitHit
        ? `Uploaded <strong>${result.rows.length.toLocaleString()}</strong> of ${result.totalParsed.toLocaleString()} rows — row limit (${CENSUS_ROW_LIMIT.toLocaleString()}) reached; remaining rows were not imported.`
        : `Uploaded <strong>${result.rows.length}</strong> employee rows from <strong>${U.esc(file.name)}</strong>. Confirmation email sent to HR Contact and Sales Executive.`,
        result.rowLimitHit ? "warn" : "ok");
      el.value = "";
      App.render();
      location.hash = `#/case/${kase.id}/census-upload`;
    };
    reader.onerror = function () { U.toast("Could not read the selected file.", "err"); el.value = ""; };
    reader.readAsArrayBuffer(file);
  };

  ACTIONS["generate-sample-census"] = function (d) {
    const kase = U.kase(d.case);
    const declared = kase.employer.employeeCount;
    const asOf = kase.policyReq ? kase.policyReq.effectiveDate : DB.calc.addDays(DB.TODAY, 30);
    const salaryReq = (kase.policyReq && kase.policyReq.employerContribution === "Shared (Employer/Employee split)") ||
      (U.productsOf(kase).includes("GTL"));
    const rows = DB.calc.genCensus(Date.now() % 100000, declared, {
      asOf, minAge: 18, maxAge: 79, withSalary: salaryReq, prefix: kase.id.slice(-4) + "-"
    });
    kase.census = { fileName: `${kase.lead.companyName.replace(/\s+/g, "_")}_Census_Sample.xlsx`, uploadedAt: DB.TODAY, rows, hrConfirmedVariance: false, totalParsed: rows.length, rowLimitHit: false };
    kase.censusValidation = null;
    DB.pushNotif(kase, "Census uploaded", "info", `Census uploaded for <strong>${U.esc(kase.lead.companyName)}</strong> — ${rows.length} rows`, `#/case/${kase.id}/census-validation`);
    U.toast(`Generated a sample census of <strong>${rows.length}</strong> employee rows for demo purposes.`);
    App.render();
    location.hash = `#/case/${kase.id}/census-upload`;
  };

  ACTIONS["validate-census"] = function (d) {
    const kase = U.kase(d.case);
    if (!kase.census) { U.toast("Upload a census file first.", "err"); return; }
    const asOf = kase.policyReq ? kase.policyReq.effectiveDate : DB.calc.addDays(DB.TODAY, 30);
    const salaryReq = (kase.policyReq && kase.policyReq.employerContribution === "Shared (Employer/Employee split)") || U.productsOf(kase).includes("GTL");
    kase.censusValidation = DB.calc.validateCensus(kase.census.rows, asOf, 18, 79, salaryReq);
    location.hash = `#/case/${kase.id}/census-validation`;
  };

  /* ---------- Screen 7: Census Validation ---------- */
  SCREENS["census-validation"] = function (kase) {
    const cv = kase.censusValidation;
    if (!cv) return `<div class="empty"><div class="big">No validation run yet</div>Return to Screen 6 and click Validate.</div>`;
    const rec = DB.calc.reconciliation(kase);
    const displayRows = cv.rows.slice(0, 100);
    const canProceed = rec.withinTolerance || (kase.census && kase.census.hrConfirmedVariance);
    const cur = U.currencyOf(kase);
    const anomalies = AI.censusAnomalies(cv.rows);

    return `
    <div class="screen-head">
      <div class="screen-num">Screen 7</div>
      <div class="screen-title">Census Validation</div>
      <div class="screen-purpose">Validate uploaded employee-level records prior to underwriting and rating.</div>
    </div>
    <div class="mini-stats">
      <div class="kpi"><div class="kpi-label">Total Rows</div><div class="kpi-value">${cv.rows.length}</div></div>
      <div class="kpi"><div class="kpi-label">Accepted</div><div class="kpi-value" style="color:var(--green)">${cv.accepted}</div></div>
      <div class="kpi"><div class="kpi-label">Rejected</div><div class="kpi-value" style="color:var(--red)">${cv.rejected}</div></div>
      <div class="kpi"><div class="kpi-label">Reconciliation</div><div class="kpi-value" style="font-size:16px;">${rec.variancePct}% variance</div></div>
    </div>
    ${!rec.withinTolerance ? `
    <div class="skip-note" style="border-color:var(--red);background:var(--red-tint);color:var(--amber-ink);">
      <strong>Reconciliation exceeds tolerance:</strong> Employer Profile declares ${rec.declared} employees; census uploaded ${rec.uploaded} (${rec.variancePct}% variance, tolerance 5%).
      Per business rule, this requires HR confirmation before Underwriting can proceed.
      ${kase.census.hrConfirmedVariance
        ? `<div style="margin-top:8px;">${U.pill("Approve")} HR-confirmed on ${U.fmtDate(DB.TODAY)}</div>`
        : `<div style="margin-top:10px;display:flex;gap:8px;">
             <button type="button" class="btn btn-sm btn-amber" data-action="confirm-census-variance" data-case="${kase.id}">Confirm variance with HR</button>
             <button type="button" class="btn btn-sm" data-action="fix-census-upload" data-case="${kase.id}">Re-upload corrected census</button>
           </div>`}
    </div>` : ""}
    ${cv.rejected > 0 ? `
    <div class="card" style="margin:16px 0;"><div class="card-head"><div><div class="card-title">Failed Rows</div><div class="card-sub">Excluded from rating until corrected and re-uploaded</div></div>
      <div class="card-link" data-action="download-census-errors" data-case="${kase.id}">Download errors →</div></div>
      <div class="card-body"><ul class="errlist">${cv.rows.filter(r => r.status === "Rejected").slice(0, 20).map(r => `<li><span>${U.esc(r.empId)} — ${U.esc(U.piiMasked() ? (U.maskName(r.name) || "(blank)") : (r.name || "(blank)"))}</span><span style="color:var(--red)">${U.esc(r.reason)}</span></li>`).join("")}</ul></div>
    </div>` : ""}
    ${anomalies.length ? `
    <div class="card" style="margin:16px 0;"><div class="card-head"><div><div class="card-title">AI-Detected Anomalies</div><div class="card-sub">Informational only — does not block validation; worth a human glance before rating</div></div></div>
      <div class="card-body"><ul class="errlist">${anomalies.map(a => `<li><span>${U.esc(a.detail)}</span><span class="cell-sub">${a.type === "duplicate" ? "Possible duplicate" : "Salary outlier"}</span></li>`).join("")}</ul></div>
    </div>` : ""}
    <div class="card">
      <div class="card-head"><div><div class="card-title">Census Records</div><div class="card-sub">Showing first ${displayRows.length} of ${cv.rows.length} rows${U.piiMasked() ? " — Employee Name and DOB masked for this role (PDPL data minimization)" : ""}</div></div>
        <div class="card-link" data-action="download-census-full" data-case="${kase.id}">Export full list →</div></div>
      <div class="card-body"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Employee ID</th><th>Name</th><th>DOB</th><th class="num">Age</th><th>Gender</th><th class="num">Salary</th><th>Coverage</th><th>Status</th></tr></thead>
      <tbody>${displayRows.map(r => `<tr>
        <td>${U.esc(r.empId)}</td><td>${U.esc(U.piiMasked() ? U.maskName(r.name) || "(blank)" : (r.name || "(blank)"))}</td><td>${U.piiMasked() ? U.esc(U.maskDob(r.dob)) : U.fmtDate(r.dob)}</td><td class="num">${Number.isNaN(r.age) ? "—" : r.age}</td>
        <td>${U.esc(r.gender)}</td><td class="num">${r.salary ? U.fmtMoney(r.salary, cur) : "—"}</td><td>${U.esc(r.coverage)}</td>
        <td>${U.pill(r.status)}${r.reason ? `<div class="cell-sub">${U.esc(r.reason)}</div>` : ""}</td>
      </tr>`).join("")}</tbody></table></div></div>
    </div>
    <div class="screen-foot">
      <span class="page-meta">${canProceed ? "Ready for Underwriting" : "Blocked — resolve reconciliation before continuing"}</span>
      <div class="right"><button type="button" class="btn btn-amber" data-action="continue-census" data-case="${kase.id}" ${!canProceed ? "disabled" : ""}>Continue →</button></div>
    </div>`;
  };

  ACTIONS["confirm-census-variance"] = function (d) {
    const kase = U.kase(d.case);
    kase.census.hrConfirmedVariance = true;
    U.toast("HR-confirmed variance recorded. Proceeding is now unblocked.");
    App.render();
  };

  ACTIONS["fix-census-upload"] = function (d) {
    const kase = U.kase(d.case);
    const declared = kase.employer.employeeCount;
    const asOf = kase.policyReq ? kase.policyReq.effectiveDate : DB.calc.addDays(DB.TODAY, 30);
    const salaryReq = U.productsOf(kase).includes("GTL");
    const closeCount = Math.round(declared * 0.98);
    const rows = DB.calc.genCensus(Date.now() % 100000 + 7, closeCount, { asOf, minAge: 18, maxAge: 79, withSalary: salaryReq, prefix: kase.id.slice(-4) + "-" });
    kase.census = { fileName: `${kase.lead.companyName.replace(/\s+/g, "_")}_Census_Corrected.xlsx`, uploadedAt: DB.TODAY, rows, hrConfirmedVariance: false };
    kase.censusValidation = DB.calc.validateCensus(rows, asOf, 18, 79, salaryReq);
    U.toast("Corrected census re-uploaded and re-validated.");
    App.render();
  };

  ACTIONS["download-census-errors"] = function (d) {
    const kase = U.kase(d.case);
    const rows = kase.censusValidation.rows.filter(r => r.status === "Rejected");
    U.exportCSV(`${kase.id}_census_errors.csv`, ["Employee ID", "Name", "DOB", "Reason"], rows.map(r => [r.empId, r.name, r.dob, r.reason]));
  };
  ACTIONS["download-census-full"] = function (d) {
    const kase = U.kase(d.case);
    const rows = kase.censusValidation.rows;
    U.exportCSV(`${kase.id}_census_full.csv`, ["Employee ID", "Name", "DOB", "Age", "Gender", "Salary", "Coverage", "Status"],
      rows.map(r => [r.empId, r.name, r.dob, r.age, r.gender, r.salary || "", r.coverage, r.status]));
  };
  ACTIONS["continue-census"] = function (d) {
    const kase = U.kase(d.case);
    location.hash = `#/case/${kase.id}/${J.nextStepKey(kase, "census-validation")}`;
  };
})();
