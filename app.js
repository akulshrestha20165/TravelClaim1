const STORAGE_KEY = "wayfare-travel-claims-v1";

const initialState = {
  authorizations: [
    { id: "TA-2026-084", destination: "New York, NY", purpose: "Product design summit", dates: "Oct 12 – Oct 16, 2026", status: "Approved", limit: 2400, spent: 1386.40 },
    { id: "TA-2026-061", destination: "San Francisco, CA", purpose: "Customer research visits", dates: "Sep 8 – Sep 11, 2026", status: "Approved", limit: 1800, spent: 957.20 },
    { id: "TA-2026-039", destination: "Chicago, IL", purpose: "Quarterly planning", dates: "Aug 3 – Aug 5, 2026", status: "Approved", limit: 1250, spent: 1120 },
    { id: "TA-2026-090", destination: "London, UK", purpose: "Industry conference", dates: "Nov 18 – Nov 22, 2026", status: "Pending", limit: 3200, spent: 0 }
  ],
  policies: [
    { title: "Meals & incidentals", limit: "$75 per day", detail: "Reasonable meal expenses while traveling. Alcohol is not reimbursable.", icon: "◷" },
    { title: "Hotel accommodation", limit: "$300 per night", detail: "Choose standard business accommodation. Itemized folio required.", icon: "⌂" },
    { title: "Ground transport", limit: "Economy preferred", detail: "Use public transit or standard rideshare. Premium rides need a reason.", icon: "↗" },
    { title: "Receipt requirements", limit: "Required over $25", detail: "Attach an itemized receipt and submit within 30 days of your trip.", icon: "▤" }
  ],
  claims: [
    { id: "CL-2026-128", title: "New York design summit", authorizationId: "TA-2026-084", submitted: "Oct 19, 2026", status: "In review", expenses: [{ merchant: "The Hoxton Williamsburg", category: "Hotel", date: "Oct 12, 2026", amount: 846.4, receipt: "hoxton-folio.jpg" }, { merchant: "Delta Air Lines", category: "Airfare", date: "Oct 12, 2026", amount: 420, receipt: "delta-itinerary.pdf" }] },
    { id: "CL-2026-117", title: "San Francisco customer visits", authorizationId: "TA-2026-061", submitted: "Oct 10, 2026", status: "In review", expenses: [{ merchant: "Marriott Union Square", category: "Hotel", date: "Sep 8, 2026", amount: 657.2, receipt: "marriott-folio.pdf" }] },
    { id: "CL-2026-102", title: "Chicago quarterly planning", authorizationId: "TA-2026-039", submitted: "Oct 2, 2026", status: "Draft", expenses: [{ merchant: "United Airlines", category: "Airfare", date: "Aug 3, 2026", amount: 362, receipt: "united-receipt.pdf" }] }
  ]
};

function loadState() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (stored && Array.isArray(stored.claims) && Array.isArray(stored.authorizations)) return stored;
  } catch (error) {
    console.warn("Saved claims could not be loaded; using the sample workspace.", error);
  }
  return structuredClone(initialState);
}

let state = loadState();
let activeView = "dashboard";
let searchTerm = "";
let statusFilter = "all";

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error("Your changes could not be saved in this browser.", error);
    toast("Changes could not be saved in this browser.");
  }
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function money(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value || 0);
}

function claimTotal(claim) {
  return claim.expenses.reduce((total, expense) => total + Number(expense.amount || 0), 0);
}

function authorizationFor(claim) {
  return state.authorizations.find((authorization) => authorization.id === claim.authorizationId);
}

function statusClass(status) {
  return ({ "In review": "status-review", Draft: "status-draft", Approved: "status-approved", Paid: "status-paid" })[status] || "status-draft";
}

function toast(message) {
  const root = document.getElementById("toast-root");
  const element = document.createElement("div");
  element.className = "toast";
  element.textContent = message;
  root.appendChild(element);
  window.setTimeout(() => element.remove(), 3200);
}

function statIcon(kind) {
  const paths = {
    receipt: '<path d="M6 3.5h12v17l-3-1.8-3 1.8-3-1.8-3 1.8v-17Z"/><path d="M9 8h6M9 12h6"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/>',
    check: '<path d="m5 12 4.5 4.5L19 7"/>',
    wallet: '<rect x="3.5" y="6" width="17" height="14" rx="2"/><path d="M3.5 9h17M16 14h2"/><path d="M6 6V4.5a1 1 0 0 1 1-1h12"/>'
  };
  return `<span class="stat-icon ${kind}"><svg viewBox="0 0 24 24">${paths[kind]}</svg></span>`;
}

function claimRows(claims) {
  if (!claims.length) return '<tr><td class="empty-row" colspan="5">No travel claims match your filters.</td></tr>';
  return claims.map((claim) => `<tr data-claim="${escapeHtml(claim.id)}">
    <td><div class="claim-name">${escapeHtml(claim.title)}</div><div class="claim-id">${escapeHtml(claim.id)}</div></td>
    <td>${escapeHtml(authorizationFor(claim)?.destination || "—")}</td>
    <td>${escapeHtml(claim.submitted)}</td>
    <td><span class="status ${statusClass(claim.status)}">${escapeHtml(claim.status)}</span></td>
    <td class="amount">${money(claimTotal(claim))}</td>
  </tr>`).join("");
}

function claimsTable(claims, includeFilters = false) {
  return `<div class="panel">
    <div class="panel-heading">
      <div><h2 class="panel-title">${includeFilters ? "All travel claims" : "Outstanding claims"}</h2><div class="panel-caption">${claims.length} ${claims.length === 1 ? "claim" : "claims"} · Click a claim to view details</div></div>
      ${includeFilters ? `<div class="filter-row"><input class="search-input" id="claim-search" type="search" placeholder="Search claims" value="${escapeHtml(searchTerm)}" aria-label="Search claims"><select class="filter-select" id="claim-filter" aria-label="Filter by status"><option value="all" ${statusFilter === "all" ? "selected" : ""}>All statuses</option><option value="In review" ${statusFilter === "In review" ? "selected" : ""}>In review</option><option value="Draft" ${statusFilter === "Draft" ? "selected" : ""}>Draft</option><option value="Approved" ${statusFilter === "Approved" ? "selected" : ""}>Approved</option><option value="Paid" ${statusFilter === "Paid" ? "selected" : ""}>Paid</option></select></div>` : '<button class="text-button" data-view="claims">View all claims →</button>'}
    </div>
    <div class="table-wrap"><table class="claim-table"><thead><tr><th>Claim</th><th>Destination</th><th>Submitted</th><th>Status</th><th>Amount</th></tr></thead><tbody>${claimRows(claims)}</tbody></table></div>
  </div>`;
}

function policyCard() {
  return `<section class="panel policy-card"><h2 class="panel-title">A few things to know</h2><p class="policy-intro">Keep these guidelines in mind when submitting.</p>
    ${state.policies.slice(0, 3).map((policy) => `<div class="policy-item"><span class="policy-dot">${escapeHtml(policy.icon)}</span><div class="policy-copy"><strong>${escapeHtml(policy.title)} · ${escapeHtml(policy.limit)}</strong><span>${escapeHtml(policy.detail)}</span></div></div>`).join("")}
    <button class="inline-policy-link" data-view="policies">See all travel policies →</button></section>`;
}

function authorizationCard(authorization) {
  const spent = state.claims.filter((claim) => claim.authorizationId === authorization.id).reduce((sum, claim) => sum + claimTotal(claim), 0);
  const percent = Math.min(100, Math.round((spent / authorization.limit) * 100));
  return `<section class="panel authorization-card"><div class="authorization-header"><div><h3>${escapeHtml(authorization.destination)}</h3><p class="subline">${escapeHtml(authorization.id)} · ${escapeHtml(authorization.dates)}</p></div><span class="approved-badge">${escapeHtml(authorization.status)}</span></div>
    <div class="authorization-meta"><span>Authorization limit</span><strong>${money(authorization.limit)}</strong></div>
    <div class="progress-track"><div class="progress-fill" style="width:${percent}%"></div></div>
    <div class="progress-caption"><span>${money(spent)} claimed</span><span>${money(Math.max(0, authorization.limit - spent))} remaining</span></div></section>`;
}

function renderDashboard() {
  const outstanding = state.claims.filter((claim) => claim.status === "In review" || claim.status === "Draft");
  const outstandingAmount = outstanding.reduce((sum, claim) => sum + claimTotal(claim), 0);
  const reviewAmount = state.claims.filter((claim) => claim.status === "In review").reduce((sum, claim) => sum + claimTotal(claim), 0);
  const totalExpenses = state.claims.reduce((sum, claim) => sum + claimTotal(claim), 0);
  const approvedAuthorization = state.authorizations.find((item) => item.status === "Approved");
  const recent = [...outstanding].sort((a, b) => b.submitted.localeCompare(a.submitted)).slice(0, 4);
  const today = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(new Date());
  return `<div class="page">
    <div class="page-heading"><div><div class="eyebrow">${escapeHtml(today)}</div><h1>Good morning, Jordan <span aria-hidden="true">✳</span></h1><p class="page-subtitle">A clear view of your travel spending and claims.</p></div><button class="button-primary" data-action="new-claim"><span class="plus">+</span> New claim</button></div>
    <section class="stats-grid" aria-label="Travel claim summary">
      <div class="stat-card"><div class="stat-top"><span>Outstanding claims</span>${statIcon("receipt")}</div><div class="stat-value">${outstanding.length}</div><div class="stat-note">${state.claims.filter((c) => c.status === "Draft").length} draft · ${state.claims.filter((c) => c.status === "In review").length} in review</div></div>
      <div class="stat-card"><div class="stat-top"><span>Awaiting reimbursement</span>${statIcon("wallet")}</div><div class="stat-value">${money(outstandingAmount)}</div><div class="stat-note">Across all outstanding claims</div></div>
      <div class="stat-card"><div class="stat-top"><span>In review</span>${statIcon("clock")}</div><div class="stat-value">${money(reviewAmount)}</div><div class="stat-note">Usually reviewed within 5 business days</div></div>
      <div class="stat-card"><div class="stat-top"><span>Trip budget used</span>${statIcon("check")}</div><div class="stat-value">${money(totalExpenses)}</div><div class="stat-note"><span class="positive">↗</span> Across your travel claims</div></div>
    </section>
    <div class="content-grid">
      <div>${claimsTable(recent)}<div class="quick-tip section-spacer"><span class="quick-tip-icon">✳</span><div><strong>Make your next claim in minutes</strong><p>Upload a receipt and we'll prefill the expense details for you to review.</p></div><button class="text-button" data-action="new-claim">Get started →</button></div></div>
      <div class="side-stack">${approvedAuthorization ? authorizationCard(approvedAuthorization) : ""}${policyCard()}</div>
    </div>
  </div>`;
}

function renderClaims() {
  const filtered = state.claims.filter((claim) => {
    const query = searchTerm.toLowerCase();
    const matchesText = !query || `${claim.title} ${claim.id} ${authorizationFor(claim)?.destination || ""}`.toLowerCase().includes(query);
    return matchesText && (statusFilter === "all" || claim.status === statusFilter);
  });
  return `<div class="page"><div class="page-heading"><div><div class="eyebrow">YOUR TRAVEL SPEND</div><h1>My claims</h1><p class="page-subtitle">Track reimbursements, edit drafts, and add your trip receipts.</p></div><button class="button-primary" data-action="new-claim"><span class="plus">+</span> New claim</button></div>${claimsTable(filtered, true)}</div>`;
}

function renderAuthorizations() {
  return `<div class="page"><div class="page-heading"><div><div class="eyebrow">PLAN YOUR TRIPS</div><h1>Authorizations</h1><p class="page-subtitle">Every claim is linked to an approved travel authorization and its budget.</p></div><span class="approved-badge">${state.authorizations.filter((a) => a.status === "Approved").length} approved</span></div>
    <div class="content-grid"><div class="side-stack">${state.authorizations.map((authorization) => authorizationCard(authorization)).join("")}</div><div class="side-stack">${policyCard()}<section class="quick-tip"><span class="quick-tip-icon">✳</span><div><strong>Claim against an approved trip</strong><p>Only approved authorizations can be selected when creating a claim. This keeps dates, destinations, and approved budgets together.</p></div></section></div></div></div>`;
}

function renderPolicies() {
  return `<div class="page"><div class="page-heading"><div><div class="eyebrow">BEFORE YOU SUBMIT</div><h1>Travel policies</h1><p class="page-subtitle">Quick reimbursement guidelines for your business trips.</p></div></div>
    <div class="directory-grid">${state.policies.map((policy) => `<section class="panel directory-card"><span class="policy-dot">${escapeHtml(policy.icon)}</span><h3>${escapeHtml(policy.title)}</h3><p>${escapeHtml(policy.detail)}</p><div class="rule-list"><div class="rule-row"><span>Guideline</span><strong>${escapeHtml(policy.limit)}</strong></div><div class="rule-row"><span>Applies to</span><strong>All business trips</strong></div></div></section>`).join("")}</div>
    <div class="policy-note section-spacer">These guidelines are a summary for employees. If a trip-specific authorization sets a lower limit, the authorization limit applies. Contact the travel team if you have questions about an exception.</div>
  </div>`;
}

function render() {
  const root = document.getElementById("view-root");
  const views = { dashboard: renderDashboard, claims: renderClaims, authorizations: renderAuthorizations, policies: renderPolicies };
  root.innerHTML = views[activeView]();
  document.querySelectorAll(".nav-link").forEach((button) => button.classList.toggle("active", button.dataset.view === activeView));
  document.getElementById("breadcrumb-current").textContent = ({ dashboard: "Overview", claims: "My claims", authorizations: "Authorizations", policies: "Travel policies" })[activeView];
  document.getElementById("nav-claim-count").textContent = String(state.claims.filter((claim) => claim.status === "In review" || claim.status === "Draft").length);
}

function closeModal() {
  document.getElementById("modal-root").innerHTML = "";
}

function openNewClaimModal() {
  const approved = state.authorizations.filter((authorization) => authorization.status === "Approved");
  if (!approved.length) {
    toast("You need an approved travel authorization before creating a claim.");
    return;
  }
  document.getElementById("modal-root").innerHTML = `<div class="modal-backdrop" data-action="backdrop-close"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
    <div class="modal-header"><div><h2 id="modal-title">Start a travel claim</h2><p>Your claim will follow the limits and details in its approved authorization.</p></div><button class="close-button" data-action="close-modal" aria-label="Close">×</button></div>
    <form id="new-claim-form"><div class="form-grid">
      <div class="form-field full"><label for="claim-authorization">Approved authorization</label><select class="form-control" id="claim-authorization" name="authorizationId" required>${approved.map((authorization) => `<option value="${escapeHtml(authorization.id)}">${escapeHtml(authorization.id)} · ${escapeHtml(authorization.destination)} · ${escapeHtml(authorization.purpose)}</option>`).join("")}</select></div>
      <div class="form-field full"><label for="claim-title">Claim name</label><input class="form-control" id="claim-title" name="title" maxlength="70" placeholder="e.g. New York design summit" required></div>
    </div><div id="authorization-context" class="authorization-context"></div>
    <div class="modal-footer"><button type="button" class="button-secondary" data-action="close-modal">Cancel</button><button type="submit" class="button-primary">Create claim</button></div></form>
  </section></div>`;
  const select = document.getElementById("claim-authorization");
  const updateContext = () => {
    const authorization = state.authorizations.find((item) => item.id === select.value);
    document.getElementById("authorization-context").innerHTML = `<span><strong>${escapeHtml(authorization.destination)}</strong><br>${escapeHtml(authorization.dates)}</span><span>Approved budget<br><strong>${money(authorization.limit)}</strong></span>`;
    const title = document.getElementById("claim-title");
    if (!title.value) title.value = authorization.purpose;
  };
  select.addEventListener("change", updateContext);
  updateContext();
  document.getElementById("new-claim-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const authorization = state.authorizations.find((item) => item.id === formData.get("authorizationId"));
    if (!authorization || authorization.status !== "Approved") {
      toast("Choose an approved travel authorization.");
      return;
    }
    const claim = { id: `CL-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`, title: String(formData.get("title")).trim(), authorizationId: authorization.id, submitted: "Draft", status: "Draft", expenses: [] };
    if (!claim.title) return;
    state.claims.unshift(claim);
    persist();
    render();
    openClaimModal(claim.id);
    toast("Claim created. Add your receipts to get started.");
  });
}

function parseReceiptText(text, filename) {
  const result = { merchant: filename.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "), amount: "", date: "", category: "Other" };
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const totalMatch = text.match(/(?:grand\s+total|total|amount\s+due|charged|balance)\s*[:\-]?\s*[$€£]?\s*(\d{1,6}(?:[.,]\d{2})?)/i);
  const currencyMatch = text.match(/[$€£]\s*(\d{1,6}(?:[.,]\d{2})?)/);
  const amountText = totalMatch?.[1] || currencyMatch?.[1];
  if (amountText) result.amount = amountText.replace(",", ".");
  const dateMatch = text.match(/\b(20\d{2})[-/](\d{1,2})[-/](\d{1,2})\b|\b(\d{1,2})[-/](\d{1,2})[-/](20\d{2})\b/);
  if (dateMatch) {
    const iso = dateMatch[1] ? `${dateMatch[1]}-${dateMatch[2].padStart(2, "0")}-${dateMatch[3].padStart(2, "0")}` : `${dateMatch[6]}-${dateMatch[4].padStart(2, "0")}-${dateMatch[5].padStart(2, "0")}`;
    result.date = iso;
  }
  if (/hotel|inn|resort|lodging/i.test(text)) result.category = "Hotel";
  else if (/airline|flight|airways|boarding/i.test(text)) result.category = "Airfare";
  else if (/restaurant|cafe|coffee|diner|meal/i.test(text)) result.category = "Meals";
  else if (/taxi|uber|lyft|transit|parking/i.test(text)) result.category = "Ground transport";
  if (lines.length > 0 && !/^(receipt|invoice|tax invoice)$/i.test(lines[0])) result.merchant = lines[0].slice(0, 60);
  return result;
}

function openClaimModal(claimId) {
  const claim = state.claims.find((item) => item.id === claimId);
  if (!claim) return;
  const authorization = authorizationFor(claim);
  const remaining = Math.max(0, authorization.limit - claimTotal(claim));
  document.getElementById("modal-root").innerHTML = `<div class="modal-backdrop" data-action="backdrop-close"><section class="modal modal-wide" role="dialog" aria-modal="true" aria-labelledby="modal-title">
    <div class="modal-header"><div><div class="eyebrow">${escapeHtml(claim.id)} · ${escapeHtml(claim.status)}</div><h2 id="modal-title">${escapeHtml(claim.title)}</h2><p>${escapeHtml(authorization.destination)} · ${escapeHtml(authorization.dates)}</p></div><button class="close-button" data-action="close-modal" aria-label="Close">×</button></div>
    <div class="claim-detail-grid"><div class="detail-pair"><span>Approved authorization</span><strong>${escapeHtml(authorization.id)} · ${escapeHtml(authorization.purpose)}</strong></div><div class="detail-pair"><span>Approved trip budget</span><strong>${money(authorization.limit)}</strong></div></div>
    <div class="form-field"><label>Attach receipt and create expense</label><label class="receipt-drop"><span><strong>＋ Choose a receipt</strong><span>Images and documents attach to your expense. Text receipts can prefill merchant, date, and total on this device.</span></span><input id="receipt-file" type="file" accept="image/*,.pdf,.txt,.csv" aria-label="Choose a receipt file"></label><div id="receipt-file-name" class="receipt-file">No receipt selected</div></div>
    <form id="expense-form" class="section-spacer"><div class="form-grid">
      <div class="form-field"><label for="expense-merchant">Merchant</label><input class="form-control" id="expense-merchant" name="merchant" maxlength="70" placeholder="e.g. City Cafe" required></div>
      <div class="form-field"><label for="expense-amount">Amount (USD)</label><input class="form-control" id="expense-amount" name="amount" type="number" min="0.01" step="0.01" placeholder="0.00" required></div>
      <div class="form-field"><label for="expense-category">Category</label><select class="form-control" id="expense-category" name="category"><option>Airfare</option><option>Hotel</option><option>Meals</option><option>Ground transport</option><option>Other</option></select></div>
      <div class="form-field"><label for="expense-date">Expense date</label><input class="form-control" id="expense-date" name="date" type="date" required></div>
      <div class="form-field full"><p class="form-hint" id="receipt-hint">Receipt images and PDFs are attached to the expense. Review the details, then add it to this claim.</p></div>
    </div><div class="modal-footer" style="justify-content:space-between"><span class="form-hint">Available authorization balance: <strong>${money(remaining)}</strong></span><button type="submit" class="button-primary">Add expense</button></div></form>
    <div class="expense-list" id="expense-list">${expenseRows(claim)}</div>
    <div class="expense-total"><span>Claim total · ${claim.expenses.length} ${claim.expenses.length === 1 ? "expense" : "expenses"}</span><strong>${money(claimTotal(claim))}</strong></div>
    <div class="policy-note">Claims must match the approved travel authorization. ${escapeHtml(state.policies.find((policy) => /receipt/i.test(policy.title))?.detail || "Attach an itemized receipt to each expense.")}</div>
    <div class="modal-footer"><button class="button-secondary" data-action="close-modal">Close</button><button class="button-primary" data-action="submit-claim" data-claim-id="${escapeHtml(claim.id)}">Submit claim</button></div>
  </section></div>`;

  const fileInput = document.getElementById("receipt-file");
  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      fileInput.value = "";
      toast("Receipts must be smaller than 10 MB.");
      return;
    }
    document.getElementById("receipt-file-name").textContent = `${file.name} · ${(file.size / 1024).toFixed(0)} KB`;
    let parsed = { merchant: file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "), amount: "", date: "", category: "Other" };
    if (/\.(txt|csv)$/i.test(file.name)) {
      const text = await file.text();
      parsed = parseReceiptText(text, file.name);
      document.getElementById("receipt-hint").textContent = "Details were prefilled from this text receipt. Review and correct them before adding the expense.";
    } else {
      document.getElementById("receipt-hint").textContent = "Receipt attached. Enter the merchant, total, category, and date shown on the receipt.";
    }
    document.getElementById("expense-merchant").value = parsed.merchant;
    document.getElementById("expense-amount").value = parsed.amount;
    document.getElementById("expense-category").value = parsed.category;
    document.getElementById("expense-date").value = parsed.date || new Date().toISOString().slice(0, 10);
  });

  document.getElementById("expense-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const file = fileInput.files?.[0];
    let receiptData = "";
    if (file && file.type.startsWith("image/")) {
      receiptData = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("The selected receipt image could not be read."));
        reader.readAsDataURL(file);
      }).catch((error) => {
        console.error(error);
        toast(error.message);
        return "";
      });
    }
    const expense = { merchant: String(formData.get("merchant")).trim(), amount: Number(formData.get("amount")), category: String(formData.get("category")), date: String(formData.get("date")), receipt: file?.name || "", receiptData };
    if (!expense.merchant || !Number.isFinite(expense.amount) || expense.amount <= 0 || !expense.date) {
      toast("Enter a merchant, a valid amount, and an expense date.");
      return;
    }
    claim.expenses.push(expense);
    persist();
    render();
    openClaimModal(claim.id);
    toast("Expense added to your claim.");
  });
}

function expenseRows(claim) {
  if (!claim.expenses.length) return '<p class="form-hint" style="padding:8px 2px">No expenses added yet. Attach a receipt and enter the details above.</p>';
  return claim.expenses.map((expense, index) => `<div class="expense-item"><span class="receipt-icon">${expense.receiptData ? "▧" : "▤"}</span><div class="expense-copy"><strong>${escapeHtml(expense.merchant)} · ${escapeHtml(expense.category)}</strong><span>${escapeHtml(expense.date)}${expense.receipt ? ` · ${escapeHtml(expense.receipt)}` : " · No receipt attached"}</span></div><span class="expense-value">${money(expense.amount)}</span><button class="remove-expense" data-action="remove-expense" data-claim-id="${escapeHtml(claim.id)}" data-index="${index}" aria-label="Remove ${escapeHtml(expense.merchant)}">×</button></div>`).join("");
}

document.addEventListener("click", (event) => {
  const target = event.target.closest("[data-view], [data-action], [data-claim]");
  if (!target) return;
  if (target.dataset.view) {
    activeView = target.dataset.view;
    render();
  } else if (target.dataset.claim) {
    openClaimModal(target.dataset.claim);
  } else if (target.dataset.action === "new-claim") {
    openNewClaimModal();
  } else if (target.dataset.action === "close-modal" || (target.dataset.action === "backdrop-close" && event.target === target)) {
    closeModal();
  } else if (target.dataset.action === "remove-expense") {
    const claim = state.claims.find((item) => item.id === target.dataset.claimId);
    if (!claim) return;
    claim.expenses.splice(Number(target.dataset.index), 1);
    persist();
    render();
    openClaimModal(claim.id);
    toast("Expense removed from the claim.");
  } else if (target.dataset.action === "submit-claim") {
    const claim = state.claims.find((item) => item.id === target.dataset.claimId);
    if (!claim) return;
    if (!claim.expenses.length) {
      toast("Add at least one expense before submitting.");
      return;
    }
    const authorization = authorizationFor(claim);
    if (!authorization || authorization.status !== "Approved") {
      toast("This claim must be linked to an approved authorization.");
      return;
    }
    if (claimTotal(claim) > authorization.limit) {
      toast("This claim exceeds the approved trip budget. Remove or adjust expenses before submitting.");
      return;
    }
    claim.status = "In review";
    claim.submitted = new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", year: "numeric" }).format(new Date());
    persist();
    closeModal();
    render();
    toast("Claim submitted for review.");
  }
});

document.addEventListener("input", (event) => {
  if (event.target.id === "claim-search") {
    const caret = event.target.selectionStart;
    searchTerm = event.target.value;
    render();
    const input = document.getElementById("claim-search");
    input.focus();
    input.setSelectionRange(caret, caret);
  }
});

document.addEventListener("change", (event) => {
  if (event.target.id === "claim-filter") {
    statusFilter = event.target.value;
    render();
  }
});

document.addEventListener("submit", (event) => {
  if (event.target.id === "new-claim-form") return;
});

render();
