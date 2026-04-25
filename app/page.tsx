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

      {/* Center card */}
      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="card"
        style={{
          position: "relative",
          zIndex: 1,
          width: "min(440px, 92vw)",
          padding: "28px 28px 24px",
          borderColor: "rgba(255,255,255,0.10)",
        }}
      >
        {/* Logo */}
        <div style={{
          width: "100%",
          height: "180px",
          position: "relative",
          marginBottom: "20px",
        }}>
          <Image
            src="/jgl-logo.png"
            alt="Jain's Got Latent"
            fill
            style={{ objectFit: "contain", objectPosition: "center" }}
            priority
          />
        </div>

        {/* Thin divider */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
          <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
          <span style={{ color: "var(--gold)", fontSize: "0.45rem" }}>◆</span>
          <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
        </div>

        {/* Only Register is public */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {[
            { label: "Register Your Team", sub: "Create a team and get your PIN", href: "/register" },
            { label: "Team Login", sub: "Login with your team PIN", href: "/participant" },
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
                padding: "16px 18px",
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
                <div style={{ color: "var(--text)", fontWeight: 600, fontSize: "0.9rem", letterSpacing: "0.03em" }}>
                  {item.label}
                </div>
                <div style={{ color: "var(--text-sub)", fontSize: "0.74rem", marginTop: "2px" }}>
                  {item.sub}
                </div>
              </div>
              <span style={{ color: "var(--text-dim)", fontSize: "0.9rem", flexShrink: 0 }}>›</span>
            </motion.button>
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
          marginTop: "16px", letterSpacing: "0.1em", textTransform: "uppercase",
        }}
      >
        JGL 2026 · Jain University
      </motion.p>
    </div>
  );
}
