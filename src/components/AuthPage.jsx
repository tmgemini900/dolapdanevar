import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";

export default function AuthPage() {
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handle = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: displayName || email.split("@")[0] } },
        });
        if (error) throw error;
        setSuccess("Kayıt başarılı! E-postanı doğruladıktan sonra giriş yapabilirsin.");
      }
    } catch (err) {
      const msg = err.message || "Bir hata oluştu.";
      if (msg.includes("Invalid login")) setError("E-posta veya şifre hatalı.");
      else if (msg.includes("already registered")) setError("Bu e-posta zaten kayıtlı.");
      else if (msg.includes("Password should be")) setError("Şifre en az 6 karakter olmalı.");
      else setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Arka plan efekti */}
      <div className="auth-bg">
        {["🍅", "🥕", "🧄", "🫑", "🥦", "🍋"].map((em, i) => (
          <motion.span
            key={i}
            className="auth-bg-emoji"
            style={{ left: `${15 + i * 15}%`, top: `${10 + (i % 3) * 30}%` }}
            animate={{ y: [0, -18, 0], rotate: [0, 10, -10, 0] }}
            transition={{ duration: 4 + i, repeat: Infinity, delay: i * 0.5 }}
          >
            {em}
          </motion.span>
        ))}
      </div>

      <motion.div
        className="auth-card"
        initial={{ opacity: 0, y: 40, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 220, damping: 22 }}
      >
        {/* Logo */}
        <div className="auth-logo">
          <span className="auth-logo-emoji">🍽️</span>
          <h1 className="auth-app-title">Dolapta Ne Var?</h1>
          <p className="auth-app-sub">Malzemelerini gir · Dünya mutfağından tarifler gelsin</p>
        </div>

        {/* Tab seçimi */}
        <div className="auth-tabs">
          {["login", "register"].map((m) => (
            <button
              key={m}
              className={`auth-tab${mode === m ? " active" : ""}`}
              onClick={() => { setMode(m); setError(""); setSuccess(""); }}
            >
              {m === "login" ? "Giriş Yap" : "Kayıt Ol"}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.form
            key={mode}
            onSubmit={handle}
            className="auth-form"
            initial={{ opacity: 0, x: mode === "login" ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: mode === "login" ? 20 : -20 }}
            transition={{ duration: 0.22 }}
          >
            {mode === "register" && (
              <div className="auth-field">
                <label className="auth-label">İsim</label>
                <input
                  type="text"
                  className="auth-input"
                  placeholder="Adın veya takma adın"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>
            )}

            <div className="auth-field">
              <label className="auth-label">E-posta</label>
              <input
                type="email"
                className="auth-input"
                placeholder="ornek@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="auth-field">
              <label className="auth-label">Şifre</label>
              <input
                type="password"
                className="auth-input"
                placeholder="En az 6 karakter"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            {error && (
              <motion.p
                className="auth-error"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                ⚠ {error}
              </motion.p>
            )}

            {success && (
              <motion.p
                className="auth-success"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                ✓ {success}
              </motion.p>
            )}

            <button type="submit" className="auth-btn" disabled={loading}>
              {loading ? (
                <><span className="spinner" /> Lütfen bekle…</>
              ) : mode === "login" ? (
                "🚪 Giriş Yap"
              ) : (
                "✨ Hesap Oluştur"
              )}
            </button>
          </motion.form>
        </AnimatePresence>

        <p className="auth-footer">
          {mode === "login" ? "Hesabın yok mu?" : "Zaten hesabın var mı?"}{" "}
          <button
            className="auth-switch"
            onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); setSuccess(""); }}
          >
            {mode === "login" ? "Kayıt ol" : "Giriş yap"}
          </button>
        </p>
      </motion.div>
    </div>
  );
}
