/* ============================================================
   Real XLSX/CSV census import, backed by vendored SheetJS
   (js/vendor/xlsx.mini.min.js — Apache-2.0, github.com/SheetJS/sheetjs).

   Column mapping is alias-tolerant rather than requiring an exact header
   match: real employer files rename "Employee Name" to "Emp Name", "Full
   Name", etc. The FRD's "upload is blocked if columns don't match the
   template" rule still holds — a file missing a *recognisable* mandatory
   column is still blocked — it's just not brittle to header punctuation
   or synonyms a real HR export would plausibly use.
   ============================================================ */
(function () {
  const HEADER_ALIASES = {
    empId: ["employeeid", "empid", "id", "staffid", "employeecode", "empcode"],
    name: ["employeename", "name", "fullname", "empname", "employee"],
    dob: ["dob", "dateofbirth", "birthdate", "dobyyyymmdd"],
    gender: ["gender", "sex"],
    salary: ["salary", "annualsalary", "salaryifapplicable", "ctc", "grosssalary", "monthlysalary"],
    coverage: ["coverage", "coveragetype", "coverageemployeeonlyfamilyfloater"]
  };
  const REQUIRED = ["empId", "name", "dob", "gender"];

  function normalizeHeader(h) { return String(h == null ? "" : h).toLowerCase().replace(/[^a-z0-9]/g, ""); }

  function mapColumns(headerRow) {
    const map = {};
    headerRow.forEach((h, idx) => {
      const norm = normalizeHeader(h);
      for (const key in HEADER_ALIASES) {
        if (map[key] != null) continue;
        if (HEADER_ALIASES[key].includes(norm)) map[key] = idx;
      }
    });
    return map;
  }

  const EXCEL_EPOCH = Date.UTC(1899, 11, 30);
  function parseDate(val) {
    if (val instanceof Date && !isNaN(val)) return val.toISOString().slice(0, 10);
    if (typeof val === "number" && val > 0) {
      const d = new Date(EXCEL_EPOCH + val * 86400000);
      return isNaN(d) ? "" : d.toISOString().slice(0, 10);
    }
    if (typeof val === "string" && val.trim()) {
      const s = val.trim();
      const iso = new Date(s);
      if (!isNaN(iso) && /\d{4}/.test(s)) return iso.toISOString().slice(0, 10);
      const m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
      if (m) {
        let [, a, b, y] = m;
        if (y.length === 2) y = (Number(y) > 30 ? "19" : "20") + y;
        const d2 = new Date(Date.UTC(Number(y), Number(b) - 1, Number(a)));
        if (!isNaN(d2)) return d2.toISOString().slice(0, 10);
      }
    }
    return "";
  }

  function parseSalary(val) {
    if (val == null || val === "") return null;
    const n = Number(String(val).replace(/[^0-9.]/g, ""));
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  function normalizeCoverage(val) {
    const s = String(val == null ? "" : val).toLowerCase();
    return s.includes("family") || s.includes("floater") ? "Family Floater" : "Employee Only";
  }

  function normalizeGender(val) {
    const s = String(val == null ? "" : val).toLowerCase();
    if (s.startsWith("f")) return "Female";
    if (s.startsWith("m")) return "Male";
    return "Other";
  }

  /* parseWorkbook(ArrayBuffer, rowLimit) -> { rows, missingColumns, rowLimitHit, totalParsed } */
  function parseWorkbook(arrayBuffer, rowLimit) {
    let wb;
    try { wb = XLSX.read(arrayBuffer, { type: "array", cellDates: true }); }
    catch (e) { return { rows: [], missingColumns: null, parseError: "Could not read this file — is it a valid .xlsx or .csv?", rowLimitHit: false, totalParsed: 0 }; }

    const sheet = wb.Sheets[wb.SheetNames[0]];
    const grid = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: true });
    if (!grid.length) return { rows: [], missingColumns: null, parseError: "The file has no rows.", rowLimitHit: false, totalParsed: 0 };

    const colMap = mapColumns(grid[0]);
    const missingColumns = REQUIRED.filter(k => colMap[k] == null);
    if (missingColumns.length) return { rows: [], missingColumns, parseError: null, rowLimitHit: false, totalParsed: 0 };

    const dataRows = grid.slice(1).filter(r => r.some(c => String(c).trim() !== ""));
    const totalParsed = dataRows.length;
    const rowLimitHit = totalParsed > rowLimit;
    const limited = rowLimitHit ? dataRows.slice(0, rowLimit) : dataRows;

    const rows = limited.map(r => ({
      empId: String(r[colMap.empId] == null ? "" : r[colMap.empId]).trim(),
      name: String(r[colMap.name] == null ? "" : r[colMap.name]).trim(),
      dob: parseDate(r[colMap.dob]),
      gender: normalizeGender(r[colMap.gender]),
      salary: colMap.salary != null ? parseSalary(r[colMap.salary]) : null,
      coverage: colMap.coverage != null ? normalizeCoverage(r[colMap.coverage]) : "Employee Only"
    }));

    return { rows, missingColumns: [], parseError: null, rowLimitHit, totalParsed };
  }

  window.XLSXImport = { parseWorkbook, HEADER_ALIASES, REQUIRED };
})();
