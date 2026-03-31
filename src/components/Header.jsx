import { motion } from "framer-motion";
import { supabase } from "../lib/supabase";

export default function Header({ profile, partnerProfile, activeTab, onTabChange }) {
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const tabs = [
    { id: "search",   label: "Tarif Bul",  icon: "🍳" },
    { id: "kitchen",  label: "Mutfak",     icon: "🥦" },
    { id: "shopping", label: "Alışveriş",  icon: "🛒" },
    { id: "budget",   label: "Bütçe",      icon: "💰" },
    { id: "overview", label: "Özet",       icon: "📊" },
    { id: "saved",    label: "Kayıtlılar", icon: "❤️" },
    { id: "partner",  label: "Eşim",       icon: "💑" },
  ];

  return (
    <motion.header
      className="header"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="header-inner">
        <div className="header-brand">
          <span className="header-icon">🍽️</span>
          <div>
            <h1 className="header-title">Dolapta Ne Var?</h1>
            <p className="header-sub">
              {partnerProfile ? (
                <span className="header-partner-badge">
                  💑 {profile?.display_name} & {partnerProfile.display_name}
                </span>
              ) : (
                "Malzemelerini gir · Dünya mutfağından tarifler gelsin ✨"
              )}
            </p>
          </div>
        </div>

        {/* Kullanıcı bilgisi + çıkış */}
        <div className="header-user">
          <div className="user-avatar">
            {(profile?.display_name || "?")[0].toUpperCase()}
          </div>
          <span className="user-name">{profile?.display_name}</span>
          <button className="btn-logout" onClick={handleLogout} title="Çıkış Yap">
            ↩
          </button>
        </div>
      </div>

      {/* Tab navigasyon */}
      <div className="header-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`header-tab${activeTab === tab.id ? " active" : ""}`}
            onClick={() => onTabChange(tab.id)}
          >
            <span className="header-tab-icon">{tab.icon}</span>
            <span className="header-tab-label">{tab.label}</span>
            {activeTab === tab.id && (
              <motion.div
                className="header-tab-indicator"
                layoutId="tab-indicator"
                transition={{ type: "spring", stiffness: 300, damping: 28 }}
              />
            )}
          </button>
        ))}
      </div>
    </motion.header>
  );
}
