import { useState, useRef, useCallback, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import "./App.css";

import { supabase } from "./lib/supabase";
import SplashScreen     from "./components/SplashScreen";
import AuthPage         from "./components/AuthPage";
import Header           from "./components/Header";
import RecipeModal      from "./components/RecipeModal";
import SavedRecipes     from "./components/SavedRecipes";
import PartnerPanel     from "./components/PartnerPanel";
import KitchenInventory from "./components/KitchenInventory";
import ShoppingList     from "./components/ShoppingList";
import Overview         from "./components/Overview";
import Budget           from "./components/Budget";

/* ─── Sabitler ─── */
const CATEGORIES = ["Tümü", "Çorba", "Salata", "Sandviç", "Ana Yemek"];

const QUICK_INGREDIENTS = [
  "yumurta","soğan","sarımsak","domates","peynir",
  "tavuk","makarna","pirinç","patates","salça",
  "zeytinyağı","ekmek","süt","tereyağı","mercimek",
  "biber","havuç","ıspanak","nohut","kıyma",
];

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

/* ─── Ana Bileşen ─── */
export default function App() {
  /* Auth & profil durumu */
  const [showSplash, setShowSplash]       = useState(true);
  const [session, setSession]             = useState(null);
  const [profile, setProfile]             = useState(null);
  const [partnerProfile, setPartnerProfile] = useState(null);
  const [authReady, setAuthReady]         = useState(false);

  /* Uygulama durumu */
  const [activeTab, setActiveTab]         = useState("search");
  const [ingredients, setIngredients]     = useState([]);
  const [inputValue, setInputValue]       = useState("");
  const [recipes, setRecipes]             = useState([]);
  const [loading, setLoading]             = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("Tümü");
  const [selectedRecipe, setSelectedRecipe]     = useState(null);
  const [error, setError]                 = useState("");
  const [kitchenNames, setKitchenNames]   = useState([]);
  const inputRef = useRef(null);

  /* ─── Auth listener ─── */
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthReady(true);
      if (session) {
        loadProfile(session.user.id);
        loadKitchenNames(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        loadProfile(session.user.id);
        loadKitchenNames(session.user.id);
      } else {
        setProfile(null);
        setPartnerProfile(null);
        setKitchenNames([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (uid) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", uid)
      .single();
    if (data) {
      setProfile(data);
      if (data.partner_id) loadPartnerProfile(data.partner_id);
      else setPartnerProfile(null);
    }
  };

  const loadPartnerProfile = async (pid) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", pid)
      .single();
    setPartnerProfile(data || null);
  };

  const loadKitchenNames = async (uid) => {
    const { data } = await supabase
      .from("kitchen_items")
      .select("name")
      .eq("user_id", uid)
      .order("name");
    if (data) {
      const unique = [...new Set(data.map((d) => d.name.trim().toLowerCase()))];
      setKitchenNames(unique);
    }
  };

  /* ─── Malzeme yönetimi ─── */
  const addIngredient = useCallback((val) => {
    const v = val.trim().toLowerCase();
    if (!v) return;
    setIngredients((p) => (p.includes(v) ? p : [...p, v]));
    setInputValue("");
    inputRef.current?.focus();
  }, []);

  const removeIngredient = useCallback(
    (item) => setIngredients((p) => p.filter((i) => i !== item)),
    []
  );

  /* ─── Tarif arama (Supabase Edge Function) ─── */
  const getRecipes = async () => {
    if (!ingredients.length) { setError("Lütfen en az bir malzeme ekle!"); return; }
    setError(""); setLoading(true); setRecipes([]); setSelectedRecipe(null);

    let buffer = "";
    try {
      // Token al, expire olmuşsa refresh et
      let { data: { session: s } } = await supabase.auth.getSession();
      if (!s?.access_token) {
        const { data } = await supabase.auth.refreshSession();
        s = data.session;
      }

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/recipes`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${s?.access_token ?? "anon"}`,
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ ingredients }),
        }
      );

      if (!res.ok && res.status === 401) {
        setError("Oturum süreniz dolmuş. Lütfen çıkış yapıp tekrar giriş yapın.");
        setLoading(false);
        return;
      }

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value).split("\n")) {
          if (!line.startsWith("data: ")) continue;
          try {
            const d = JSON.parse(line.slice(6));
            if (d.error) { setError(d.error); break; }
            if (d.done) {
              try {
                const m = buffer.match(/\{[\s\S]*\}/);
                if (m) {
                  const parsed = JSON.parse(m[0]);
                  const raw = parsed.recipes;
                  const list = Array.isArray(raw)
                    ? raw
                    : raw && typeof raw === "object"
                    ? Object.values(raw)
                    : [];
                  setRecipes(list);
                }
              } catch {
                setError("Tarif verisi okunamadı, tekrar deneyin.");
              }
            } else if (d.text) buffer += d.text;
          } catch { /* incomplete chunk */ }
        }
      }
    } catch (err) {
      console.error("Tarif hatası:", err);
      setError("Sunucuya bağlanılamadı. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  };


  const filtered =
    selectedCategory === "Tümü"
      ? recipes
      : recipes.filter((r) => r.category === selectedCategory);

  /* ─── Tab change helper (for Overview nav) ─── */
  const handleTabChange = (tab) => setActiveTab(tab);

  /* ─── Render ─── */
  return (
    <>
      <AnimatePresence>
        {showSplash && (
          <SplashScreen onDone={() => setShowSplash(false)} />
        )}
      </AnimatePresence>

      {!showSplash && authReady && (
        <AnimatePresence mode="wait">
          {!session ? (
            <motion.div key="auth" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <AuthPage />
            </motion.div>
          ) : (
            <motion.div
              key="app"
              className="app"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Header
                profile={profile}
                partnerProfile={partnerProfile}
                activeTab={activeTab}
                onTabChange={handleTabChange}
              />

              <main className="main">
                <AnimatePresence mode="wait">

                  {/* ── TAB: Tarif Bul ── */}
                  {activeTab === "search" && (
                    <motion.div
                      key="search"
                      className="tab-panel"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.25 }}
                    >
                      {/* Malzeme Girişi */}
                      <section className="card input-card">
                        <div className="input-row">
                          <input
                            ref={inputRef}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addIngredient(inputValue); } }}
                            placeholder="Malzeme yaz ve Enter'a bas… (yumurta, pirinç, salça)"
                            className="ingredient-input"
                          />
                          <button className="btn-add" onClick={() => addIngredient(inputValue)}>
                            + Ekle
                          </button>
                        </div>

                        {ingredients.length > 0 && (
                          <div className="tags">
                            {ingredients.map((item) => (
                              <motion.span
                                key={item}
                                className="tag"
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.8, opacity: 0 }}
                              >
                                {item}
                                <button className="tag-remove" onClick={() => removeIngredient(item)}>×</button>
                              </motion.span>
                            ))}
                            <button className="clear-all" onClick={() => setIngredients([])}>Temizle</button>
                          </div>
                        )}

                        {/* Dolapta var — kitchen inventory chips */}
                        {kitchenNames.length > 0 && (
                          <div className="quick-section">
                            <p className="quick-label">🥦 Dolapta Var</p>
                            <div className="quick-grid">
                              {kitchenNames.map((s) => {
                                const on = ingredients.includes(s);
                                return (
                                  <button
                                    key={s}
                                    className={`quick-chip kitchen-chip${on ? " on" : ""}`}
                                    onClick={() => on ? removeIngredient(s) : addIngredient(s)}
                                  >
                                    {on && <span className="chip-tick">✓</span>} {s}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        <div className="quick-section">
                          <p className="quick-label">Hızlı Ekle</p>
                          <div className="quick-grid">
                            {QUICK_INGREDIENTS.map((s) => {
                              const on = ingredients.includes(s);
                              return (
                                <button
                                  key={s}
                                  className={`quick-chip${on ? " on" : ""}`}
                                  onClick={() => on ? removeIngredient(s) : addIngredient(s)}
                                >
                                  {on && <span className="chip-tick">✓</span>} {s}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {error && <p className="error-msg">⚠ {error}</p>}

                        <motion.button
                          className={`btn-search${loading ? " loading" : ""}`}
                          onClick={getRecipes}
                          disabled={loading}
                          whileTap={{ scale: loading ? 1 : 0.98 }}
                        >
                          {loading
                            ? <><span className="spinner" /> Dünya Mutfaklarında Geziyoruz…</>
                            : "🍳 Tarifleri Bul!"}
                        </motion.button>
                      </section>

                      {/* Kategori filtresi */}
                      {recipes.length > 0 && (
                        <div className="cat-bar">
                          {CATEGORIES.map((cat) => (
                            <button
                              key={cat}
                              className={`cat-btn${selectedCategory === cat ? " active" : ""}`}
                              onClick={() => setSelectedCategory(cat)}
                            >
                              {cat}
                              {cat !== "Tümü" && (
                                <span className="cat-count">
                                  {recipes.filter((r) => r.category === cat).length}
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Tarif kartları */}
                      <div className="recipe-grid">
                        <AnimatePresence>
                          {filtered.map((r, i) => {
                            const d = DIFF[r.difficulty] || DIFF.Kolay;
                            return (
                              <motion.article
                                key={r.id || r.name}
                                className="recipe-card"
                                initial={{ opacity: 0, y: 24 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.92 }}
                                transition={{ delay: i * 0.07 }}
                                whileHover={{ y: -4, boxShadow: "0 16px 40px rgba(0,0,0,0.35)" }}
                                onClick={() => setSelectedRecipe(r)}
                              >
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
                                  <span className="card-cta">Tarifi Gör →</span>
                                </div>
                              </motion.article>
                            );
                          })}
                        </AnimatePresence>
                      </div>

                      {recipes.length > 0 && !filtered.length && (
                        <p className="empty">Bu kategoride tarif yok. Başka bir kategori dene.</p>
                      )}
                    </motion.div>
                  )}

                  {/* ── TAB: Mutfak Envanteri ── */}
                  {activeTab === "kitchen" && (
                    <KitchenInventory
                      key="kitchen"
                      userId={session.user.id}
                      partnerProfile={partnerProfile}
                    />
                  )}

                  {/* ── TAB: Alışveriş Listesi ── */}
                  {activeTab === "shopping" && (
                    <ShoppingList
                      key="shopping"
                      userId={session.user.id}
                      partnerProfile={partnerProfile}
                    />
                  )}

                  {/* ── TAB: Bütçe ── */}
                  {activeTab === "budget" && (
                    <Budget
                      key="budget"
                      userId={session.user.id}
                      partnerProfile={partnerProfile}
                    />
                  )}

                  {/* ── TAB: Özet ── */}
                  {activeTab === "overview" && (
                    <Overview
                      key="overview"
                      userId={session.user.id}
                      partnerProfile={partnerProfile}
                      onTabChange={handleTabChange}
                    />
                  )}

                  {/* ── TAB: Kayıtlılar ── */}
                  {activeTab === "saved" && (
                    <SavedRecipes
                      key="saved"
                      userId={session.user.id}
                      profile={profile}
                      partnerProfile={partnerProfile}
                    />
                  )}

                  {/* ── TAB: Eşim ── */}
                  {activeTab === "partner" && (
                    <PartnerPanel
                      key="partner"
                      profile={profile}
                      partnerProfile={partnerProfile}
                      onPartnerChange={() => loadProfile(session.user.id)}
                    />
                  )}

                </AnimatePresence>
              </main>

              {/* Tarif detay modal */}
              {selectedRecipe && (
                <RecipeModal
                  recipe={selectedRecipe}
                  ingredients={ingredients}
                  userId={session.user.id}
                  onClose={() => setSelectedRecipe(null)}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </>
  );
}
