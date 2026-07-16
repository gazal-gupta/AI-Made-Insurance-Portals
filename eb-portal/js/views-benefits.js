/* ============================================================
   Screens 8–10: Benefit Configuration (GMC) · (GTL) ·
   Previous Insurance Experience
   ============================================================ */
(function () {
  const U = UI, J = JOURNEY;
  window.SCREENS = window.SCREENS || {};

  const SI_SLABS = [300000, 500000, 1000000, 2000000];
  const FAMILY_DEFS = ["Employee Only", "Employee, Spouse", "Employee, Spouse, 2 Children", "Employee, Spouse, 2 Children, Parents"];
  const PED_GROUP_THRESHOLD = 100;

  /* ---------- Screen 8: Benefit Configuration (GMC) ---------- */
  SCREENS["benefit-gmc"] = function (kase) {
    const b = kase.benefitGMC;
    const lives = kase.employer.employeeCount;
    const pedAutoWaive = lives > PED_GROUP_THRESHOLD;
    return `
    <div class="screen-head">
      <div class="screen-num">Screen 8</div>
      <div class="screen-title">Benefit Configuration — Group Medical</div>
      <div class="screen-purpose">Configure the Group Medical (GMC) benefit structure to be rated and quoted.</div>
    </div>
    <form id="screenForm">
      <div class="screen-grid">
        <div class="field-row"><label>Base Sum Insured <span class="req">*</span></label>
          <select class="select" name="baseSumInsured">${SI_SLABS.map(si => `<option value="${si}" ${(b ? b.baseSumInsured : 500000) === si ? "selected" : ""}>${U.fmtCr(si)}</option>`).join("")}</select></div>
        <div class="field-row"><label>Family Definition <span class="req">*</span></label>
          <select class="select" name="familyDefinition">${FAMILY_DEFS.map(f => `<option ${(b ? b.familyDefinition : FAMILY_DEFS[2]) === f ? "selected" : ""}>${f}</option>`).join("")}</select></div>
        <div class="field-row"><label>Room Rent <span class="req">*</span></label>
          <select class="select" name="roomRent">
            ${["Single Private AC", "Twin Sharing", "1% of Sum Insured capping"].map(r => `<option ${(b ? b.roomRent : "Single Private AC") === r ? "selected" : ""}>${r}</option>`).join("")}</select></div>
        <div class="field-row"><label>Co-pay <span class="opt">optional, %</span></label>
          <input class="input" name="copay" type="number" min="0" max="30" value="${b && b.copay ? b.copay : ""}"></div>
        <div class="field-row"><label>Deductible <span class="opt">optional, ₹</span></label>
          <input class="input" name="deductible" type="number" min="0" value="${b && b.deductible ? b.deductible : ""}"></div>
        <div class="field-row"><label>Corporate Buffer <span class="opt">optional, ₹ — pooled top-up</span></label>
          <input class="input" name="corporateBuffer" type="number" min="0" value="${b && b.corporateBuffer ? b.corporateBuffer : ""}">
          <div class="hint">If selected, requires a separate buffer premium calculation at Screen 12.</div></div>
        <div class="field-row"><label>PED Waiting Period <span class="req">*</span></label>
          <select class="select" name="pedWaived">
            <option value="true" ${pedAutoWaive || (b && b.pedWaived) ? "selected" : ""}>Day 1 (waived)</option>
            <option value="false" ${!pedAutoWaive && b && !b.pedWaived ? "selected" : ""} ${pedAutoWaive ? "disabled" : ""}>Standard (2–4 year waiting period)</option>
          </select>
          ${pedAutoWaive ? `<div class="hint">Auto-waived to Day 1 — group size (${lives}) exceeds the ${PED_GROUP_THRESHOLD}-employee threshold.</div>` : ""}</div>
        <div class="field-row"><label class="toggle-row" style="text-transform:none;font-size:12.5px;font-weight:600;color:var(--ink);"><input type="checkbox" name="maternity" ${b && b.maternity ? "checked" : ""}> Maternity cover (normal + C-section sub-limit)</label></div>
        <div class="field-row"><label class="toggle-row" style="text-transform:none;font-size:12.5px;font-weight:600;color:var(--ink);"><input type="checkbox" name="dayCare" ${b && b.dayCare ? "checked" : ""}> Day Care procedures</label></div>
        <div class="field-row"><label class="toggle-row" style="text-transform:none;font-size:12.5px;font-weight:600;color:var(--ink);"><input type="checkbox" name="opd" ${b && b.opd ? "checked" : ""}> OPD rider</label></div>
        <div class="field-row"><label class="toggle-row" style="text-transform:none;font-size:12.5px;font-weight:600;color:var(--ink);"><input type="checkbox" name="dental" ${b && b.dental ? "checked" : ""}> Dental rider</label></div>
        <div class="field-row"><label class="toggle-row" style="text-transform:none;font-size:12.5px;font-weight:600;color:var(--ink);"><input type="checkbox" name="vision" ${b && b.vision ? "checked" : ""}> Vision rider</label></div>
      </div>
      <div class="screen-foot"><span></span>
        <div class="right"><button type="button" class="btn btn-amber" data-action="save-benefit-gmc" data-case="${kase.id}">Save &amp; Continue →</button></div>
      </div>
    </form>`;
  };

  ACTIONS["save-benefit-gmc"] = function (d) {
    const kase = U.kase(d.case);
    const fd = new FormData(document.getElementById("screenForm"));
    const lives = kase.employer.employeeCount;
    kase.benefitGMC = {
      baseSumInsured: Number(fd.get("baseSumInsured")), familyDefinition: fd.get("familyDefinition"),
      roomRent: fd.get("roomRent"), copay: Number(fd.get("copay")) || 0, deductible: Number(fd.get("deductible")) || 0,
      corporateBuffer: Number(fd.get("corporateBuffer")) || 0, maternity: fd.get("maternity") === "on",
      pedWaived: lives > PED_GROUP_THRESHOLD ? true : fd.get("pedWaived") === "true",
      dayCare: fd.get("dayCare") === "on", opd: fd.get("opd") === "on", dental: fd.get("dental") === "on", vision: fd.get("vision") === "on"
    };
    U.toast(`GMC benefit configuration saved for <strong>${U.esc(kase.lead.companyName)}</strong>.`);
    location.hash = `#/case/${kase.id}/${J.nextStepKey(kase, "benefit-gmc")}`;
  };

  /* ---------- Screen 9: Benefit Configuration (GTL) ---------- */
  SCREENS["benefit-gtl"] = function (kase) {
    const g = kase.benefitGTL;
    const isFlat = !g || g.coverType === "Flat Cover";
    const missingSalary = (kase.censusValidation ? kase.censusValidation.rows.filter(r => r.status === "Accepted" && !r.salary).length : 0);
    return `
    <div class="screen-head">
      <div class="screen-num">Screen 9</div>
      <div class="screen-title">Benefit Configuration — Group Term Life</div>
      <div class="screen-purpose">Configure the Group Term Life (GTL) benefit structure to be rated and quoted.</div>
    </div>
    <form id="screenForm">
      <div class="screen-grid">
        <div class="field-row full"><label>Cover Type <span class="req">*</span></label>
          <div class="radio-row">
            <label class="radio-opt"><input type="radio" name="coverType" value="Flat Cover" data-cond-target="#salaryMultipleRow" data-cond-value="__never__" ${isFlat ? "checked" : ""}> Flat Cover</label>
            <label class="radio-opt"><input type="radio" name="coverType" value="Salary Multiple" data-cond-target="#salaryMultipleRow" data-cond-value="Salary Multiple" ${!isFlat ? "checked" : ""}> Salary Multiple</label>
          </div></div>
        <div class="field-row" id="flatCoverRow" style="display:${isFlat ? "block" : "none"}">
          <label>Flat Cover <span class="req">*</span> <span class="opt">enabled only for Flat Cover</span></label>
          <input class="input" name="flatCover" type="number" min="0" value="${g && g.flatCover ? g.flatCover : 1500000}"></div>
        <div class="field-row" id="salaryMultipleRow" style="display:${!isFlat ? "block" : "none"}">
          <label>Salary Multiple <span class="req">*</span> <span class="opt">typical range 1x–10x</span></label>
          <input class="input" name="salaryMultiple" type="number" min="1" max="10" value="${g && g.salaryMultiple ? g.salaryMultiple : 3}"></div>
        <div class="field-row"><label>Minimum Cover <span class="req">*</span></label>
          <input class="input" name="minimumCover" type="number" min="0" value="${g ? g.minimumCover : 500000}"></div>
        <div class="field-row"><label>Maximum Cover <span class="req">*</span> <span class="opt">also governs Free Cover Limit</span></label>
          <input class="input" name="maximumCover" type="number" min="0" value="${g ? g.maximumCover : 3000000}"></div>
        <div class="field-row"><label class="toggle-row" style="text-transform:none;font-size:12.5px;font-weight:600;color:var(--ink);"><input type="checkbox" name="terminalIllness" ${g && g.terminalIllness ? "checked" : ""}> Terminal Illness rider (accelerated benefit)</label></div>
        <div class="field-row"><label class="toggle-row" style="text-transform:none;font-size:12.5px;font-weight:600;color:var(--ink);"><input type="checkbox" name="accidentalDeath" ${g && g.accidentalDeath ? "checked" : ""}> Accidental Death rider</label></div>
        <div class="field-row"><label class="toggle-row" style="text-transform:none;font-size:12.5px;font-weight:600;color:var(--ink);"><input type="checkbox" name="permanentDisability" ${g && g.permanentDisability ? "checked" : ""}> Permanent Disability rider</label></div>
      </div>
      ${missingSalary > 0 ? `<div class="skip-note" style="border-color:var(--red);background:var(--red-tint);">${missingSalary} accepted employee(s) are missing Salary, required once Cover Type is Salary Multiple. Return to Census Validation (Screen 7) to correct.</div>` : ""}
      <div class="skip-note">Business rule: any member whose calculated cover exceeds the Free Cover Limit for the group's size and industry is automatically flagged for mandatory medical underwriting at Screen 11.</div>
      <div class="screen-foot"><span></span>
        <div class="right"><button type="button" class="btn btn-amber" data-action="save-benefit-gtl" data-case="${kase.id}">Save &amp; Continue →</button></div>
      </div>
    </form>`;
  };

  ACTIONS["save-benefit-gtl"] = function (d) {
    const kase = U.kase(d.case);
    const fd = new FormData(document.getElementById("screenForm"));
    const coverType = fd.get("coverType");
    const errors = [];
    if (coverType === "Flat Cover" && !(Number(fd.get("flatCover")) > 0)) errors.push("Flat Cover amount is required.");
    if (coverType === "Salary Multiple") {
      const m = Number(fd.get("salaryMultiple"));
      if (!(m >= 1 && m <= 10)) errors.push("Salary Multiple must be between 1x and 10x.");
    }
    const min = Number(fd.get("minimumCover")), max = Number(fd.get("maximumCover"));
    if (!(min > 0)) errors.push("Minimum Cover is required.");
    if (!(max >= min)) errors.push("Maximum Cover must be greater than or equal to Minimum Cover.");
    if (errors.length) { U.toast(errors.join("<br>"), "err"); return; }

    kase.benefitGTL = {
      coverType, flatCover: coverType === "Flat Cover" ? Number(fd.get("flatCover")) : null,
      salaryMultiple: coverType === "Salary Multiple" ? Number(fd.get("salaryMultiple")) : null,
      minimumCover: min, maximumCover: max,
      terminalIllness: fd.get("terminalIllness") === "on", accidentalDeath: fd.get("accidentalDeath") === "on",
      permanentDisability: fd.get("permanentDisability") === "on"
    };
    U.toast(`GTL benefit configuration saved for <strong>${U.esc(kase.lead.companyName)}</strong>.`);
    location.hash = `#/case/${kase.id}/${J.nextStepKey(kase, "benefit-gtl")}`;
  };

  /* ---------- Screen 10: Previous Insurance Experience (conditional) ---------- */
  SCREENS["previous-insurance"] = function (kase) {
    const p = kase.prevInsurance;
    return `
    <div class="screen-head">
      <div class="screen-num">Screen 10</div>
      <div class="screen-title">Previous Insurance Experience</div>
      <div class="screen-purpose">Capture claims and policy history for renewal, portability, or migration cases to support risk rating.</div>
    </div>
    <div class="skip-note" style="margin-bottom:16px;">Mandatory because Policy Type is <strong>${U.esc(kase.policyReq.policyType)}</strong>. Skipped entirely for Fresh policies with no prior coverage.</div>
    <form id="screenForm">
      <div class="screen-grid">
        <div class="field-row"><label>Current Insurer <span class="req">*</span></label><input class="input" name="currentInsurer" value="${U.esc(p ? p.currentInsurer : "")}"></div>
        <div class="field-row"><label>Policy Number <span class="req">*</span></label><input class="input" name="policyNumber" value="${U.esc(p ? p.policyNumber : "")}"></div>
        <div class="field-row"><label>Policy Start <span class="req">*</span></label><input class="input" name="policyStart" type="date" value="${p ? p.policyStart : ""}"></div>
        <div class="field-row"><label>Policy End <span class="req">*</span></label><input class="input" name="policyEnd" type="date" value="${p ? p.policyEnd : ""}"></div>
        <div class="field-row"><label>Lives Covered <span class="req">*</span></label><input class="input" name="livesCovered" type="number" min="0" value="${p ? p.livesCovered : ""}"></div>
        <div class="field-row"><label>Premium (₹) <span class="req">*</span></label><input class="input" name="premium" type="number" min="0" value="${p ? p.premium : ""}"></div>
        <div class="field-row"><label>Claims (₹) <span class="opt">used to derive Loss Ratio</span></label><input class="input" name="claims" type="number" min="0" value="${p ? p.claims : ""}"></div>
        <div class="field-row"><label>Number of Claims <span class="opt">optional — used to derive Claim Ratio</span></label><input class="input" name="claimCount" type="number" min="0" value="${p && p.claimCount ? p.claimCount : ""}"></div>
        <div class="field-row full"><label>Major Claims <span class="opt">optional — narrative of large / ongoing claims</span></label>
          <textarea class="input" name="majorClaims">${U.esc(p ? p.majorClaims : "")}</textarea></div>
        <div class="field-row full"><label>Upload Claim Experience Report <span class="opt">optional — PDF/XLSX, max 10MB</span></label>
          <div class="dropzone" data-action="stub-upload" data-label="claim experience report">
            <div class="dz-title">${p && p.reportFile ? "Replace file" : "Click to attach"}</div><div class="dz-sub">${p && p.reportFile ? U.esc(p.reportFile) : "No file attached yet"}</div>
          </div></div>
      </div>
      ${p && p.premium ? `<div class="card" style="margin-top:6px;"><div class="card-body">
        <div class="brk-row"><span>Loss Ratio</span><span>${DB.calc.lossRatio(p) == null ? "—" : DB.calc.lossRatio(p) + "%"}</span></div>
        <div class="brk-row"><span>Claim Ratio</span><span>${p.claimCount ? Math.round(p.claimCount / p.livesCovered * 1000) / 10 + "%" : "—"}</span></div>
      </div></div>` : ""}
      <div class="skip-note">Business rule: Loss Ratio above 65% (default threshold) auto-routes the case to manual underwriting referral at Screen 11.</div>
      <div class="screen-foot"><span></span>
        <div class="right"><button type="button" class="btn btn-amber" data-action="save-previous-insurance" data-case="${kase.id}">Save &amp; Continue →</button></div>
      </div>
    </form>`;
  };

  ACTIONS["save-previous-insurance"] = function (d) {
    const kase = U.kase(d.case);
    const fd = new FormData(document.getElementById("screenForm"));
    const errors = [];
    if (!fd.get("currentInsurer")) errors.push("Current Insurer is required.");
    if (!fd.get("policyNumber")) errors.push("Policy Number is required.");
    if (!fd.get("policyStart") || !fd.get("policyEnd")) errors.push("Policy Start and Policy End are required.");
    if (fd.get("policyStart") >= fd.get("policyEnd")) errors.push("Policy Start must precede Policy End.");
    if (!(Number(fd.get("livesCovered")) > 0)) errors.push("Lives Covered must be greater than 0.");
    if (!(Number(fd.get("premium")) > 0)) errors.push("Premium must be greater than 0.");
    if (errors.length) { U.toast(errors.join("<br>"), "err"); return; }

    kase.prevInsurance = {
      currentInsurer: fd.get("currentInsurer"), policyNumber: fd.get("policyNumber"),
      policyStart: fd.get("policyStart"), policyEnd: fd.get("policyEnd"),
      livesCovered: Number(fd.get("livesCovered")), premium: Number(fd.get("premium")),
      claims: Number(fd.get("claims")) || 0, claimCount: Number(fd.get("claimCount")) || 0,
      majorClaims: fd.get("majorClaims") || "", reportFile: kase.prevInsurance ? kase.prevInsurance.reportFile : ""
    };
    U.toast(`Previous Insurance Experience saved for <strong>${U.esc(kase.lead.companyName)}</strong>.`);
    location.hash = `#/case/${kase.id}/${J.nextStepKey(kase, "previous-insurance")}`;
  };
})();
