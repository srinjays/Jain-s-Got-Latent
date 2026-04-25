"use client";
import Image from "next/image";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { initEventDefaults } from "@/lib/db";

export default function PortalPage() {
  const router = useRouter();

  useEffect(() => {
    initEventDefaults().catch(() => { });
  }, []);

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Stage backdrop */}
      <div className="curtain-bg" />
      <div className="curtain-blur-overlay" />
      <div className="curtain-wings" />

      {/* Spinning logo — top left, BIG */}
      <div
        className="logo-wrap"
        style={{ position: "fixed", top: "16px", left: "20px", zIndex: 50, cursor: "pointer" }}
      >
        <Image
          src="/jgl-logo.png"
          alt="JGL"
          width={160}
          height={160}
          className="logo"
          style={{ objectFit: "contain" }}
          priority
        />
      </div>

      {/* ── Center card ───────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="card"
        style={{
          position: "relative",
          zIndex: 1,
          width: "min(500px, 92vw)",
          padding: "36px 32px 30px",
          borderColor: "rgba(255,255,255,0.10)",
        }}
      >
        {/* Diamond label */}
        <div className="diamond-line" style={{ justifyContent: "center", marginBottom: "24px", fontSize: "0.6rem", letterSpacing: "0.2em" }}>
          ◆ LIVE LEADERBOARD ◆
        </div>

        {/* Logo wordmark — use a fixed-height container so it doesn't overflow */}
        <div style={{
          width: "100%",
          height: "320px",
          position: "relative",
          marginBottom: "8px",
        }}>
          <Image
            src="/jgl-logo.png"
            alt="Jain's Got Latent"
            fill
            style={{ objectFit: "contain", objectPosition: "center" }}
          />
        </div>

        {/* Thin divider */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", margin: "18px 0 22px" }}>
          <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
          <span style={{ color: "var(--gold)", fontSize: "0.45rem" }}>◆</span>
          <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
        </div>

        {/* ── Role rows — Teams only see Register + Leaderboard ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "28px" }}>
          {[
            { label: "�  Register Your Team", sub: "Create a team & get your PIN", href: "/register" },
            { label: "🏆  Live Leaderboard", sub: "See how teams are ranked", href: "/live" },
            { label: "🎤  Team Dashboard", sub: "Login with your team PIN", href: "/participant" },
          ].map((item, i) => (
            <motion.button
              key={item.href}
              initial={{ opacity: 0, x: -14 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.12 + i * 0.07 }}
              whileHover={{ x: 6 }}
              whileTap={{ scale: 0.985 }}
              onClick={() => router.push(item.href)}
              className="row-item"
              style={{
                width: "100%",
                padding: "15px 18px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                cursor: "pointer",
                border: "none",
                textAlign: "left",
                background: "var(--row)",
              }}
            >
              <div>
                <div style={{ color: "var(--text)", fontWeight: 600, fontSize: "0.88rem", letterSpacing: "0.03em" }}>
                  {item.label}
                </div>
                <div style={{ color: "var(--text-dim)", fontSize: "0.73rem", marginTop: "2px" }}>
                  {item.sub}
                </div>
              </div>
              <span style={{ color: "var(--text-dim)", fontSize: "0.9rem", flexShrink: 0 }}>›</span>
            </motion.button>
          ))}
        </div>

        {/* Bottom nav pills — matching screenshot */}
        <div style={{ display: "flex", gap: "7px", justifyContent: "center" }}>
          {[
            { key: "LOGIN", href: "/participant", gold: false },
            { key: "STAGE", href: "/live", gold: false },
            { key: "VOTE", href: "/register", gold: false },
            { key: "LEADERBOARD", href: "/live", gold: true },
          ].map((item) => (
            <button
              key={item.key}
              className={`btn${item.gold ? " active" : ""}`}
              style={{ padding: "8px 13px", fontSize: "0.62rem", minWidth: "unset" }}
              onClick={() => router.push(item.href)}
            >
              {item.key}
            </button>
          ))}
        </div>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        style={{
          position: "relative", zIndex: 1,
          color: "var(--text-dim)", fontSize: "0.62rem",
          marginTop: "20px", letterSpacing: "0.1em", textTransform: "uppercase",
        }}
      >
        JGL 2026 · Jain University
      </motion.p>
    </div>
  );
}
