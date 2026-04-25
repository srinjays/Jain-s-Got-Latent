"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import PageShell from "@/components/ui/PageShell";
import { useTeams, useEvent, useJudges } from "@/hooks/useRealtime";
import { submitJudgeScore } from "@/lib/db";

const CRITERIA = [
    { key: "humour", label: "Humour", emoji: "😂" },
    { key: "technical", label: "Technical Depth", emoji: "🧠" },
    { key: "creativity", label: "Creativity", emoji: "💡" },
];

export default function JudgePage() {
    const router = useRouter();
    const [judge, setJudge] = useState<any>(null);
    const [selectedId, setSelectedId] = useState("");
    const [pinInput, setPinInput] = useState("");
    const [loginError, setLoginError] = useState("");
    const [scores, setScores] = useState<Record<string, string>>({ humour: "", technical: "", creativity: "" });
    const [submitted, setSubmitted] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [scoreError, setScoreError] = useState("");
    const prevTeamId = useRef<string | null>(null);

    const judges = useJudges();
    const teams = useTeams();
    const event = useEvent();
    const currentTeamId = event?.currentTeamId;
    const currentTeam = teams.find((t: any) => t.id === currentTeamId);
    const scoringEnabled = event?.judgeScoringEnabled;

    useEffect(() => {
        if (currentTeamId && prevTeamId.current && currentTeamId !== prevTeamId.current) {
            setSubmitted(false);
            setScores({ humour: "", technical: "", creativity: "" });
            setScoreError("");
        }
        prevTeamId.current = currentTeamId ?? null;
    }, [currentTeamId]);

    const handleLogin = () => {
        const found = judges.find((j: any) => j.id === selectedId && j.pin === pinInput.trim());
        if (found) setJudge(found);
        else setLoginError("Wrong PIN or no judge selected.");
    };

    const getNumScores = () => {
        const result: Record<string, number> = {};
        for (const c of CRITERIA) {
            const v = Number(scores[c.key]);
            if (isNaN(v) || v < 0 || v > 10) return null;
            result[c.key] = Math.round(v * 10) / 10;
        }
        return result;
    };

    const handleSubmit = async () => {
        if (!currentTeam || !judge) return;
        const numScores = getNumScores();
        if (!numScores) { setScoreError("All scores must be numbers between 0 and 10"); return; }
        setScoreError("");
        setSubmitting(true);
        await submitJudgeScore(currentTeam.id, judge.id, numScores);
        setSubmitted(true); setSubmitting(false);
    };

    const numScores = getNumScores();
    const avg = numScores
        ? Math.round(((numScores.humour + numScores.technical + numScores.creativity) / 3) * 10) / 10
        : "—";

    if (!judge) return (
        <PageShell>
            <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
                <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    className="card" style={{ padding: "40px", maxWidth: "400px", width: "100%", textAlign: "center" }}>
                    <div style={{ fontSize: "2.2rem", marginBottom: "12px" }}>⚖️</div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: "2rem", color: "var(--text)", letterSpacing: "0.05em", marginBottom: "6px" }}>JUDGE LOGIN</div>
                    <p style={{ color: "var(--text-sub)", marginBottom: "24px", fontSize: "0.88rem" }}>Select your name and enter your PIN</p>

                    <div style={{ marginBottom: "14px", textAlign: "left" }}>
                        <span className="label-cap">Select Judge</span>
                        <select className="input" value={selectedId} onChange={e => { setSelectedId(e.target.value); setPinInput(""); setLoginError(""); }}>
                            <option value="">-- Select --</option>
                            {judges.map((j: any) => <option key={j.id} value={j.id}>{j.name}</option>)}
                        </select>
                    </div>
                    <div style={{ marginBottom: "16px", textAlign: "left" }}>
                        <span className="label-cap">PIN</span>
                        <input className="input" value={pinInput} onChange={e => setPinInput(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && handleLogin()}
                            placeholder="••••" maxLength={4}
                            style={{ textAlign: "center", fontSize: "1.6rem", letterSpacing: "0.4em" }} />
                    </div>
                    {loginError && <p style={{ color: "#F87171", fontSize: "0.83rem", marginBottom: "12px" }}>{loginError}</p>}
                    <button className="btn-gold" style={{ width: "100%", marginBottom: "10px" }} onClick={handleLogin}>LOGIN →</button>
                    <button className="btn" style={{ width: "100%" }} onClick={() => router.push("/")}>← Back</button>
                </motion.div>
            </div>
        </PageShell>
    );

    return (
        <PageShell>
            <div style={{ padding: "60px 20px 40px", display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ width: "100%", maxWidth: "600px" }}>
                    {/* Header */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px" }}>
                        <div>
                            <p className="label-cap" style={{ color: "var(--gold)" }}>Judge Panel</p>
                            <div style={{ fontFamily: "var(--font-display)", fontSize: "2rem", color: "var(--text)", letterSpacing: "0.04em" }}>{judge.name}</div>
                        </div>
                        <button className="btn" onClick={() => setJudge(null)}>Logout</button>
                    </div>

                    {/* Current team — full details */}
                    <AnimatePresence mode="wait">
                        {currentTeam ? (
                            <motion.div key={currentTeam.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                                className="card" style={{ padding: "20px", marginBottom: "16px" }}>
                                <span className="badge badge-gold" style={{ marginBottom: "12px", display: "inline-block" }}>NOW SCORING</span>

                                {/* Team name + project */}
                                <div style={{ fontFamily: "var(--font-display)", fontSize: "1.8rem", color: "var(--text)", letterSpacing: "0.04em", marginBottom: "4px" }}>{currentTeam.teamName}</div>
                                <p style={{ color: "var(--text-sub)", fontSize: "0.85rem", marginBottom: "4px" }}>{currentTeam.projectIdea}</p>
                                {currentTeam.teamDescription && (
                                    <p style={{ color: "var(--text-dim)", fontSize: "0.78rem", fontStyle: "italic", marginBottom: "16px" }}>❝ {currentTeam.teamDescription} ❞</p>
                                )}

                                {/* Members grid */}
                                <div style={{ borderTop: "1px solid var(--border)", paddingTop: "14px" }}>
                                    <span className="label-cap" style={{ color: "var(--gold)", marginBottom: "10px", display: "block" }}>Members</span>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                                        {(currentTeam.members || []).map((m: any, idx: number) => (
                                            <div key={idx} className="row-item" style={{ padding: "10px 14px" }}>
                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                                                    <span style={{ color: "var(--text)", fontWeight: 700, fontSize: "0.84rem" }}>{m.name}</span>
                                                    {idx === 0 && <span className="badge badge-gold" style={{ fontSize: "0.55rem" }}>Lead</span>}
                                                </div>
                                                <div style={{ color: "var(--text-dim)", fontSize: "0.71rem", lineHeight: 1.7 }}>
                                                    <div>📋 {m.usn}</div>
                                                    <div>📚 {m.branch} · {m.year} Year</div>
                                                    {m.funFact && <div style={{ color: "var(--text-sub)", fontStyle: "italic" }}>💬 {m.funFact}</div>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div key="wait" className="card" style={{ padding: "36px", textAlign: "center", marginBottom: "16px" }}>
                                <p style={{ color: "var(--text-sub)" }}>⏳ Waiting for admin to select a team…</p>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Scores — TEXT INPUTS */}
                    {currentTeam && (
                        <motion.div className="card" style={{ padding: "24px" }} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                                <span className="label-cap" style={{ color: "var(--gold)" }}>Your Scores</span>
                                <div style={{ fontFamily: "var(--font-display)", fontSize: "1.6rem", color: "var(--text-sub)", letterSpacing: "0.06em" }}>
                                    AVG <span style={{ color: "var(--gold-light)" }}>{avg}</span>
                                </div>
                            </div>

                            {!scoringEnabled && !submitted && (
                                <div className="row-item" style={{ padding: "16px", textAlign: "center", marginBottom: "18px" }}>
                                    <p style={{ color: "var(--text-sub)", fontSize: "0.88rem" }}>⏸ Scoring not open yet — wait for admin</p>
                                </div>
                            )}

                            {CRITERIA.map(({ key, label, emoji }) => (
                                <div key={key} style={{ marginBottom: "16px" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                                        <span style={{ color: "var(--text)", fontSize: "0.9rem", fontWeight: 500 }}>{emoji} {label}</span>
                                        <span style={{ color: "var(--text-dim)", fontSize: "0.75rem" }}>0 – 10</span>
                                    </div>
                                    <input
                                        className="input"
                                        type="number"
                                        value={scores[key]}
                                        disabled={submitted || !scoringEnabled}
                                        onChange={e => { setScores(p => ({ ...p, [key]: e.target.value })); setScoreError(""); }}
                                        placeholder="Enter score"
                                        min={0} max={10} step={0.5}
                                        style={{
                                            width: "100%",
                                            textAlign: "center",
                                            fontSize: "1.6rem",
                                            fontFamily: "var(--font-display)",
                                            letterSpacing: "0.08em",
                                            padding: "14px",
                                            cursor: submitted ? "not-allowed" : "text",
                                            opacity: submitted ? 0.5 : 1,
                                        }}
                                    />
                                </div>
                            ))}

                            <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "18px 0" }} />

                            {scoreError && <p style={{ color: "#F87171", fontSize: "0.78rem", marginBottom: "10px" }}>{scoreError}</p>}

                            {submitted ? (
                                <div className="row-item" style={{ padding: "14px", textAlign: "center" }}>
                                    <p style={{ color: "#6EE7B7", fontWeight: 600 }}>✓ Scores submitted</p>
                                </div>
                            ) : (
                                <button className="btn-gold" style={{ width: "100%" }} onClick={handleSubmit}
                                    disabled={!scoringEnabled || submitting}>
                                    {submitting ? "Submitting…" : "SUBMIT SCORES →"}
                                </button>
                            )}
                        </motion.div>
                    )}

                    {/* ── Browse All Teams ──────────────────────────────── */}
                    <BrowseTeams teams={teams} />

                </div>
            </div>
        </PageShell>
    );
}

/* ── Browse All Teams accordion ─────────────────────────── */
function BrowseTeams({ teams }: { teams: any[] }) {
    const [open, setOpen] = useState(false);
    const [expanded, setExpanded] = useState<string | null>(null);

    return (
        <div style={{ marginTop: "24px" }}>
            <button
                onClick={() => setOpen(o => !o)}
                className="btn"
                style={{ width: "100%", fontSize: "0.8rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>📋 Browse All Teams ({teams.length})</span>
                <span style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s", display: "inline-block" }}>›</span>
            </button>

            <AnimatePresence initial={false}>
                {open && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22 }}
                        style={{ overflow: "hidden" }}
                    >
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "10px" }}>
                            {teams.length === 0 && (
                                <p style={{ color: "var(--text-dim)", textAlign: "center", fontSize: "0.85rem", padding: "20px 0" }}>No teams yet.</p>
                            )}
                            {teams.map((t: any) => {
                                const isExpanded = expanded === t.id;
                                return (
                                    <div key={t.id} className="card" style={{ padding: 0, overflow: "hidden" }}>
                                        <div
                                            onClick={() => setExpanded(isExpanded ? null : t.id)}
                                            style={{ padding: "13px 18px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                            <div>
                                                <div style={{ fontFamily: "var(--font-ui)", fontWeight: 700, color: "var(--text)", fontSize: "0.88rem" }}>{t.teamName}</div>
                                                <div style={{ color: "var(--text-dim)", fontSize: "0.73rem", marginTop: "2px" }}>{t.projectIdea}</div>
                                            </div>
                                            <span style={{ color: "var(--text-sub)", fontSize: "0.9rem", display: "inline-block", transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s", flexShrink: 0, marginLeft: "8px" }}>›</span>
                                        </div>
                                        <AnimatePresence initial={false}>
                                            {isExpanded && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.18 }} style={{ overflow: "hidden" }}>
                                                    <div style={{ padding: "0 18px 16px", borderTop: "1px solid var(--border)", paddingTop: "14px" }}>
                                                        {t.teamDescription && (
                                                            <p style={{ color: "var(--text-sub)", fontSize: "0.78rem", fontStyle: "italic", marginBottom: "12px" }}>❝ {t.teamDescription} ❞</p>
                                                        )}
                                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "7px" }}>
                                                            {(t.members || []).map((m: any, idx: number) => (
                                                                <div key={idx} className="row-item" style={{ padding: "10px 12px" }}>
                                                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                                                                        <span style={{ color: "var(--text)", fontWeight: 700, fontSize: "0.82rem" }}>{m.name}</span>
                                                                        {idx === 0 && <span className="badge badge-gold" style={{ fontSize: "0.52rem" }}>Lead</span>}
                                                                    </div>
                                                                    <div style={{ color: "var(--text-dim)", fontSize: "0.7rem", lineHeight: 1.7 }}>
                                                                        <div>📋 {m.usn}</div>
                                                                        <div>📚 {m.branch} · {m.year} Year</div>
                                                                        {m.funFact && <div style={{ color: "var(--text-sub)", fontStyle: "italic" }}>💬 {m.funFact}</div>}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
