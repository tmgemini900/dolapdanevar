import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";

/* ─── Sabitler ─── */
const EXPENSE_CATEGORIES = [
  "Gıda 🍽️", "Ulaşım 🚌", "Kira 🏠", "Faturalar 💡",
  "Eğlence 🎬", "Sağlık 💊", "Eğitim 📚", "Giyim 👕",
  "Teknoloji 💻", "Market 🛒", "Diğer 📦",
];
const INCOME_CATEGORIES = [
  "Maaş 💼", "Freelance 💻", "Yatırım 📈",
  "Kira Geliri 🏠", "Hediye 🎁", "Diğer 💰",
];
const EMPTY_FORM = {
  title: "", amount: "", type: "expense",
  category: "Gıda 🍽️", subcategory: "", note: "",
  date: new Date().toISOString().split("T")[0],
};

function fmt(n) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(n);
}
function fmtDate(d) {
  return new Date(d).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" });
}

export default function Budget({ userId, partnerProfile }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("all"); // all | income | expense
  const [toast, setToast] = useState("");

  useEffect(() => { loadTransactions(); }, [userId]);

  const loadTransactions = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("transactions")
      .select("*")
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });
    setTransactions(data || []);
    setLoading(false);
  };

  const addTransaction = async () => {
    if (!form.title.trim() || !form.amount) return;
    setSaving(true);
    const { error } = await supabase.from("transactions").insert({
      user_id: userId,
      title: form.title.trim(),
      amount: Math.abs(parseFloat(form.amount)),
      type: form.type,
      category: form.category,
      subcategory: form.subcategory || null,
      note: form.note || null,
      date: form.date,
    });
    if (!error) {
      setForm(EMPTY_FORM);
      setShowForm(false);
      showToast(form.type === "income" ? "✅ Gelir eklendi" : "✅ Gider eklendi");
      loadTransactions();
    }
    setSaving(false);
  };

  const deleteTransaction = async (id) => {
    await supabase.from("transactions").delete().eq("id", id);
    setTransactions((p) => p.filter((t) => t.id !== id));
  };

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2500); };

  /* ─── Hesaplamalar ─── */
  const myTx  = transactions.filter((t) => t.user_id === userId);
  const allTx = transactions; // kendi + eş (RLS ile)

  const totalIncome  = myTx.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = myTx.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const balance      = totalIncome - totalExpense;

  // Kategori dağılımı (giderler)
  const expenseByCategory = myTx
    .filter((t) => t.type === "expense")
    .reduce((acc, t) => { acc[t.category] = (acc[t.category] || 0) + Number(t.amount); return acc; }, {});
  const topCategories = Object.entries(expenseByCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const filtered = filter === "all"
    ? allTx
    : allTx.filter((t) => t.type === filter);

  return (
    <motion.div
      key="budget"
      className="tab-panel"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.25 }}
    >
      {/* ── Bakiye Kartı ── */}
      <motion.div
        className="budget-balance-card"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.05 }}
      >
        <p className="budget-balance-label">Toplam Bakiye</p>
        <p className={`budget-balance-amount${balance < 0 ? " negative" : ""}`}>
          {fmt(balance)}
        </p>
        <div className="budget-balance-row">
          <div className="budget-bal-item income">
            <span className="bbal-icon">↑</span>
            <div>
              <span className="bbal-label">Gelir</span>
              <span className="bbal-value">{fmt(totalIncome)}</span>
            </div>
          </div>
          <div className="budget-bal-divider" />
          <div className="budget-bal-item expense">
            <span className="bbal-icon">↓</span>
            <div>
              <span className="bbal-label">Gider</span>
              <span className="bbal-value">{fmt(totalExpense)}</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Ekle butonu ── */}
      <div className="budget-add-row">
        <button
          className={`budget-add-btn income${form.type === "income" && showForm ? " active" : ""}`}
          onClick={() => { setForm({ ...EMPTY_FORM, type: "income", category: "Maaş 💼" }); setShowForm(true); }}
        >
          + Gelir
        </button>
        <button
          className={`budget-add-btn expense${form.type === "expense" && showForm ? " active" : ""}`}
          onClick={() => { setForm({ ...EMPTY_FORM, type: "expense", category: "Gıda 🍽️" }); setShowForm(true); }}
        >
          + Gider
        </button>
        {showForm && (
          <button className="budget-cancel-btn" onClick={() => setShowForm(false)}>✕</button>
        )}
      </div>

      {/* ── Form ── */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            className="card budget-form"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className={`budget-form-type-badge ${form.type}`}>
              {form.type === "income" ? "💰 Gelir Ekle" : "💸 Gider Ekle"}
            </div>
            <div className="inv-form-grid">
              <div className="inv-form-row full">
                <label>Başlık *</label>
                <input
                  className="inv-input"
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder={form.type === "income" ? "ör: Ocak Maaşı" : "ör: Market alışverişi"}
                  onKeyDown={(e) => { if (e.key === "Enter") addTransaction(); }}
                />
              </div>
              <div className="inv-form-row">
                <label>Tutar (₺) *</label>
                <input
                  type="number"
                  className="inv-input"
                  value={form.amount}
                  onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                  placeholder="0.00"
                  min="0" step="0.01"
                />
              </div>
              <div className="inv-form-row">
                <label>Tarih</label>
                <input
                  type="date"
                  className="inv-input"
                  value={form.date}
                  onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                />
              </div>
              <div className="inv-form-row full">
                <label>Kategori</label>
                <select
                  className="inv-select"
                  value={form.category}
                  onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                >
                  {(form.type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="inv-form-row full">
                <label>Not (isteğe bağlı)</label>
                <input
                  className="inv-input"
                  value={form.note}
                  onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
                  placeholder="ör: Migros faturası"
                />
              </div>
            </div>
            <button
              className="inv-save-btn"
              onClick={addTransaction}
              disabled={saving || !form.title.trim() || !form.amount}
            >
              {saving ? "Kaydediliyor…" : "💾 Kaydet"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Kategori özeti ── */}
      {topCategories.length > 0 && (
        <div className="card budget-categories">
          <h3 className="overview-section-title">📊 Gider Dağılımı</h3>
          <div className="budget-cat-list">
            {topCategories.map(([cat, amount]) => {
              const pct = totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0;
              return (
                <div key={cat} className="budget-cat-row">
                  <span className="budget-cat-name">{cat}</span>
                  <div className="budget-cat-bar-wrap">
                    <motion.div
                      className="budget-cat-bar"
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, delay: 0.1 }}
                    />
                  </div>
                  <span className="budget-cat-amount">{fmt(amount)}</span>
                  <span className="budget-cat-pct">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Filtre ── */}
      <div className="inv-loc-bar">
        {[["all","Tümü"],["expense","Giderler"],["income","Gelirler"]].map(([val, label]) => (
          <button
            key={val}
            className={`inv-loc-btn${filter === val ? " active" : ""}`}
            onClick={() => setFilter(val)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── İşlem listesi ── */}
      {loading ? (
        <div className="loading-state">İşlemler yükleniyor…</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <span>💰</span>
          <p>Henüz işlem yok.</p>
          <p className="empty-sub">Yukarıdan gelir veya gider ekle.</p>
        </div>
      ) : (
        <div className="inv-list">
          <AnimatePresence>
            {filtered.map((tx) => {
              const isOwn = tx.user_id === userId;
              return (
                <motion.div
                  key={tx.id}
                  className={`budget-tx-row ${tx.type}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  layout
                >
                  <div className={`budget-tx-sign ${tx.type}`}>
                    {tx.type === "income" ? "+" : "-"}
                  </div>
                  <div className="budget-tx-info">
                    <span className="budget-tx-title">{tx.title}</span>
                    <div className="inv-item-meta">
                      <span className="inv-badge">{tx.category}</span>
                      <span className="inv-badge">{fmtDate(tx.date)}</span>
                      {!isOwn && partnerProfile && (
                        <span className="inv-badge partner">💑 {partnerProfile.display_name}</span>
                      )}
                    </div>
                  </div>
                  <span className={`budget-tx-amount ${tx.type}`}>
                    {tx.type === "income" ? "+" : "-"}{fmt(tx.amount)}
                  </span>
                  {isOwn && (
                    <button className="inv-delete-btn" onClick={() => deleteTransaction(tx.id)}>✕</button>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {toast && <div className="page-toast">{toast}</div>}
    </motion.div>
  );
}
