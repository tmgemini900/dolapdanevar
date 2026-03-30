import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";

const UNITS = ["adet", "paket", "kg", "g", "lt", "ml", "kutu", "şişe", "demet", "tane"];

function parseInput(val) {
  const trimmed = val.trim();
  // Pattern: "2 kg domates" or "3 elma" or "domates"
  const match = trimmed.match(/^(\d+(?:[.,]\d+)?)\s*([a-zA-ZçğışöüÇĞİŞÖÜ]+)?\s+(.+)$/);
  if (match) {
    const qty = parseFloat(match[1].replace(",", "."));
    const possibleUnit = match[2]?.toLowerCase();
    if (possibleUnit && UNITS.includes(possibleUnit)) {
      return { name: match[3].trim(), quantity: qty, unit: possibleUnit };
    }
    return { name: ((match[2] ? match[2] + " " : "") + match[3]).trim(), quantity: qty, unit: "adet" };
  }
  return { name: trimmed, quantity: 1, unit: "adet" };
}

export default function ShoppingList({ userId, partnerProfile }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inputValue, setInputValue] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);
  const [toast, setToast] = useState("");
  const inputRef = useRef(null);

  useEffect(() => { loadItems(); }, [userId]);

  const loadItems = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("shopping_items")
      .select("*")
      .order("created_at", { ascending: false });
    setItems(data || []);
    setLoading(false);
  };

  const addItem = async () => {
    const val = inputValue.trim();
    if (!val) return;
    const parsed = parseInput(val);
    const { data, error } = await supabase
      .from("shopping_items")
      .insert({ user_id: userId, ...parsed })
      .select()
      .single();
    if (!error && data) {
      setItems((p) => [data, ...p]);
      setInputValue("");
      inputRef.current?.focus();
    }
  };

  const toggleItem = async (id, current) => {
    const { error } = await supabase
      .from("shopping_items")
      .update({ is_completed: !current })
      .eq("id", id);
    if (!error) {
      setItems((p) => p.map((i) => i.id === id ? { ...i, is_completed: !current } : i));
    }
  };

  const deleteItem = async (id) => {
    await supabase.from("shopping_items").delete().eq("id", id);
    setItems((p) => p.filter((i) => i.id !== id));
  };

  const clearCompleted = async () => {
    const completedIds = items.filter((i) => i.is_completed && i.user_id === userId).map((i) => i.id);
    if (!completedIds.length) return;
    await supabase.from("shopping_items").delete().in("id", completedIds);
    setItems((p) => p.filter((i) => !completedIds.includes(i.id)));
    showToast("✅ Tamamlananlar temizlendi");
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  };

  const pending = items.filter((i) => !i.is_completed);
  const completed = items.filter((i) => i.is_completed);
  const myPending = pending.filter((i) => i.user_id === userId);
  const partnerPending = pending.filter((i) => i.user_id !== userId);

  return (
    <motion.div
      key="shopping"
      className="tab-panel"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.25 }}
    >
      {/* Stats */}
      <div className="inv-stats-row">
        <div className="inv-stat">
          <span className="inv-stat-num">{pending.length}</span>
          <span className="inv-stat-label">Bekleyen</span>
        </div>
        <div className="inv-stat success">
          <span className="inv-stat-num">{completed.length}</span>
          <span className="inv-stat-label">Tamamlanan</span>
        </div>
      </div>

      {/* Quick add input */}
      <section className="card input-card">
        <p className="quick-label" style={{ marginBottom: 10 }}>
          🛒 Alışveriş Listesine Ekle
        </p>
        <div className="input-row">
          <input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addItem(); } }}
            placeholder="ör: süt · 2 kg domates · 3 kutu konserve"
            className="ingredient-input"
          />
          <button className="btn-add" onClick={addItem}>+ Ekle</button>
        </div>
        <p className="inv-hint">Miktarı otomatik algılar: "2 kg domates", "3 paket makarna"</p>
      </section>

      {/* Pending items */}
      {loading ? (
        <div className="loading-state">Liste yükleniyor…</div>
      ) : pending.length === 0 && completed.length === 0 ? (
        <div className="empty-state">
          <span>🛒</span>
          <p>Alışveriş listesi boş.</p>
          <p className="empty-sub">Yukarıdan ürün ekle!</p>
        </div>
      ) : (
        <>
          {pending.length > 0 && (
            <div className="shop-section">
              <p className="inv-section-label">Bekleyenler ({pending.length})</p>

              {myPending.length > 0 && (
                <div className="inv-list">
                  <AnimatePresence>
                    {myPending.map((item) => (
                      <ShoppingItemRow
                        key={item.id}
                        item={item}
                        onToggle={toggleItem}
                        onDelete={deleteItem}
                        isOwn
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}

              {partnerPending.length > 0 && partnerProfile && (
                <>
                  <p className="inv-section-label partner-label">💑 {partnerProfile.display_name}</p>
                  <div className="inv-list">
                    <AnimatePresence>
                      {partnerPending.map((item) => (
                        <ShoppingItemRow
                          key={item.id}
                          item={item}
                          onToggle={toggleItem}
                          onDelete={deleteItem}
                          isOwn={false}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                </>
              )}
            </div>
          )}

          {completed.length > 0 && (
            <div className="shop-section">
              <div className="shop-completed-header">
                <button
                  className="shop-toggle-completed"
                  onClick={() => setShowCompleted((p) => !p)}
                >
                  {showCompleted ? "▲" : "▼"} Tamamlananlar ({completed.length})
                </button>
                <button className="shop-clear-btn" onClick={clearCompleted}>
                  Temizle
                </button>
              </div>

              <AnimatePresence>
                {showCompleted && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <div className="inv-list completed-list">
                      {completed.map((item) => (
                        <ShoppingItemRow
                          key={item.id}
                          item={item}
                          onToggle={toggleItem}
                          onDelete={deleteItem}
                          isOwn={item.user_id === userId}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </>
      )}

      {toast && <div className="page-toast">{toast}</div>}
    </motion.div>
  );
}

function ShoppingItemRow({ item, onToggle, onDelete, isOwn }) {
  return (
    <motion.div
      className={`shop-item${item.is_completed ? " completed" : ""}`}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      layout
    >
      <button
        className={`shop-check${item.is_completed ? " checked" : ""}`}
        onClick={() => isOwn && onToggle(item.id, item.is_completed)}
        disabled={!isOwn}
      >
        {item.is_completed ? "✓" : ""}
      </button>
      <div className="shop-item-info">
        <span className="shop-item-name">{item.name}</span>
        <span className="shop-item-qty">{item.quantity} {item.unit}</span>
      </div>
      {isOwn && (
        <button className="inv-delete-btn" onClick={() => onDelete(item.id)}>✕</button>
      )}
    </motion.div>
  );
}
