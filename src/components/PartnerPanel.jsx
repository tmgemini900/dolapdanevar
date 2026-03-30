import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";

export default function PartnerPanel({ profile, partnerProfile, onPartnerChange }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ msg: "", type: "info" });

  const showToast = (msg, type = "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: "", type: "info" }), 3000);
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(profile?.partner_code || "");
      showToast("📋 Kod kopyalandı!");
    } catch {
      showToast("⚠ Kopyalanamadı.");
    }
  };

  const handleLink = async () => {
    if (!code.trim()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("link_partners", {
        my_id: profile.id,
        partner_code_in: code.trim(),
      });
      if (error) throw error;

      if (data === "ok") {
        showToast("💑 Eşleşme başarılı!", "success");
        setCode("");
        onPartnerChange();
      } else if (data === "not_found") {
        showToast("⚠ Bu kodla eşleşen kullanıcı bulunamadı.", "error");
      } else if (data === "self") {
        showToast("⚠ Kendi kodunu giremezsin.", "error");
      }
    } catch {
      showToast("⚠ Bir hata oluştu.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleUnlink = async () => {
    if (!confirm("Eşleşmeyi kaldırmak istediğine emin misin?")) return;
    setLoading(true);
    try {
      const { error } = await supabase.rpc("unlink_partners", { my_id: profile.id });
      if (error) throw error;
      showToast("Eşleşme kaldırıldı.");
      onPartnerChange();
    } catch {
      showToast("⚠ Bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

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
        {toast.msg && (
          <motion.div
            className={`page-toast ${toast.type}`}
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
          >
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="panel-header">
        <div>
          <h2 className="panel-title">💑 Eş / Partner Paylaşımı</h2>
          <p className="panel-sub">Eşinle tarifleri birlikte keşfedin</p>
        </div>
      </div>

      {/* Kendi bilgi kartı */}
      <div className="partner-card self-card">
        <div className="partner-avatar">
          {(profile?.display_name || "?")[0].toUpperCase()}
        </div>
        <div className="partner-info">
          <p className="partner-name">{profile?.display_name}</p>
          <p className="partner-email">{profile?.email}</p>
        </div>
        <div className="partner-code-block">
          <p className="partner-code-label">Senin Kodun</p>
          <div className="partner-code-row">
            <span className="partner-code">{profile?.partner_code}</span>
            <button className="btn-copy" onClick={copyCode}>📋</button>
          </div>
        </div>
      </div>

      {partnerProfile ? (
        /* Mevcut partner */
        <motion.div
          className="partner-card linked-card"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="partner-link-icon">💑</div>
          <div className="partner-avatar partner-avatar-alt">
            {(partnerProfile.display_name || "?")[0].toUpperCase()}
          </div>
          <div className="partner-info">
            <p className="partner-name">{partnerProfile.display_name}</p>
            <p className="partner-email">{partnerProfile.email}</p>
            <p className="partner-linked-badge">✓ Eşleşmiş</p>
          </div>
          <button
            className="btn-unlink"
            onClick={handleUnlink}
            disabled={loading}
          >
            Eşleşmeyi Kaldır
          </button>
        </motion.div>
      ) : (
        /* Partner bağlama formu */
        <div className="partner-link-form">
          <h3 className="partner-link-title">Eşinle Bağlan</h3>
          <p className="partner-link-desc">
            Eşinin uygulamadaki 6 haneli kodunu girerek tarifleri birlikte görebilirsiniz.
            Eşinin kodunu senden paylaşmasını iste.
          </p>
          <div className="partner-input-row">
            <input
              className="partner-input"
              type="text"
              placeholder="ABC123"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={6}
              onKeyDown={(e) => e.key === "Enter" && handleLink()}
            />
            <motion.button
              className="btn-link-partner"
              onClick={handleLink}
              disabled={loading || !code.trim()}
              whileTap={{ scale: 0.95 }}
            >
              {loading ? <span className="spinner" /> : "💑 Bağlan"}
            </motion.button>
          </div>

          <div className="partner-how">
            <h4 className="partner-how-title">Nasıl Çalışır?</h4>
            <ol className="partner-how-steps">
              <li>Eşin "Dolapta Ne Var?" uygulamasına üye olsun</li>
              <li>Eşinin <strong>Eşim</strong> sayfasındaki kodunu al</li>
              <li>Yukarıdaki kutuya o kodu gir ve <strong>Bağlan</strong>'a tıkla</li>
              <li>Artık birbirinizin kayıtlı tariflerini görebilirsiniz! ❤️</li>
            </ol>
          </div>
        </div>
      )}
    </motion.div>
  );
}
