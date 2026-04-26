"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import {
    useTeams, useEvent, useLeaderboard,
    useActiveMeme, useMemes, useRoasts, useTimer,
} from "@/hooks/useRealtime";
import { clearMeme } from "@/lib/db";

const MEDALS = ["🥇", "🥈", "🥉"];
type Tab = "leaderboard" | "reveals" | "timer";

/* ── Party popper confetti burst ──────────────────────────── */
function fireConfetti() {
    const duration = 4000;
    const end = Date.now() + duration;
    const colors = ["#C9A84C", "#FFD700", "#FFF8DC", "#9333EA", "#A855F7", "#F59E0B"];

    (function frame() {
        confetti({
            particleCount: 6,
            angle: 60,
            spread: 70,
            origin: { x: 0, y: 0.7 },
            colors,
        });
        confetti({
            particleCount: 6,
            angle: 120,
            spread: 70,
            origin: { x: 1, y: 0.7 },
            colors,
        });
        if (Date.now() < end) requestAnimationFrame(frame);
    })();
}

export default function LivePage() {
    const [tab, setTab] = useState<Tab>("leaderboard");
    const [memeOverlay, setMemeOverlay] = useState(false);
    const [memeData, setMemeData] = useState<any>(null);
    const [confettiFired, setConfettiFired] = useState(false);
    const prevTrigger = useRef<string | null>(null);

    const teams = useTeams();
    const event = useEvent();
    const leaderboard = useLeaderboard();
    const activeMeme = useActiveMeme();
    const memes = useMemes();
    const roasts = useRoasts("approved");
    const { remaining, total, running } = useTimer();

    const currentTeam = teams.find((t: any) => t.id === event?.currentTeamId);
    const selfRevealed = event?.selfScoreRevealed;
    const judgeRevealed = event?.judgeScoreRevealed;
    const currentLb = leaderboard.find((t: any) => t.id === event?.currentTeamId);

    // Timer geometry
    const pct = total > 0 ? remaining / total : 1;
    const R = 110;
    const circ = 2 * Math.PI * R;
    const dash = circ * (1 - pct);
    const tColor = pct > 0.5 ? "var(--gold-light)" : pct > 0.25 ? "#FACC15" : "#F87171";

    // 🎉 Confetti when BOTH scores revealed & they match (within 0.5)
    useEffect(() => {
        if (selfRevealed && judgeRevealed && currentLb && !confettiFired) {
            const self = currentLb.selfScore;
            const judge = currentLb.judgeAvg;
            if (self != null && judge != null && Math.abs(self - judge) <= 0.5) {
                fireConfetti();
                setConfettiFired(true);
            }
        }
        // Reset when team changes or reveals reset
        if (!selfRevealed && !judgeRevealed) setConfettiFired(false);
    }, [selfRevealed, judgeRevealed, currentLb, confettiFired]);

    // Meme trigger — only shows video overlay on live screen (audio plays locally in admin)
    useEffect(() => {
        if (!activeMeme?.id || !activeMeme?.triggeredAt) return;
        const triggerKey = `${activeMeme.id}_${activeMeme.triggeredAt}`;
        if (triggerKey === prevTrigger.current) return;
        prevTrigger.current = triggerKey;

        const m = memes.find((m: any) => m.id === activeMeme.id);
        if (!m) return;
        setMemeData(m);
        if (m.type === "video") {
            setMemeOverlay(true);
            setTimeout(() => { setMemeOverlay(false); clearMeme(); }, 8000);
        }
        // Audio plays only in admin panel — nothing to do here
    }, [activeMeme?.id, activeMeme?.triggeredAt]);

    // Auto-switch to reveals tab when admin reveals something
    useEffect(() => {
        if (selfRevealed || judgeRevealed) setTab("reveals");
    }, [selfRevealed, judgeRevealed]);

    const withBoth = leaderboard.filter((t: any) => t.selfScore != null && t.judgeAvg != null);
    const mostAccurate = withBoth.length ? withBoth.reduce((a: any, b: any) => Math.abs(a.selfScore - a.judgeAvg) < Math.abs(b.selfScore - b.judgeAvg) ? a : b) : null;
    const mostDelusional = withBoth.length ? withBoth.reduce((a: any, b: any) => Math.abs(a.selfScore - a.judgeAvg) > Math.abs(b.selfScore - b.judgeAvg) ? a : b) : null;

    const TABS: { key: Tab; label: string }[] = [
        { key: "leaderboard", label: "🏆  Leaderboard" },
        { key: "reveals", label: "⭐  Score Reveals" },
        { key: "timer", label: "⏱  Timer" },
    ];

    // Check if current team's scores match
    const scoresMatch = currentLb?.selfScore != null && currentLb?.judgeAvg != null
        && Math.abs(currentLb.selfScore - currentLb.judgeAvg) <= 0.5;

    return (
        <div style={{ minHeight: "100vh", position: "relative", overflow: "hidden" }}>

            {/* Backdrop */}
            <div className="curtain-bg" />
            <div className="curtain-blur-overlay" />
            <div className="curtain-wings" />

            {/* Spinning logo top-left */}
            <div className="logo-wrap" style={{ position: "fixed", top: "60px", left: "20px", zIndex: 20 }}>
                <Image src="/jgl-logo.png" alt="JGL" width={160} height={160}
                    className="logo" style={{ objectFit: "contain" }} priority />
            </div>

            {/* ── Now-presenting banner (backend-driven) ── */}
            <AnimatePresence>
                {currentTeam && (
                    <motion.div
                        key={currentTeam.id}
                        initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                        style={{
                            position: "fixed", top: 0, left: 0, right: 0, zIndex: 15,
                            background: "rgba(16, 9, 28, 0.94)",
                            borderBottom: "1px solid var(--gold-border)",
                            padding: "11px 150px 11px 150px",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            backdropFilter: "blur(8px)",
                            gap: "20px",
                        }}
                    >
                        <span className="badge badge-gold">NOW PRESENTING</span>
                        <span style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", color: "var(--text)" }}>
                            {currentTeam.teamName}
                        </span>
                        <span style={{ color: "var(--text-sub)", fontSize: "0.8rem" }}>
                            {currentTeam.projectIdea}
                        </span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── MAIN CONTENT ───────────────────────────── */}
            <div style={{
                minHeight: "100vh",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "flex-start",
                padding: currentTeam ? "80px 20px 90px" : "40px 20px 90px",
                position: "relative",
                zIndex: 1,
            }}>

                {/* Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className="card"
                    style={{
                        width: "min(680px, 96vw)",
                        padding: "0",
                        overflow: "hidden",
                        borderColor: "rgba(255,255,255,0.10)",
                    }}
                >
                    {/* Logo header */}
                    <div style={{ padding: "28px 32px 0", textAlign: "center" }}>
                        <div className="diamond-line" style={{ justifyContent: "center", marginBottom: "18px", fontSize: "0.6rem", letterSpacing: "0.2em" }}>
                            ◆ LIVE MARKS BOARD ◆
                        </div>
                        <div style={{ width: "100%", height: "200px", position: "relative", marginBottom: "16px" }}>
                            <Image
                                src="/jgl-logo.png"
                                alt="Jain's Got Latent"
                                fill
                                style={{ objectFit: "contain", objectPosition: "center" }}
                            />
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "0" }}>
                            <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
                            <span style={{ color: "var(--gold)", fontSize: "0.45rem" }}>◆</span>
                            <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
                        </div>
                    </div>

                    {/* ── Tab bar ───────────────────────────── */}
                    <div style={{
                        display: "flex",
                        borderBottom: "1px solid var(--border)",
                        padding: "0 32px",
                        marginTop: "0",
                    }}>
                        {TABS.map((t) => (
                            <button
                                key={t.key}
                                onClick={() => setTab(t.key)}
                                style={{
                                    flex: 1,
                                    padding: "14px 8px",
                                    fontFamily: "var(--font-ui)",
                                    fontSize: "0.72rem",
                                    fontWeight: 700,
                                    letterSpacing: "0.06em",
                                    textTransform: "uppercase",
                                    background: "none",
                                    border: "none",
                                    cursor: "pointer",
                                    color: tab === t.key ? "var(--gold-light)" : "var(--text-sub)",
                                    borderBottom: `2px solid ${tab === t.key ? "var(--gold)" : "transparent"}`,
                                    marginBottom: "-1px",
                                    transition: "color 0.15s, border-color 0.15s",
                                }}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {/* ── Tab content ───────────────────────── */}
                    <div style={{ padding: "24px 32px 28px" }}>
                        <AnimatePresence mode="wait">

                            {/* ── LEADERBOARD TAB ────────────────── */}
                            {tab === "leaderboard" && (
                                <motion.div key="lb" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                        {leaderboard.slice(0, 10).map((team: any, i: number) => {
                                            const isCurrent = team.id === event?.currentTeamId;
                                            const top3 = i < 3 && !team.eliminated;
                                            return (
                                                <motion.div
                                                    key={team.id}
                                                    layout
                                                    initial={{ opacity: 0, x: 12 }}
                                                    animate={{ opacity: team.eliminated ? 0.35 : 1, x: 0 }}
                                                    transition={{ delay: i * 0.035 }}
                                                    className={isCurrent && !team.eliminated ? "row-active" : "row-item"}
                                                    style={{
                                                        display: "grid",
                                                        gridTemplateColumns: "44px 1fr auto",
                                                        alignItems: "center",
                                                        padding: top3 ? "14px 18px" : "10px 18px",
                                                        gap: "14px",
                                                    }}
                                                >
                                                    <span style={{
                                                        fontFamily: "var(--font-display)",
                                                        fontSize: top3 ? "1.2rem" : "0.88rem",
                                                        color: team.eliminated ? "#F87171" : top3 ? "var(--gold-light)" : "var(--text-dim)",
                                                        lineHeight: 1,
                                                    }}>
                                                        {team.eliminated ? "✕" : top3 ? MEDALS[i] : `#${i + 1}`}
                                                    </span>

                                                    <div style={{ minWidth: 0 }}>
                                                        <div style={{
                                                            fontFamily: "var(--font-ui)",
                                                            fontWeight: top3 ? 700 : 500,
                                                            fontSize: top3 ? "0.94rem" : "0.84rem",
                                                            color: team.eliminated ? "var(--text-dim)" : isCurrent ? "var(--gold-light)" : top3 ? "var(--text)" : "var(--text-sub)",
                                                            letterSpacing: "0.05em",
                                                            textTransform: "uppercase",
                                                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                                                            textDecoration: team.eliminated ? "line-through" : "none",
                                                        }}>
                                                            {isCurrent && !team.eliminated && "▸ "}{team.teamName}
                                                        </div>
                                                        {team.eliminated && (
                                                            <span className="badge badge-red" style={{ fontSize: "0.55rem", marginTop: "3px" }}>eliminated</span>
                                                        )}
                                                        {isCurrent && !team.eliminated && (
                                                            <span className="badge badge-gold" style={{ fontSize: "0.55rem", marginTop: "3px" }}>ON STAGE</span>
                                                        )}
                                                    </div>

                                                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                                                        <span style={{
                                                            fontFamily: "var(--font-display)",
                                                            fontSize: top3 ? "1.6rem" : "1.05rem",
                                                            color: team.eliminated ? "var(--text-dim)" : top3 ? "var(--text)" : "var(--text-sub)",
                                                            letterSpacing: "0.02em",
                                                        }}>
                                                            {team.judgeAvg ?? "—"}
                                                        </span>
                                                        {top3 && team.judgeAvg != null && (
                                                            <span style={{ fontSize: "0.58rem", color: "var(--text-dim)", marginLeft: "3px", fontWeight: 700, letterSpacing: "0.08em" }}>
                                                                MRK
                                                            </span>
                                                        )}
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                        {leaderboard.length === 0 && (
                                            <div style={{ textAlign: "center", padding: "32px", color: "var(--text-dim)", fontSize: "0.88rem" }}>
                                                Waiting for teams to register…
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}

                            {/* ── REVEALS TAB ────────────────────── */}
                            {tab === "reveals" && (
                                <motion.div key="reveals" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                                    {currentTeam ? (
                                        <div>
                                            {/* Currently scoring team */}
                                            <div className="row-item" style={{ padding: "16px 18px", marginBottom: "20px" }}>
                                                <span className="badge badge-gold" style={{ marginBottom: "10px", display: "inline-block" }}>SCORING NOW</span>
                                                <div style={{ fontFamily: "var(--font-display)", fontSize: "1.6rem", color: "var(--text)" }}>
                                                    {currentTeam.teamName}
                                                </div>
                                                <p style={{ color: "var(--text-sub)", fontSize: "0.83rem", marginTop: "4px" }}>
                                                    {currentTeam.projectIdea}
                                                </p>
                                            </div>

                                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                                                <ScoreReveal
                                                    label="SELF SCORE"
                                                    value={currentLb?.selfScore}
                                                    revealed={!!selfRevealed}
                                                    color="var(--gold-light)"
                                                />
                                                <ScoreReveal
                                                    label="JUDGE AVERAGE"
                                                    value={currentLb?.judgeAvg}
                                                    revealed={!!judgeRevealed}
                                                    color="var(--text)"
                                                />
                                            </div>

                                            {/* Match celebration banner */}
                                            <AnimatePresence>
                                                {selfRevealed && judgeRevealed && scoresMatch && (
                                                    <motion.div
                                                        initial={{ opacity: 0, scale: 0.8 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        exit={{ opacity: 0, scale: 0.8 }}
                                                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                                        style={{
                                                            marginTop: "20px",
                                                            padding: "20px",
                                                            textAlign: "center",
                                                            background: "linear-gradient(135deg, rgba(201,168,76,0.15), rgba(147,51,234,0.15))",
                                                            border: "1px solid var(--gold-border)",
                                                            borderRadius: "12px",
                                                        }}
                                                    >
                                                        <div style={{ fontSize: "2.2rem", marginBottom: "8px" }}>🎉🎊✨</div>
                                                        <div style={{
                                                            fontFamily: "var(--font-display)",
                                                            fontSize: "1.4rem",
                                                            color: "var(--gold-light)",
                                                            letterSpacing: "0.08em",
                                                        }}>
                                                            SCORES MATCH!
                                                        </div>
                                                        <p style={{ color: "var(--text-sub)", fontSize: "0.82rem", marginTop: "6px" }}>
                                                            {currentTeam.teamName} nailed the self-awareness! 🎯
                                                        </p>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    ) : (
                                        <div style={{ textAlign: "center", padding: "48px 0", color: "var(--text-dim)", fontSize: "0.9rem" }}>
                                            No team currently on stage.<br />
                                            <span style={{ fontSize: "0.78rem", marginTop: "6px", display: "block" }}>Admin will select a team from the control panel.</span>
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {/* ── TIMER TAB ──────────────────────── */}
                            {tab === "timer" && (
                                <motion.div key="timer" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                    style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "20px 0" }}
                                >
                                    {/* Big circular ring */}
                                    <svg width="260" height="260" viewBox="0 0 260 260" style={{ display: "block" }}>
                                        <circle cx="130" cy="130" r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="14" />
                                        <circle
                                            cx="130" cy="130" r={R}
                                            fill="none"
                                            stroke={tColor}
                                            strokeWidth="14"
                                            strokeDasharray={circ}
                                            strokeDashoffset={dash}
                                            strokeLinecap="round"
                                            transform="rotate(-90 130 130)"
                                            style={{ transition: "stroke-dashoffset 0.5s linear, stroke 0.5s" }}
                                        />
                                        <text
                                            x="130" y="118"
                                            textAnchor="middle"
                                            fill={tColor}
                                            style={{ fontFamily: "var(--font-display)", fontSize: "52px", letterSpacing: "0.02em" }}
                                        >
                                            {remaining}
                                        </text>
                                        <text
                                            x="130" y="148"
                                            textAnchor="middle"
                                            fill="var(--text-dim)"
                                            style={{ fontFamily: "var(--font-ui)", fontSize: "13px", fontWeight: 700, letterSpacing: "0.18em" }}
                                        >
                                            SECONDS
                                        </text>
                                    </svg>

                                    <div style={{
                                        marginTop: "22px",
                                        fontFamily: "var(--font-ui)",
                                        fontSize: "0.72rem",
                                        fontWeight: 700,
                                        letterSpacing: "0.18em",
                                        color: running ? "var(--gold-light)" : "var(--text-dim)",
                                        textTransform: "uppercase",
                                    }}>
                                        {running ? "● RUNNING" : "■ STOPPED"}
                                    </div>

                                    {currentTeam && (
                                        <div style={{ marginTop: "20px", textAlign: "center" }}>
                                            <span className="badge badge-gold">{currentTeam.teamName}</span>
                                        </div>
                                    )}

                                    <p style={{ marginTop: "16px", color: "var(--text-dim)", fontSize: "0.75rem", textAlign: "center" }}>
                                        Timer is controlled by the admin panel
                                    </p>
                                </motion.div>
                            )}

                        </AnimatePresence>
                    </div>
                </motion.div>
            </div>

            {/* ── Roast popup — bottom-left corner ──────────── */}
            <RoastPopup roasts={roasts} />

            {/* ── Meme video overlay ───────────────────── */}
            <AnimatePresence>
                {memeOverlay && memeData && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}
                        onClick={() => { setMemeOverlay(false); clearMeme(); }}
                    >
                        <motion.video
                            src={memeData.url} autoPlay loop
                            initial={{ scale: 0.65 }} animate={{ scale: 1 }} exit={{ scale: 0.65 }}
                            transition={{ type: "spring", stiffness: 260, damping: 22 }}
                            style={{ maxWidth: "80vw", maxHeight: "75vh", borderRadius: "12px" }}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

/* ── Score reveal card ─────────────────────────────── */
function ScoreReveal({ label, value, revealed, color }: {
    label: string; value: any; revealed: boolean; color: string;
}) {
    const [display, setDisplay] = useState<number | null>(null);
    const [wasRevealed, setWasRevealed] = useState(false);

    useEffect(() => {
        if (revealed && !wasRevealed && value != null) {
            setWasRevealed(true);
            let step = 0;
            const target = Number(value);
            const iv = setInterval(() => {
                step++;
                setDisplay(Math.min(Math.round((target / 22) * step * 10) / 10, target));
                if (step >= 22) clearInterval(iv);
            }, 65);
            return () => clearInterval(iv);
        }
        if (!revealed) { setWasRevealed(false); setDisplay(null); }
    }, [revealed, value]);

    return (
        <div className="row-item" style={{ padding: "22px 18px", textAlign: "center" }}>
            <div className="label-cap" style={{ textAlign: "center", marginBottom: "14px" }}>{label}</div>
            <AnimatePresence mode="wait">
                {!revealed ? (
                    <motion.div key="hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <div style={{
                            fontFamily: "var(--font-display)", fontSize: "3rem", letterSpacing: "0.1em",
                            color: "var(--text-dim)", filter: "blur(8px)", userSelect: "none",
                        }}>??</div>
                        <p style={{ color: "var(--text-dim)", fontSize: "0.7rem", marginTop: "8px" }}>not yet revealed</p>
                    </motion.div>
                ) : (
                    <motion.div key="shown"
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 300, damping: 22 }}
                    >
                        <div style={{
                            fontFamily: "var(--font-display)", fontSize: "4rem", color, letterSpacing: "0.06em", lineHeight: 1,
                        }}>
                            {value != null ? (display ?? value) : "—"}
                        </div>
                        <div style={{ color: "var(--text-dim)", fontSize: "0.7rem", marginTop: "6px", letterSpacing: "0.08em" }}>
                            OUT OF 10
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

/* ── Roast popup — auto-dismiss queue ─────────────────── */
function RoastPopup({ roasts }: { roasts: any[] }) {
    const [visible, setVisible] = useState<any>(null);
    const queueRef = useRef<any[]>([]);
    const seenRef = useRef<Set<string>>(new Set());
    const busyRef = useRef(false);
    const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const dismiss = useCallback((afterMs: number, onDone: () => void) => {
        if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
        // Hold for afterMs then fade out via state change
        holdTimerRef.current = setTimeout(() => {
            setVisible(null);           // triggers AnimatePresence exit
            setTimeout(onDone, 700);   // wait for exit anim to finish
        }, afterMs);
    }, []);

    const showNext = useCallback(() => {
        if (queueRef.current.length === 0) { busyRef.current = false; return; }
        busyRef.current = true;
        const next = queueRef.current.shift()!;
        setVisible(next);
        dismiss(5000, showNext);
    }, [dismiss]);

    // Detect new roasts and enqueue them
    useEffect(() => {
        const fresh = roasts.filter(r => !seenRef.current.has(r.id));
        fresh.forEach(r => { seenRef.current.add(r.id); queueRef.current.push(r); });
        if (fresh.length > 0 && !busyRef.current) showNext();
    }, [roasts, showNext]);

    // Cleanup on unmount
    useEffect(() => () => { if (holdTimerRef.current) clearTimeout(holdTimerRef.current); }, []);

    return (
        <div style={{ position: "fixed", bottom: "28px", left: "24px", zIndex: 40, maxWidth: "340px", width: "calc(100vw - 48px)" }}>
            <AnimatePresence mode="wait">
                {visible && (
                    <motion.div
                        key={visible.id}
                        initial={{ opacity: 0, y: 32, scale: 0.96, filter: "blur(4px)" }}
                        animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                        exit={{ opacity: 0, y: -24, scale: 0.97, filter: "blur(6px)" }}
                        transition={{ type: "spring", stiffness: 360, damping: 28 }}
                        style={{
                            background: "rgba(10, 6, 18, 0.94)",
                            border: "1px solid var(--gold-border)",
                            borderRadius: "14px",
                            padding: "14px 18px",
                            backdropFilter: "blur(16px)",
                            boxShadow: "0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(201,168,76,0.08)",
                        }}
                    >
                        {/* Header */}
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                            <span className="badge badge-gold" style={{ fontSize: "0.55rem" }}>MESSAGE</span>
                            <span style={{ color: "var(--gold)", fontWeight: 700, fontSize: "0.82rem" }}>
                                {visible.teamName}
                            </span>
                        </div>
                        {/* Message */}
                        <p style={{ color: "var(--text-sub)", fontSize: "0.86rem", lineHeight: 1.55, margin: 0 }}>
                            {visible.message}
                        </p>
                        {/* Progress bar */}
                        <motion.div
                            initial={{ scaleX: 1 }}
                            animate={{ scaleX: 0 }}
                            transition={{ duration: 5, ease: "linear" }}
                            style={{
                                height: "2px",
                                background: "var(--gold)",
                                borderRadius: "2px",
                                transformOrigin: "left",
                                marginTop: "12px",
                                opacity: 0.6,
                            }}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
