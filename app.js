/* ---------------------------------------------------------------
   Household Ledger — app logic
   Uses Firebase Auth (a single shared account, gated by the
   password on the login screen) and Firestore (shared data,
   visible to everyone who signs in).
--------------------------------------------------------------- */

const EXPENSE_CATEGORIES = ["Groceries", "Housing", "Utilities", "Transport", "Dining Out", "Entertainment", "Health", "Shopping", "Subscriptions", "Travel", "Other"];
const INCOME_CATEGORIES = ["Salary", "Freelance", "Gift", "Interest", "Other Income"];

const CATEGORY_COLORS = {
  "Groceries": "#5B8A6E", "Housing": "#3F6B7A", "Utilities": "#7A6A9A", "Transport": "#B98B2E",
  "Dining Out": "#A34A32", "Entertainment": "#C2694C", "Health": "#4E8C8C", "Shopping": "#8C6B4E",
  "Subscriptions": "#6B7A4E", "Travel": "#3F5B7A", "Other": "#7A7A72"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let allTransactions = [];
let allBudgets = {};       // category -> limit
let selectedMonth = null;  // "YYYY-MM"
let currentType = "expense";
let categoryChart, trendChart;
let editingId = null;

const $ = (id) => document.getElementById(id);
const money = (n) => (n < 0 ? "-$" : "$") + Math.abs(n).toFixed(2);
const monthLabel = (ym) => {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
};
const thisMonthStr = () => new Date().toISOString().slice(0, 7);

/* ---------------- Auth ---------------- */

// Prefill the email field with the shared address so people don't have
// to remember it — they can still edit it, but the default is correct.
$("email").value = SHARED_LOGIN_EMAIL;

$("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = $("email").value.trim();
  const password = $("password").value;
  const btn = $("login-btn");
  const errorEl = $("login-error");
  errorEl.hidden = true;
  btn.disabled = true;
  btn.textContent = "Opening…";
  try {
    await auth.signInWithEmailAndPassword(email, password);
  } catch (err) {
    errorEl.textContent = "That email or password didn't work. Try again.";
    errorEl.hidden = false;
  } finally {
    btn.disabled = false;
    btn.textContent = "Open ledger";
  }
});

$("logout-btn").addEventListener("click", () => auth.signOut());

auth.onAuthStateChanged((user) => {
  if (user) {
    $("login-screen").hidden = true;
    $("app-screen").hidden = false;
    $("password").value = "";
    startListeners();
  } else {
    $("login-screen").hidden = false;
    $("app-screen").hidden = true;
    stopListeners();
  }
});

/* ---------------- Firestore listeners ---------------- */

let unsubTx = null, unsubBudgets = null;

function startListeners() {
  unsubTx = db.collection("transactions").orderBy("date", "desc")
    .onSnapshot((snap) => {
      allTransactions = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      ensureMonthOptions();
      renderAll();
    }, (err) => console.error("transactions listener:", err));

  unsubBudgets = db.collection("budgets").onSnapshot((snap) => {
    allBudgets = {};
    snap.docs.forEach((d) => { allBudgets[d.data().category] = d.data().limit; });
    renderBudgets();
  }, (err) => console.error("budgets listener:", err));
}

function stopListeners() {
  if (unsubTx) unsubTx();
  if (unsubBudgets) unsubBudgets();
  allTransactions = [];
  allBudgets = {};
}

/* ---------------- Category selects ---------------- */

function fillCategorySelect(select, list) {
  select.innerHTML = list.map((c) => `<option value="${c}">${c}</option>`).join("");
}

function refreshEntryCategories() {
  fillCategorySelect($("category"), currentType === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES);
}

[$("type-expense"), $("type-income")].forEach((btn) => {
  btn.addEventListener("click", () => {
    currentType = btn.dataset.type;
    $("type-expense").classList.toggle("active", currentType === "expense");
    $("type-income").classList.toggle("active", currentType === "income");
    refreshEntryCategories();
  });
});

/* ---------------- Add entry ---------------- */

$("entry-date").valueAsDate = new Date();
refreshEntryCategories();
fillCategorySelect($("budget-category"), EXPENSE_CATEGORIES);

$("entry-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const amount = parseFloat($("amount").value);
  if (!amount || amount <= 0) return;
  await db.collection("transactions").add({
    type: currentType,
    amount,
    category: $("category").value,
    date: $("entry-date").value,
    note: $("note").value.trim(),
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  $("entry-form").reset();
  $("entry-date").valueAsDate = new Date();
  refreshEntryCategories();
});

/* ---------------- Month selector ---------------- */

function ensureMonthOptions() {
  const months = new Set(allTransactions.map((t) => t.date.slice(0, 7)));
  months.add(thisMonthStr());
  const sorted = Array.from(months).sort().reverse();
  if (!selectedMonth) selectedMonth = thisMonthStr();
  const select = $("month-select");
  const prevValue = select.value;
  select.innerHTML = sorted.map((m) => `<option value="${m}">${monthLabel(m)}</option>`).join("");
  select.value = sorted.includes(selectedMonth) ? selectedMonth : sorted[0];
  selectedMonth = select.value;
}

$("month-select").addEventListener("change", (e) => {
  selectedMonth = e.target.value;
  renderAll();
});

/* ---------------- Rendering ---------------- */

function renderAll() {
  renderBalance();
  renderHistory();
  renderBudgets();
  renderCharts();
}

function renderBalance() {
  const total = allTransactions.reduce((sum, t) => sum + (t.type === "income" ? t.amount : -t.amount), 0);
  $("balance-amount").textContent = money(total);
  $("balance-amount").classList.toggle("negative", total < 0);
}

function monthTransactions(ym) {
  return allTransactions.filter((t) => t.date.slice(0, 7) === ym);
}

function renderHistory() {
  const entries = monthTransactions(selectedMonth);
  const body = $("history-body");
  $("history-count").textContent = entries.length ? `${entries.length} entr${entries.length === 1 ? "y" : "ies"}` : "";
  if (!entries.length) {
    body.innerHTML = `<tr id="history-empty"><td colspan="5" class="muted">No entries yet for ${monthLabel(selectedMonth)}.</td></tr>`;
    return;
  }
  body.innerHTML = entries.map((t) => `
    <tr data-id="${t.id}">
      <td>${formatDate(t.date)}</td>
      <td><span class="cat-dot" style="background:${CATEGORY_COLORS[t.category] || "#7A7A72"}"></span>${t.category}</td>
      <td class="muted">${t.note || ""}</td>
      <td class="num ${t.type}">${t.type === "income" ? "+" : "−"}${money(t.amount).replace("-", "")}</td>
      <td class="row-actions">
        <button class="icon-btn edit-btn" data-id="${t.id}" title="Edit">Edit</button>
        <button class="icon-btn delete-btn" data-id="${t.id}" title="Delete">Delete</button>
      </td>
    </tr>`).join("");

  body.querySelectorAll(".delete-btn").forEach((b) => b.addEventListener("click", () => deleteEntry(b.dataset.id)));
  body.querySelectorAll(".edit-btn").forEach((b) => b.addEventListener("click", () => openEditDialog(b.dataset.id)));
}

function formatDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

async function deleteEntry(id) {
  if (!confirm("Delete this entry? This can't be undone.")) return;
  await db.collection("transactions").doc(id).delete();
}

/* ---------------- Edit dialog ---------------- */

fillCategorySelect($("edit-category"), [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES]);

function openEditDialog(id) {
  const t = allTransactions.find((x) => x.id === id);
  if (!t) return;
  editingId = id;
  $("edit-amount").value = t.amount;
  $("edit-category").value = t.category;
  $("edit-date").value = t.date;
  $("edit-note").value = t.note || "";
  $("edit-dialog").showModal();
}

$("edit-cancel").addEventListener("click", () => $("edit-dialog").close());

$("edit-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!editingId) return;
  await db.collection("transactions").doc(editingId).update({
    amount: parseFloat($("edit-amount").value),
    category: $("edit-category").value,
    date: $("edit-date").value,
    note: $("edit-note").value.trim()
  });
  editingId = null;
  $("edit-dialog").close();
});

/* ---------------- Budgets ---------------- */

$("add-budget-btn").addEventListener("click", () => $("budget-dialog").showModal());
$("budget-cancel").addEventListener("click", () => $("budget-dialog").close());

$("budget-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const category = $("budget-category").value;
  const limit = parseFloat($("budget-limit").value);
  await db.collection("budgets").doc(category).set({ category, limit });
  $("budget-form").reset();
  $("budget-dialog").close();
});

function renderBudgets() {
  const entries = monthTransactions(selectedMonth).filter((t) => t.type === "expense");
  const spentByCategory = {};
  entries.forEach((t) => { spentByCategory[t.category] = (spentByCategory[t.category] || 0) + t.amount; });

  const categories = Object.keys(allBudgets);
  const list = $("budgets-list");
  if (!categories.length) {
    list.innerHTML = `<p class="muted">No limits set yet. Set one to track spending against a monthly cap.</p>`;
    return;
  }
  list.innerHTML = categories.map((cat) => {
    const limit = allBudgets[cat];
    const spent = spentByCategory[cat] || 0;
    const pct = limit > 0 ? Math.min(100, (spent / limit) * 100) : 0;
    const over = spent > limit;
    return `
      <div class="budget-row">
        <div class="budget-row-top">
          <span>${cat}</span>
          <span class="${over ? "negative" : "muted"}">${money(spent)} of ${money(limit)}</span>
        </div>
        <div class="budget-bar"><div class="budget-bar-fill ${over ? "over" : ""}" style="width:${pct}%"></div></div>
      </div>`;
  }).join("");
}

/* ---------------- Charts ---------------- */

function renderCharts() {
  renderCategoryChart();
  renderTrendChart();
}

function renderCategoryChart() {
  const entries = monthTransactions(selectedMonth).filter((t) => t.type === "expense");
  const totals = {};
  entries.forEach((t) => { totals[t.category] = (totals[t.category] || 0) + t.amount; });
  const labels = Object.keys(totals);
  const data = Object.values(totals);
  const colors = labels.map((l) => CATEGORY_COLORS[l] || "#7A7A72");

  if (categoryChart) categoryChart.destroy();
  const ctx = $("category-chart").getContext("2d");
  if (!labels.length) { drawEmptyState(ctx, "No expenses recorded yet"); return; }
  categoryChart = new Chart(ctx, {
    type: "doughnut",
    data: { labels, datasets: [{ data, backgroundColor: colors, borderColor: "#EDEEE9", borderWidth: 2 }] },
    options: { plugins: { legend: { position: "bottom", labels: { boxWidth: 10, font: { family: "IBM Plex Sans", size: 11 } } } }, cutout: "62%" }
  });
}

function lastNMonths(n, endYm) {
  const [y, m] = endYm.split("-").map(Number);
  const months = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(y, m - 1 - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return months;
}

function renderTrendChart() {
  const months = lastNMonths(6, selectedMonth);
  const income = months.map((ym) => monthTransactions(ym).filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0));
  const expense = months.map((ym) => monthTransactions(ym).filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0));

  if (trendChart) trendChart.destroy();
  const ctx = $("trend-chart").getContext("2d");
  trendChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: months.map((m) => monthLabel(m).split(" ")[0].slice(0, 3)),
      datasets: [
        { label: "Income", data: income, backgroundColor: "#5B8A6E" },
        { label: "Expenses", data: expense, backgroundColor: "#A34A32" }
      ]
    },
    options: {
      plugins: { legend: { position: "bottom", labels: { boxWidth: 10, font: { family: "IBM Plex Sans", size: 11 } } } },
      scales: { y: { beginAtZero: true, ticks: { font: { family: "IBM Plex Sans", size: 10 } } }, x: { ticks: { font: { family: "IBM Plex Sans", size: 10 } } } }
    }
  });
}

function drawEmptyState(ctx, text) {
  ctx.canvas.parentElement.querySelectorAll(".empty-note").forEach((n) => n.remove());
  const note = document.createElement("p");
  note.className = "muted empty-note";
  note.style.textAlign = "center";
  note.style.paddingTop = "70px";
  note.textContent = text;
  ctx.canvas.parentElement.appendChild(note);
}
