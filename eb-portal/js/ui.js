/* ============================================================
   UI helpers — formatting, lookups, shared components
   ============================================================ */
window.ACTIONS = window.ACTIONS || {};

(function () {
  const DAY = 86400000;

  /* ---------- formatting (India-first: INR) ---------- */
  const inr0 = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
  const num0 = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

  function fmtINR(n) { return n == null ? "—" : inr0.format(Math.round(n)); }
  function fmtNum(n) { return n == null ? "—" : num0.format(n); }
  function fmtCr(n) {
    if (n == null) return "—";
    const abs = Math.abs(n);
    if (abs >= 10000000) return "₹" + (n / 10000000).toFixed(abs % 10000000 === 0 ? 0 : 2).replace(/\.?0+$/, "") + "Cr";
    if (abs >= 100000) return "₹" + (n / 100000).toFixed(abs % 100000 === 0 ? 0 : 1).replace(/\.?0+$/, "") + "L";
    return fmtINR(n);
  }
  const omr3 = new Intl.NumberFormat("en-OM", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
  function currencyOf(k) { return (k && k.currency) || "INR"; }
  function geographyOf(k) { return (k && k.geography) || "India"; }
  function fmtMoney(n, currency) {
    currency = currency || "INR";
    if (n == null) return "—";
    if (currency === "OMR") return "OMR " + omr3.format(n);
    return fmtCr(n);
  }
  function fmtMoneyFull(n, currency) {
    currency = currency || "INR";
    if (n == null) return "—";
    if (currency === "OMR") return "OMR " + omr3.format(n);
    return fmtINR(n);
  }
  function fmtDate(d) { return d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"; }
  function daysUntil(d) { return Math.round((new Date(d).setHours(0, 0, 0, 0) - new Date(DB.TODAY).setHours(0, 0, 0, 0)) / DAY); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }

  function dueLabel(d) {
    const n = daysUntil(d);
    if (n < 0) return Math.abs(n) + (n === -1 ? " day ago" : " days ago");
    if (n === 0) return "Today";
    return "In " + n + (n === 1 ? " day" : " days");
  }

  /* ---------- lookups ---------- */
  const kase = id => DB.CASES.find(c => c.id === id);
  const salesExec = id => DB.SALES_EXECS.find(u => u.id === id) || {};
  const broker = id => id ? DB.BROKERS.find(b => b.id === id) : null;
  const underwriter = id => DB.UNDERWRITERS.find(u => u.id === id) || {};
  const initials = name => (name || "").split(/\s+/).filter(w => /^[A-Za-zÀ-ž]/.test(w)).slice(0, 2).map(w => w[0].toUpperCase()).join("");
  const companyOf = k => k.lead.companyName;
  const productsOf = k => (k.opportunity ? k.opportunity.products : k.lead.products) || [];

  /* ---------- pills ---------- */
  const PILL_MAP = {
    "Lead": "gray", "Qualified": "blue", "Opportunity Created": "blue", "Employer Profile Completed": "blue",
    "Census Uploaded": "amber", "Underwriting": "violet", "Quote Generated": "blue", "Proposal Shared": "blue",
    "Negotiation": "amber", "Approved": "green", "Paid": "green", "Policy Issued": "green",
    "Accepted": "green", "Rejected": "red", "Approve": "green", "Refer": "amber", "Reject": "red", "Request Information": "amber",
    "Pending": "amber", "Received": "green", "Reconciliation Pending": "amber", "Green": "green", "Amber": "amber", "Red": "red"
  };
  function pill(label) { return `<span class="pill pill-${PILL_MAP[label] || "gray"}">${esc(label)}</span>`; }

  function trafficChip(tl) {
    if (!tl) return "";
    const cls = tl === "Green" ? "tl-green" : tl === "Amber" ? "tl-amber" : "tl-red";
    const desc = tl === "Green" ? "Auto-approve eligible" : tl === "Amber" ? "Refer for review" : "Decline eligible — Senior UW only";
    return `<span class="traffic-light ${cls}"><span class="dot"></span>${tl} — ${esc(desc)}</span>`;
  }

  /* ---------- toasts ---------- */
  function toast(msg, kind = "ok") {
    const stack = document.getElementById("toastStack");
    const t = document.createElement("div");
    t.className = "toast " + kind;
    t.innerHTML = msg;
    stack.appendChild(t);
    setTimeout(() => { t.style.opacity = "0"; t.style.transition = "opacity .3s"; setTimeout(() => t.remove(), 320); }, 3800);
  }

  /* ---------- modal ---------- */
  const overlay = () => document.getElementById("modalOverlay");
  function openModal(title, bodyHtml, footHtml, wide) {
    document.getElementById("modalBox").className = "modal" + (wide ? " wide" : "");
    document.getElementById("modalBox").innerHTML = `
      <div class="modal-head"><div class="modal-title">${title}</div>
        <button class="modal-x" data-action="close-modal">&times;</button></div>
      <div class="modal-body">${bodyHtml}</div>
      ${footHtml ? `<div class="modal-foot">${footHtml}</div>` : ""}`;
    overlay().classList.add("open");
  }
  function closeModal() { overlay().classList.remove("open"); }

  /* ---------- CSV export ---------- */
  function exportCSV(filename, headers, rows) {
    const q = v => `"${String(v == null ? "" : v).replace(/"/g, '""')}"`;
    const csv = [headers.map(q).join(",")].concat(rows.map(r => r.map(q).join(","))).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" }));
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
    toast(`Exported <strong>${esc(filename)}</strong>`);
  }

  function downloadStub(filename, kind) {
    toast(`Preparing <strong>${esc(filename)}</strong> — ${kind || "document"} download will start shortly.`);
  }

  window.UI = {
    fmtINR, fmtNum, fmtCr, fmtMoney, fmtMoneyFull, currencyOf, geographyOf, fmtDate, daysUntil, dueLabel, esc,
    kase, salesExec, broker, underwriter, initials, companyOf, productsOf,
    pill, trafficChip, toast, openModal, closeModal, exportCSV, downloadStub
  };
})();
