import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";

const CATEGORIES = ["Sebze", "Meyve", "Et & Balık", "Süt Ürünleri", "Baklagil", "Baharat", "İçecek", "Atıştırmalık", "Tahıl", "Diğer"];
const CATEGORY_ICONS = { "Sebze": "🥬", "Meyve": "🍎", "Et & Balık": "🍖", "Süt Ürünleri": "🥛", "Baklagil": "🫘", "Baharat": "🌶️", "İçecek": "🧃", "Atıştırmalık": "🍫", "Tahıl": "🌾", "Diğer": "📦" };
const LOCATIONS = ["Tümü", "Buzdolabı", "Derin Dondurucu", "Dolap", "Tezgah"];
const LOC_ICONS = { "Buzdolabı": "❄️", "Derin Dondurucu": "🧊", "Dolap": "🗄️", "Tezgah": "🍽️" };
const UNITS = ["adet", "paket", "kg", "g", "lt", "ml", "kutu", "şişe", "demet", "dilim"];

const EMPTY_FORM = { name: "", quantity: 1, unit: "adet", category: "Diğer", location: "Dolap", expiry_date: "", note: "" };

function getExpiryStatus(expiry_date) {
  if (!expiry_date) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const exp = new Date(expiry_date);
  const diff = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
  if (diff < 0) return "expired";
  if (diff <= 3) return "soon";
  return "ok";
}

export default function KitchenInventory({ userId, partnerProfile }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [locationFilter, setLocationFilter] = useState("Tümü");
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => { loadItems(); }, [userId]);

  const loadItems = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("kitchen_items")
      .select("*")
      .order("created_at", { ascending: false });
    setItems(data || []);
    setLoading(false);
  };

  const addItem = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("kitchen_items").insert({
      user_id: userId,
      name: form.name.trim(),
      quantity: Number(form.quantity) || 1,
      unit: form.unit,
      category: form.category,
      location: form.location,
      expiry_date: form.expiry_date || null,
      note: form.note || null,
    });
    if (!error) {
      setForm(EMPTY_FORM);
      setShowAddForm(false);
      showToast("✅ Ürün eklendi!");
      loadItems();
    }
    setSaving(false);
  };

  const deleteItem = async (id) => {
    await supabase.from("kitchen_items").delete().eq("id", id);
    setItems((p) => p.filter((i) => i.id !== id));
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  };

  const filtered = locationFilter === "Tümü"
    ? items
    : items.filter((i) => i.location === locationFilter);

  const myItems = filtered.filter((i) => i.user_id === userId);
  const partnerItems = filtered.filter((i) => i.user_id !== userId);

  const expiredCount = items.filter((i) => getExpiryStatus(i.expiry_date) === "expired").length;
  const soonCount = items.filter((i) => getExpiryStatus(i.expiry_date) === "soon").length;

  return (
    <motion.div
      key="kitchen"
      className="tab-panel"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.25 }}
    >
      {/* Header stats */}
      <div className="inv-stats-row">
        <div className="inv-stat">
          <span className="inv-stat-num">{items.length}</span>
          <span className="inv-stat-label">Toplam Ürün</span>
        </div>
        {expiredCount > 0 && (
          <div className="inv-stat danger">
            <span className="inv-stat-num">{expiredCount}</span>
            <span className="inv-stat-label">Süresi Geçmiş</span>
          </div>
        )}
        {soonCount > 0 && (
          <div className="inv-stat warning">
            <span className="inv-stat-num">{soonCount}</span>
            <span className="inv-stat-label">Son 3 Gün</span>
          </div>
        )}
      </div>

      {/* Location filter */}
      <div className="inv-loc-bar">
        {LOCATIONS.map((loc) => (
          <button
            key={loc}
            className={`inv-loc-btn${locationFilter === loc ? " active" : ""}`}
            onClick={() => setLocationFilter(loc)}
          >
            {LOC_ICONS[loc] || "📦"} {loc}
          </button>
        ))}
      </div>

      {/* Add button */}
      <button
        className="inv-add-toggle"
        onClick={() => setShowAddForm((p) => !p)}
      >
        {showAddForm ? "✕ Kapat" : "+ Yeni Ürün Ekle"}
      </button>

      {/* Add form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            className="inv-form card"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="inv-form-grid">
              <div className="inv-form-row full">
                <label>Ürün Adı *</label>
                <input
                  className="inv-input"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="ör: Süt, Tavuk, Domates…"
                  onKeyDown={(e) => { if (e.key === "Enter") addItem(); }}
                />
              </div>
              <div className="inv-form-row">
                <label>Miktar</label>
                <input
                  type="number"
                  className="inv-input"
                  value={form.quantity}
                  onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))}
                  min="0" step="0.1"
                />
              </div>
              <div className="inv-form-row">
                <label>Birim</label>
                <select className="inv-select" value={form.unit} onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))}>
                  {UNITS.map((u) => <option key={u}>{u}</option>)}
                </select>
              </div>
              <div className="inv-form-row">
                <label>Kategori</label>
                <select className="inv-select" value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}>
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="inv-form-row">
                <label>Konum</label>
                <select className="inv-select" value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}>
                  {LOCATIONS.filter((l) => l !== "Tümü").map((l) => <option key={l}>{l}</option>)}
                </select>
              </div>
              <div className="inv-form-row">
                <label>Son Kullanma Tarihi</label>
                <input
                  type="date"
                  className="inv-input"
                  value={form.expiry_date}
                  onChange={(e) => setForm((p) => ({ ...p, expiry_date: e.target.value }))}
                />
              </div>
              <div className="inv-form-row full">
                <label>Not (isteğe bağlı)</label>
                <input
                  className="inv-input"
                  value={form.note}
                  onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
                  placeholder="ör: Organik, marketten al…"
                />
              </div>
            </div>
            <button className="inv-save-btn" onClick={addItem} disabled={saving || !form.name.trim()}>
              {saving ? "Kaydediliyor…" : "💾 Kaydet"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Items */}
      {loading ? (
        <div className="loading-state">Envanter yükleniyor…</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <span>🥦</span>
          <p>{locationFilter === "Tümü" ? "Henüz ürün eklenmemiş." : `${locationFilter}'da ürün yok.`}</p>
          <p className="empty-sub">Yukarıdan yeni ürün ekleyebilirsin.</p>
        </div>
      ) : (
        <>
          {myItems.length > 0 && (
            <div className="inv-section">
              {partnerItems.length > 0 && <p className="inv-section-label">Benim Ürünlerim</p>}
              <div className="inv-list">
                <AnimatePresence>
                  {myItems.map((item) => (
                    <KitchenItemRow key={item.id} item={item} onDelete={deleteItem} isOwn />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}
          {partnerItems.length > 0 && partnerProfile && (
            <div className="inv-section">
              <p className="inv-section-label">💑 {partnerProfile.display_name}</p>
              <div className="inv-list">
                <AnimatePresence>
                  {partnerItems.map((item) => (
                    <KitchenItemRow key={item.id} item={item} onDelete={deleteItem} isOwn={false} />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}
        </>
      )}

      {toast && <div className="page-toast">{toast}</div>}
    </motion.div>
  );
}

function KitchenItemRow({ item, onDelete, isOwn }) {
  const status = getExpiryStatus(item.expiry_date);
  const icon = CATEGORY_ICONS[item.category] || "📦";
  const locIcon = LOC_ICONS[item.location] || "📦";

  const expiryLabel = item.expiry_date ? (() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const exp = new Date(item.expiry_date);
    const diff = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
    if (diff < 0) return `${Math.abs(diff)} gün önce geçti`;
    if (diff === 0) return "Bugün bitiyor!";
    if (diff === 1) return "Yarın bitiyor!";
    return `${diff} gün kaldı`;
  })() : null;

  return (
    <motion.div
      className={`inv-item${status === "expired" ? " expired" : status === "soon" ? " expiring" : ""}`}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      layout
    >
      <span className="inv-item-icon">{icon}</span>
      <div className="inv-item-info">
        <span className="inv-item-name">{item.name}</span>
        <div className="inv-item-meta">
          <span className="inv-badge">{item.quantity} {item.unit}</span>
          <span className="inv-badge">{locIcon} {item.location}</span>
          {expiryLabel && (
            <span className={`inv-badge expiry-badge ${status}`}>{expiryLabel}</span>
          )}
        </div>
      </div>
      {isOwn && (
        <button className="inv-delete-btn" onClick={() => onDelete(item.id)} title="Sil">✕</button>
      )}
    </motion.div>
  );
}
