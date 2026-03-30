import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";

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

export default function RecipeModal({ recipe, ingredients, userId, onClose }) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [toast, setToast] = useState("");

  const d = DIFF[recipe.difficulty] || DIFF.Kolay;

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  };

  const handleSave = async () => {
    if (saved || saving) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("saved_recipes").insert({
        user_id: userId,
        recipe,
        ingredients,
      });
      if (error) throw error;
      setSaved(true);
      showToast("✓ Tarif kaydedildi!");
    } catch {
      showToast("⚠ Kaydetme başarısız.");
    } finally {
      setSaving(false);
    }
  };

  const handleShare = async () => {
    setSharing(true);
    const text = `🍽️ ${recipe.name} (${recipe.cuisine})\n\n${recipe.description}\n\n⏱ ${recipe.time} · 👥 ${recipe.servings} · ● ${recipe.difficulty}\n\n🛒 Malzemeler:\n${recipe.ingredients?.join(", ")}\n\n— Dolapta Ne Var? uygulamasından`;
    try {
      if (navigator.share) {
        await navigator.share({ title: recipe.name, text });
      } else {
        await navigator.clipboard.writeText(text);
        showToast("📋 Tarif panoya kopyalandı!");
      }
    } catch {
      showToast("⚠ Paylaşım başarısız.");
    } finally {
      setSharing(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="modal"
          initial={{ scale: 0.92, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 30 }}
          transition={{ type: "spring", stiffness: 280, damping: 24 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Toast bildirimi */}
          <AnimatePresence>
            {toast && (
              <motion.div
                className="modal-toast"
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
              >
                {toast}
              </motion.div>
            )}
          </AnimatePresence>

          <button className="modal-close" onClick={onClose}>×</button>

          <div className="modal-head">
            <span className="modal-emoji">{recipe.emoji}</span>
            <div>
              <h2 className="modal-name">{recipe.name}</h2>
              <div className="card-badges" style={{ marginTop: 6 }}>
                <span className="badge">
                  {CUISINE_FLAGS[recipe.cuisine] || "🌍"} {recipe.cuisine}
                </span>
                <span className="badge">⏱ {recipe.time}</span>
                <span
                  className="badge diff-badge"
                  style={{ color: d.color, background: d.bg }}
                >
                  ● {recipe.difficulty}
                </span>
                <span className="badge">👥 {recipe.servings}</span>
              </div>
            </div>
          </div>

          <p className="modal-desc">{recipe.description}</p>

          {/* Kaydet + Paylaş */}
          {userId && (
            <div className="modal-actions">
              <motion.button
                className={`modal-action-btn${saved ? " saved" : ""}`}
                onClick={handleSave}
                disabled={saving || saved}
                whileTap={{ scale: 0.95 }}
              >
                {saved ? "❤️ Kaydedildi" : saving ? "⏳ Kaydediliyor…" : "🤍 Kaydet"}
              </motion.button>
              <motion.button
                className="modal-action-btn share"
                onClick={handleShare}
                disabled={sharing}
                whileTap={{ scale: 0.95 }}
              >
                {sharing ? "⏳…" : "📤 Paylaş"}
              </motion.button>
            </div>
          )}

          <h3 className="section-title">🛒 Malzemeler</h3>
          <div className="ing-grid">
            {recipe.ingredients?.map((ing, i) => {
              const owned = ingredients?.some((o) => ing.toLowerCase().includes(o));
              return (
                <div key={i} className={`ing-item${owned ? " owned" : ""}`}>
                  {owned ? "✓ " : ""}{ing}
                </div>
              );
            })}
          </div>

          <h3 className="section-title">👨‍🍳 Yapılışı</h3>
          <ol className="steps">
            {recipe.steps?.map((step, i) => (
              <motion.li
                key={i}
                className="step"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <span className="step-num">{i + 1}</span>
                <p>{step}</p>
              </motion.li>
            ))}
          </ol>

          {recipe.tip && (
            <div className="tip">
              <span>💡</span>
              <p><strong>Şef İpucu:</strong> {recipe.tip}</p>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
