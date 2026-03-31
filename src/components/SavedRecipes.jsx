import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";
import RecipeModal from "./RecipeModal";

const CUISINE_FLAGS = {
  Türk: "🇹🇷", İtalyan: "🇮🇹", Meksika: "🇲🇽", Japon: "🇯🇵",
  Fransız: "🇫🇷", Hint: "🇮🇳", Yunan: "🇬🇷", Amerikan: "🇺🇸",
  İspanyol: "🇪🇸", Çin: "🇨🇳", Tayland: "🇹🇭", Lübnan: "🇱🇧",
  Fas: "🇲🇦", Kore: "🇰🇷",
};

const DIFF = {
  Kolay: { color: "#4ade80", bg: "rgba(74,222,128,0.12)" },
  Orta:  { color: "#fbbf24", bg: "rgba(251,191,36,0.12)"  },
  Zor:   { color: "#f87171", bg: "rgba(248,113,113,0.12)" },
};

export default function SavedRecipes({ userId, profile, partnerProfile }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState("all"); // "all" | "mine" | "partner"
  const [toast, setToast] = useState("");

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  };

  const fetchRecipes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("saved_recipes")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error) setRows(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchRecipes();
  }, [userId]);

  const handleDelete = async (id) => {
    const { error } = await supabase.from("saved_recipes").delete().eq("id", id);
    if (!error) {
      setRows((prev) => prev.filter((r) => r.id !== id));
      showToast("🗑 Tarif silindi.");
    }
  };

  const handleExport = () => {
    const mine = rows.filter((r) => r.user_id === userId);
    const data = mine.map((r) => ({
      ...r.recipe,
      savedAt: r.created_at,
      usedIngredients: r.ingredients,
    }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dolapdanevar-tariflerim-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("📥 Tarifler indirildi!");
  };

  const filtered = rows.filter((r) => {
    if (filter === "mine") return r.user_id === userId;
    if (filter === "partner") return r.user_id !== userId;
    return true;
  });

  const hasPartner = !!partnerProfile;

  return (
    <motion.div
      className="tab-panel"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.25 }}
    >
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            className="page-toast"
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Başlık + eylemler */}
      <div className="panel-header">
        <div>
          <h2 className="panel-title">❤️ Kayıtlı Tarifler</h2>
          <p className="panel-sub">{rows.length} tarif kaydedildi</p>
        </div>
        <button className="btn-export" onClick={handleExport} title="JSON olarak indir">
          📥 İndir
        </button>
      </div>

      {/* Filtreler */}
      {hasPartner && (
        <div className="filter-bar">
          {[
            { id: "all", label: "Tümü" },
            { id: "mine", label: `${profile?.display_name || "Ben"}` },
            { id: "partner", label: partnerProfile.display_name },
          ].map((f) => (
            <button
              key={f.id}
              className={`cat-btn${filter === f.id ? " active" : ""}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="panel-loading">
          <span className="spinner" style={{ width: 28, height: 28, borderWidth: 3 }} />
          <p>Tarifler yükleniyor…</p>
        </div>
      ) : filtered.length === 0 ? (
        <motion.div
          className="empty-state"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <span className="empty-icon">📭</span>
          <p>Henüz kayıtlı tarif yok.</p>
          <p className="empty-hint">Tarifleri bul ve ❤️ ile kaydet!</p>
        </motion.div>
      ) : (
        <div className="recipe-grid">
          <AnimatePresence>
            {filtered.map((row, i) => {
              const r = row.recipe;
              const isOwn = row.user_id === userId;
              const d = DIFF[r.difficulty] || DIFF.Kolay;
              return (
                <motion.article
                  key={row.id}
                  className="recipe-card"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => setSelected(row)}
                >
                  {/* Sahip rozeti */}
                  <div className="card-owner-badge">
                    {isOwn ? (
                      <span className="owner-mine">Sen</span>
                    ) : (
                      <span className="owner-partner">🤝 {partnerProfile?.display_name}</span>
                    )}
                  </div>

                  <div className="card-top">
                    <span className="card-emoji">{r.emoji || "🍽️"}</span>
                    <span className="card-category">{r.category}</span>
                  </div>
                  <h3 className="card-name">{r.name}</h3>
                  <div className="card-badges">
                    <span className="badge">
                      {CUISINE_FLAGS[r.cuisine] || "🌍"} {r.cuisine}
                    </span>
                    <span className="badge">⏱ {r.time}</span>
                    <span className="badge diff-badge" style={{ color: d.color, background: d.bg }}>
                      ● {r.difficulty}
                    </span>
                  </div>
                  <p className="card-desc">{r.description}</p>
                  <div className="card-footer">
                    <span>👥 {r.servings}</span>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      {isOwn && (
                        <button
                          className="btn-delete-recipe"
                          onClick={(e) => { e.stopPropagation(); handleDelete(row.id); }}
                          title="Tarifi sil"
                        >
                          🗑
                        </button>
                      )}
                      <span className="card-cta">Tarifi Gör →</span>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Modal */}
      {selected && (
        <RecipeModal
          recipe={selected.recipe}
          ingredients={selected.ingredients || []}
          userId={null}
          onClose={() => setSelected(null)}
        />
      )}
    </motion.div>
  );
}
