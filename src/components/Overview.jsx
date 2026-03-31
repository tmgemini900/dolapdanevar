import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "../lib/supabase";

function getExpiryStatus(expiry_date) {
  if (!expiry_date) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const exp = new Date(expiry_date);
  const diff = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
  if (diff < 0) return { status: "expired", diff };
  if (diff <= 3) return { status: "soon", diff };
  return { status: "ok", diff };
}

export default function Overview({ userId, partnerProfile, onTabChange }) {
  const [kitchenItems, setKitchenItems] = useState([]);
  const [shoppingItems, setShoppingItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, [userId]);

  const loadData = async () => {
    setLoading(true);
    const [{ data: kitchen }, { data: shopping }] = await Promise.all([
      supabase.from("kitchen_items").select("*").order("expiry_date", { ascending: true }),
      supabase.from("shopping_items").select("*").order("created_at", { ascending: false }),
    ]);
    setKitchenItems(kitchen || []);
    setShoppingItems(shopping || []);
    setLoading(false);
  };

  const expired = kitchenItems.filter((i) => {
    const s = getExpiryStatus(i.expiry_date);
    return s?.status === "expired";
  });
  const expiringSoon = kitchenItems.filter((i) => {
    const s = getExpiryStatus(i.expiry_date);
    return s?.status === "soon";
  });
  const pendingShopping = shoppingItems.filter((i) => !i.is_completed);

  // Location breakdown
  const byLocation = kitchenItems.reduce((acc, i) => {
    acc[i.location] = (acc[i.location] || 0) + 1;
    return acc;
  }, {});

  const LOC_ICONS = { "Buzdolabı": "❄️", "Derin Dondurucu": "🧊", "Dolap": "🗄️", "Tezgah": "🍽️" };

  return (
    <motion.div
      key="overview"
      className="tab-panel"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.25 }}
    >
      {loading ? (
        <div className="loading-state">Özet yükleniyor…</div>
      ) : (
        <>
          {/* Stats grid */}
          <div className="overview-stats">
            <motion.div
              className="overview-stat-card"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0 }}
              onClick={() => onTabChange("kitchen")}
            >
              <span className="ov-stat-icon">🥦</span>
              <span className="ov-stat-num">{kitchenItems.length}</span>
              <span className="ov-stat-label">Envanter</span>
            </motion.div>

            <motion.div
              className={`overview-stat-card${expired.length > 0 ? " danger" : ""}`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 }}
              onClick={() => onTabChange("kitchen")}
            >
              <span className="ov-stat-icon">⚠️</span>
              <span className="ov-stat-num">{expired.length}</span>
              <span className="ov-stat-label">Süresi Geçmiş</span>
            </motion.div>

            <motion.div
              className={`overview-stat-card${expiringSoon.length > 0 ? " warning" : ""}`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 }}
              onClick={() => onTabChange("kitchen")}
            >
              <span className="ov-stat-icon">⏰</span>
              <span className="ov-stat-num">{expiringSoon.length}</span>
              <span className="ov-stat-label">Son 3 Gün</span>
            </motion.div>

            <motion.div
              className="overview-stat-card"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18 }}
              onClick={() => onTabChange("shopping")}
            >
              <span className="ov-stat-icon">🛒</span>
              <span className="ov-stat-num">{pendingShopping.length}</span>
              <span className="ov-stat-label">Alışveriş</span>
            </motion.div>
          </div>

          {/* Expiry warnings */}
          {(expired.length > 0 || expiringSoon.length > 0) && (
            <div className="card overview-warnings">
              <h3 className="overview-section-title">⚠️ Dikkat Gerektiren Ürünler</h3>
              <div className="inv-list">
                {[...expired, ...expiringSoon].slice(0, 6).map((item) => {
                  const s = getExpiryStatus(item.expiry_date);
                  const label = s.diff < 0
                    ? `${Math.abs(s.diff)} gün önce geçti`
                    : s.diff === 0 ? "Bugün bitiyor!"
                    : `${s.diff} gün kaldı`;
                  return (
                    <div key={item.id} className={`inv-item ${s.status}`}>
                      <span className="inv-item-icon">🍽️</span>
                      <div className="inv-item-info">
                        <span className="inv-item-name">{item.name}</span>
                        <div className="inv-item-meta">
                          <span className="inv-badge">{item.quantity} {item.unit}</span>
                          <span className={`inv-badge expiry-badge ${s.status}`}>{label}</span>
                          {item.user_id !== userId && partnerProfile && (
                            <span className="inv-badge partner">🤝 {partnerProfile.display_name}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Location breakdown */}
          {kitchenItems.length > 0 && (
            <div className="card overview-locations">
              <h3 className="overview-section-title">📍 Depolama Özeti</h3>
              <div className="overview-loc-grid">
                {Object.entries(byLocation).map(([loc, count]) => (
                  <div
                    key={loc}
                    className="overview-loc-card"
                    onClick={() => onTabChange("kitchen")}
                  >
                    <span className="ov-loc-icon">{LOC_ICONS[loc] || "📦"}</span>
                    <span className="ov-loc-name">{loc}</span>
                    <span className="ov-loc-count">{count} ürün</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Shopping preview */}
          {pendingShopping.length > 0 && (
            <div className="card overview-shopping">
              <div className="overview-shopping-header">
                <h3 className="overview-section-title">🛒 Alışveriş Listesi</h3>
                <button className="ov-goto-btn" onClick={() => onTabChange("shopping")}>
                  Tümünü Gör →
                </button>
              </div>
              <div className="inv-list">
                {pendingShopping.slice(0, 5).map((item) => (
                  <div key={item.id} className="shop-item">
                    <div className="shop-check" />
                    <div className="shop-item-info">
                      <span className="shop-item-name">{item.name}</span>
                      <span className="shop-item-qty">{item.quantity} {item.unit}</span>
                    </div>
                    {item.user_id !== userId && partnerProfile && (
                      <span className="inv-badge partner" style={{ fontSize: 11 }}>
                        🤝 {partnerProfile.display_name}
                      </span>
                    )}
                  </div>
                ))}
                {pendingShopping.length > 5 && (
                  <p className="ov-more-label">+{pendingShopping.length - 5} daha var</p>
                )}
              </div>
            </div>
          )}

          {/* Quick action buttons */}
          <div className="overview-actions">
            <button className="ov-action-btn" onClick={() => onTabChange("search")}>
              🍳 Tarif Bul
            </button>
            <button className="ov-action-btn" onClick={() => onTabChange("kitchen")}>
              🥦 Mutfak Ekle
            </button>
            <button className="ov-action-btn" onClick={() => onTabChange("shopping")}>
              🛒 Alışverişe Ekle
            </button>
          </div>
        </>
      )}
    </motion.div>
  );
}
