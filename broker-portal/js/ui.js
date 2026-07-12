/* ============================================================
   UI helpers — formatting, lookups, components
   ============================================================ */
(function () {
  const DAY = 86400000;

  /* ---------- formatting ---------- */
  const gbp0 = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });
  const num0 = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });

  function fmtGBP(n) { return gbp0.format(Math.round(n)); }
  function fmtNum(n) { return num0.format(n); }
  function fmtM(n) { return n >= 1000000 ? "£" + (n / 1000000).toFixed(n % 1000000 === 0 ? 0 : 2).replace(/\.?0+$/, "") + "m" : n >= 1000 ? "£" + Math.round(n / 1000) + "k" : fmtGBP(n); }
  function fmtDate(d) { return d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"; }
  function daysUntil(d) { return Math.round((new Date(d).setHours(0,0,0,0) - new Date().setHours(0,0,0,0)) / DAY); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }

  function dueLabel(d) {
    const n = daysUntil(d);
    if (n < 0) return Math.abs(n) + (n === -1 ? " day ago" : " days ago");
    if (n === 0) return "Today";
    return "In " + n + (n === 1 ? " day" : " days");
  }

  function delta(pct, goodUp = true) {
    if (pct == null) return "";
    const up = pct >= 0;
    const good = goodUp ? up : !up;
    const arrow = up ? "&#8599;" : "&#8600;";
    return `<span class="delta ${good ? "up" : "down"}">${arrow} ${Math.abs(pct).toFixed(1)}%</span>`;
  }

  /* ---------- lookups ---------- */
  const client = id => DB.clients.find(c => c.id === id);
  const policy = id => DB.policies.find(p => p.id === id);
  const clientPolicies = cid => DB.policies.filter(p => p.clientId === cid);
  const clientName = cid => (client(cid) || { name: "—" }).name;
  const initials = name => name.split(/\s+/).filter(w => /^[A-Za-zÀ-ž]/.test(w)).slice(0, 2).map(w => w[0].toUpperCase()).join("");

  function insurerLabel(p) {
    if (p.market === DB.MARKETS.LLOYDS) return `${p.insurer} — Syndicate ${p.syndicate}`;
    return p.insurer;
  }

  /* ---------- pills ---------- */
  const PILL_MAP = {
    "In Force": "green", "Pending": "amber", "Lapsed": "gray", "Cancelled": "red",
    "Quote ready": "green", "Awaiting client": "amber", "Auto-renew": "blue", "Re-marketing": "violet", "Renewed": "green", "Lapsing": "gray",
    "Draft": "gray", "Presented": "blue", "Awaiting Client": "amber", "Bound": "green", "Declined": "red",
    "Open": "amber", "Under Review": "blue", "Approved": "violet", "Settled": "green",
    "Paid": "green", "Unpaid": "amber", "Overdue": "red", "Part-paid": "blue", "Outstanding": "amber"
  };
  function pill(label) { return `<span class="pill pill-${PILL_MAP[label] || "gray"}">${esc(label)}</span>`; }

  const MKT_COLOR = { "UK Insurer": "var(--s1)", "Lloyd's Market": "var(--s2)", "Reinsurance": "var(--s4)" };
  function mktTag(m) { return `<span class="mkt"><span class="mkt-dot" style="background:${MKT_COLOR[m]}"></span>${esc(m)}</span>`; }

  /* ---------- invoice derived status ---------- */
  function invoiceStatus(i) {
    if (i.status === "Paid") return "Paid";
    if (i.status === "Part-paid") return daysUntil(i.due) < 0 ? "Overdue" : "Part-paid";
    return daysUntil(i.due) < 0 ? "Overdue" : "Outstanding";
  }
  function invoiceBalance(i) { return i.status === "Paid" ? 0 : i.amount - (i.paidAmount || 0); }

  /* ---------- toasts ---------- */
  function toast(msg, kind = "ok") {
    const stack = document.getElementById("toastStack");
    const t = document.createElement("div");
    t.className = "toast " + kind;
    t.innerHTML = msg;
    stack.appendChild(t);
    setTimeout(() => { t.style.opacity = "0"; t.style.transition = "opacity .3s"; setTimeout(() => t.remove(), 320); }, 3600);
  }

  /* ---------- modal ---------- */
  const overlay = () => document.getElementById("modalOverlay");
  function openModal(title, bodyHtml, footHtml) {
    document.getElementById("modalBox").innerHTML = `
      <div class="modal-head"><div class="modal-title">${title}</div>
        <button class="modal-x" data-action="close-modal">&times;</button></div>
      <div class="modal-body">${bodyHtml}</div>
      ${footHtml ? `<div class="modal-foot">${footHtml}</div>` : ""}`;
    overlay().classList.add("open");
  }
  function closeModal() { overlay().classList.remove("open"); }

  /* ---------- chart tooltip (shared hover layer) ---------- */
  const tip = () => document.getElementById("chartTip");
  document.addEventListener("mousemove", e => {
    const t = e.target.closest("[data-tip]");
    const el = tip();
    if (t) {
      el.innerHTML = t.getAttribute("data-tip");
      el.classList.add("show");
      const w = el.offsetWidth, h = el.offsetHeight;
      let x = e.clientX + 14, y = e.clientY + 14;
      if (x + w > window.innerWidth - 8) x = e.clientX - w - 12;
      if (y + h > window.innerHeight - 8) y = e.clientY - h - 12;
      el.style.left = x + "px"; el.style.top = y + "px";
    } else el.classList.remove("show");
  });

  /* ---------- CSV export ---------- */
  function exportCSV(filename, headers, rows) {
    const q = v => `"${String(v == null ? "" : v).replace(/"/g, '""')}"`;
    const csv = [headers.map(q).join(",")].concat(rows.map(r => r.map(q).join(","))).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" }));
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
    toast(`Exported <strong>${filename}</strong>`);
  }

  /* ---------- product icons ---------- */
  const ICONS = {
    motor: '<svg viewBox="0 0 24 24"><path d="M4 13.5 5.8 8.2A2 2 0 0 1 7.7 7h8.6a2 2 0 0 1 1.9 1.2L20 13.5"/><path d="M3.5 13.5h17a1 1 0 0 1 1 1V17a1 1 0 0 1-1 1h-17a1 1 0 0 1-1-1v-2.5a1 1 0 0 1 1-1z"/><circle cx="7" cy="18" r="1.6"/><circle cx="17" cy="18" r="1.6"/></svg>',
    home: '<svg viewBox="0 0 24 24"><path d="m3.5 11 8.5-7 8.5 7"/><path d="M5.5 9.5V20h13V9.5"/><path d="M10 20v-5.5h4V20"/></svg>',
    health: '<svg viewBox="0 0 24 24"><path d="M12 20.5S3.5 15.6 3.5 9.6A4.6 4.6 0 0 1 12 7a4.6 4.6 0 0 1 8.5 2.6c0 6-8.5 10.9-8.5 10.9z"/></svg>',
    specialty: '<svg viewBox="0 0 24 24"><path d="M3 18.5c1.5 1 3 1 4.5 0s3-1 4.5 0 3 1 4.5 0 3-1 4.5 0"/><path d="M5 15 6.5 6.5h11L19 15"/><path d="M12 6.5v-3"/></svg>',
    ri: '<svg viewBox="0 0 24 24"><path d="M12 2.5 20 6v6c0 5-3.4 8.3-8 9.5C7.4 20.3 4 17 4 12V6z"/><path d="M8.5 12.5 11 15l4.5-5"/></svg>'
  };

  window.UI = { fmtGBP, fmtNum, fmtM, fmtDate, daysUntil, dueLabel, delta, esc, client, policy, clientPolicies, clientName, initials, insurerLabel, pill, mktTag, MKT_COLOR, invoiceStatus, invoiceBalance, toast, openModal, closeModal, exportCSV, ICONS };
})();
