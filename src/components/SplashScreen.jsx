import { useEffect } from "react";
import { motion } from "framer-motion";

const PARTICLES = Array.from({ length: 12 }, (_, i) => ({
  id: i,
  emoji: ["🍅", "🥕", "🧄", "🫑", "🧅", "🌽", "🥦", "🍋", "🫒", "🥚", "🧀", "🌿"][i],
  x: Math.random() * 100,
  y: Math.random() * 100,
  delay: Math.random() * 1.5,
  duration: 2 + Math.random() * 2,
}));

export default function SplashScreen({ onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2800);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <motion.div
      className="splash"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.04 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
    >
      {/* Arka plan partiküller */}
      {PARTICLES.map((p) => (
        <motion.span
          key={p.id}
          className="splash-particle"
          style={{ left: `${p.x}%`, top: `${p.y}%` }}
          initial={{ opacity: 0, scale: 0, y: 20 }}
          animate={{ opacity: [0, 0.6, 0], scale: [0, 1.2, 0.8], y: [20, -20, -40] }}
          transition={{ delay: p.delay, duration: p.duration, repeat: Infinity, repeatDelay: 1 }}
        >
          {p.emoji}
        </motion.span>
      ))}

      {/* Ana içerik */}
      <div className="splash-content">
        <motion.div
          className="splash-logo"
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.1 }}
        >
          🍽️
        </motion.div>

        <motion.h1
          className="splash-title"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.6, ease: "easeOut" }}
        >
          Dolapta Ne Var?
        </motion.h1>

        <motion.p
          className="splash-sub"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
        >
          Malzemelerini gir · Dünya mutfağı gelsin ✨
        </motion.p>

        <motion.div
          className="splash-dots"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.0 }}
        >
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="splash-dot"
              animate={{ scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] }}
              transition={{ delay: i * 0.2, duration: 0.8, repeat: Infinity }}
            />
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
}
