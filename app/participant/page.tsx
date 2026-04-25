"use client";
import { useState, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import PageShell from "@/components/ui/PageShell";
import { useTeams, useEvent } from "@/hooks/useRealtime";
import { submitSelfScore, submitRoast } from "@/lib/db";

function ParticipantContent() {
    const router = useRouter();
    const params = useSearchParams();
    const [pinInput, setPinInput] = useState(params.get("pin") || "");
    const [loggedIn, setLoggedIn] = useState(!!params.get("pin"));
    const [loginError, setLoginError] = useState("");
    const [team, setTeam] = useState<any>(null);
    const [selfScore, setSelfScore] = useState("");
    const [scoreError, setScoreError] = useState("");
    const [scoreLocked, setScoreLocked] = useState(false);
    const [roastText, setRoastText] = useState("");
    const [roastSent, setRoastSent] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const teams = useTeams();
    const event = useEvent();

    const handleLogin = () => {
        const found = teams.find((t: any) => t.pin === pinInput.trim());
        if (found) {
            setTeam(found);
            setLoggedIn(true);
            setScoreLocked(found.selfScoreLocked);
            if (found.selfScore != null) setSelfScore(String(found.selfScore));
        }
        else setLoginError("Wrong PIN. Try again.");
    };

    const currentTeam = team || teams.find((t: any) => t.pin === pinInput.trim());
    const selfEnabled = event?.selfScoreEnabled;
    const isLocked = currentTeam?.selfScoreLocked || scoreLocked;

    const handleScore = async () => {
        const num = Number(selfScore);
        if (isNaN(num) || num < 0 || num > 10) {
            setScoreError("Enter a number between 0 and 10");
            return;
        }
        if (!currentTeam) return;
        setScoreError("");
        setSubmitting(true);
        await submitSelfScore(currentTeam.id, Math.round(num * 10) / 10);
        setScoreLocked(true);
        setSubmitting(false);
    };

    const handleRoast = async () => {
        if (!roastText.trim() || !currentTeam) return;
        await submitRoast(currentTeam.id, currentTeam.teamName, roastText.trim());
        setRoastText(""); setRoastSent(true);
        setTimeout(() => setRoastSent(false), 3000);
    };

    const TABS = [
        { label: "LEADERBOARD", href: "/live" },
        { label: "HOME", href: "/" },
    ];

    if (!loggedIn) return (
        <PageShell tabs={TABS}>
            <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
                <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    className="card" style={{ padding: "40px", maxWidth: "400px", width: "100%", textAlign: "center" }}>
                    <div style={{ fontSize: "2.4rem", marginBottom: "12px" }}>🎤</div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: "2rem", color: "var(--text)", letterSpacing: "0.05em", marginBottom: "6px" }}>TEAM LOGIN</div>
                    <p style={{ color: "var(--text-sub)", marginBottom: "24px", fontSize: "0.88rem" }}>Enter your 4-digit team PIN</p>
                    <input className="input" value={pinInput} onChange={e => setPinInput(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && handleLogin()}
                        placeholder="••••" maxLength={4}
                        style={{ textAlign: "center", fontSize: "1.8rem", letterSpacing: "0.4em", marginBottom: "14px" }} />
                    {loginError && <p style={{ color: "#F87171", fontSize: "0.83rem", marginBottom: "12px" }}>{loginError}</p>}
                    <button className="btn-gold" style={{ width: "100%", marginBottom: "10px" }} onClick={handleLogin}>LOGIN →</button>
                    <button className="btn" style={{ width: "100%" }} onClick={() => router.push("/register")}>Register Team</button>
                </motion.div>
            </div>
        </PageShell>
    );

    const t = currentTeam;

    return (
        <PageShell tabs={TABS}>
            <div style={{ padding: "60px 20px 120px", display: "flex", flexDirection: "column", alignItems: "center" }}>
                {/* Header */}
                <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
                    style={{ width: "100%", maxWidth: "640px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px" }}>
                    <div>
                        <p className="label-cap" style={{ color: "var(--gold)" }}>Your Dashboard</p>
                        <div style={{ fontFamily: "var(--font-display)", fontSize: "2rem", color: "var(--text)", letterSpacing: "0.04em" }}>{t?.teamName}</div>
                    </div>
                    <button className="btn" onClick={() => { setLoggedIn(false); setTeam(null); setPinInput(""); }}>Logout</button>
                </motion.div>

                <div style={{ width: "100%", maxWidth: "640px", display: "flex", flexDirection: "column", gap: "14px" }}>
                    {/* Team card */}
                    <motion.div className="card" style={{ padding: "22px" }} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                        <span className="label-cap" style={{ color: "var(--gold)" }}>Your Project</span>
                        <p style={{ color: "var(--text)", lineHeight: 1.6, marginBottom: "14px" }}>{t?.projectIdea}</p>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                            {t?.members?.map((m: any, i: number) => (
                                <span key={i} className="badge badge-purple">{m.name} · {m.branch}</span>
                            ))}
                        </div>
                    </motion.div>

                    {/* Self Score — TEXT INPUT */}
                    <motion.div className="card" style={{ padding: "22px" }} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                        <span className="label-cap" style={{ color: "var(--gold)" }}>Self Score</span>

                        {!selfEnabled && !isLocked ? (
                            <div className="row-item" style={{ padding: "20px", textAlign: "center", marginTop: "10px" }}>
                                <p style={{ color: "var(--text-sub)", fontSize: "0.9rem" }}>🔒 Scoring window not open yet</p>
                                <p style={{ color: "var(--text-dim)", fontSize: "0.78rem", marginTop: "4px" }}>Admin will enable this before your slot</p>
                            </div>
                        ) : isLocked ? (
                            <div className="row-item" style={{ padding: "20px", textAlign: "center", marginTop: "10px" }}>
                                <div style={{ fontFamily: "var(--font-display)", fontSize: "3rem", color: "var(--gold-light)", letterSpacing: "0.1em" }}>{t?.selfScore ?? selfScore}</div>
                                <p style={{ color: "var(--text-sub)", fontSize: "0.8rem", marginTop: "6px" }}>✓ Locked in</p>
                            </div>
                        ) : (
                            <div style={{ marginTop: "12px" }}>
                                <p style={{ color: "var(--text-sub)", fontSize: "0.83rem", marginBottom: "12px" }}>
                                    Rate your own project honestly (0–10). This score will be compared with the judges' average.
                                </p>
                                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" }}>
                                    <input
                                        className="input"
                                        type="number"
                                        value={selfScore}
                                        onChange={e => { setSelfScore(e.target.value); setScoreError(""); }}
                                        onKeyDown={e => e.key === "Enter" && handleScore()}
                                        placeholder="0 – 10"
                                        min={0} max={10} step={0.5}
                                        style={{
                                            flex: 1,
                                            textAlign: "center",
                                            fontSize: "2.4rem",
                                            fontFamily: "var(--font-display)",
                                            letterSpacing: "0.1em",
                                            padding: "16px",
                                        }}
                                    />
                                    <span style={{ color: "var(--text-dim)", fontSize: "0.85rem", whiteSpace: "nowrap" }}>/ 10</span>
                                </div>
                                {scoreError && <p style={{ color: "#F87171", fontSize: "0.78rem", marginBottom: "8px" }}>{scoreError}</p>}
                                <button className="btn-gold" style={{ width: "100%", marginTop: "8px" }} onClick={handleScore} disabled={submitting || !selfScore}>
                                    {submitting ? "Locking…" : "LOCK IN SCORE →"}
                                </button>
                            </div>
                        )}
                    </motion.div>

                    {/* Roast */}
                    <motion.div className="card" style={{ padding: "22px" }} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                        <span className="label-cap" style={{ color: "var(--gold)" }}>Drop a Roast</span>
                        <p style={{ color: "var(--text-sub)", fontSize: "0.83rem", marginBottom: "14px" }}>Approved messages appear on the live screen ticker.</p>
                        <textarea className="input" value={roastText} onChange={e => setRoastText(e.target.value)}
                            placeholder="Say something spicy…" rows={3} style={{ marginBottom: "10px" }} />
                        <AnimatePresence>
                            {roastSent && (
                                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                    style={{ color: "#6EE7B7", fontSize: "0.83rem", marginBottom: "10px" }}>
                                    ✓ Sent — waiting for admin approval
                                </motion.p>
                            )}
                        </AnimatePresence>
                        <button className="btn-purple" style={{ width: "100%" }} onClick={handleRoast} disabled={!roastText.trim()}>
                            FIRE AWAY 🔥
                        </button>
                    </motion.div>
                </div>
            </div>
        </PageShell>
    );
}

export default function ParticipantPage() {
    return (
        <Suspense>
            <ParticipantContent />
        </Suspense>
    );
}
