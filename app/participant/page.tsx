"use client";
import { useState, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import PageShell from "@/components/ui/PageShell";
import { useTeams, useEvent, useLeaderboard, useBattle, useBattleAudienceVotes, useBattleJudgeVotes } from "@/hooks/useRealtime";
import { submitSelfScore, submitRoast, castAudienceVote } from "@/lib/db";

function ParticipantContent() {
    const router = useRouter();
    const params = useSearchParams();
    const [pinInput, setPinInput] = useState(params.get("pin") || "");
    const [loggedIn, setLoggedIn] = useState(!!params.get("pin"));
    const [loginError, setLoginError] = useState("");
    const [team, setTeam] = useState<any>(null);
    const [selfScore, setSelfScore] = useState("");
    const [scoreError, setScoreError] = useState("");
    const [roastText, setRoastText] = useState("");
    const [roastSent, setRoastSent] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const teams = useTeams();
    const event = useEvent();
    const leaderboard = useLeaderboard();
    const battle = useBattle();
    const battleAudienceVotes = useBattleAudienceVotes();
    const battleJudgeVotes = useBattleJudgeVotes();

    const battleTeamA = teams.find((t: any) => t.id === battle?.teamAId);
    const battleTeamB = teams.find((t: any) => t.id === battle?.teamBId);
    const bAvEntries = Object.values(battleAudienceVotes ?? {});
    const bAvA = bAvEntries.filter(v => v === "A").length;
    const bAvB = bAvEntries.filter(v => v === "B").length;
    const bAvTotal = bAvA + bAvB;
    const bJvEntries = Object.values(battleJudgeVotes ?? {});
    const bJvA = bJvEntries.filter(v => v === "A").length;
    const bJvB = bJvEntries.filter(v => v === "B").length;

    const handleLogin = () => {
        const found = teams.find((t: any) => t.pin === pinInput.trim());
        if (found) {
            setTeam(found);
            setLoggedIn(true);
            if (found.selfScore != null) setSelfScore(String(found.selfScore));
        }
        else setLoginError("Wrong PIN. Try again.");
    };

    const currentTeam = team ? teams.find((t: any) => t.id === team.id) || team : teams.find((t: any) => t.pin === pinInput.trim());
    const myBattleVote = currentTeam ? (battleAudienceVotes as any)?.[currentTeam.id] : null;
    const selfEnabled = event?.selfScoreEnabled;
    // Always read lock from Firebase — never use local state for this
    const isLocked = !!currentTeam?.selfScoreLocked;
    // Only the team currently on stage can score
    const isPerforming = !!event?.currentTeamId && currentTeam?.id === event?.currentTeamId;

    const handleScore = async () => {
        const num = Number(selfScore);
        if (isNaN(num) || num < 0 || num > 10) {
            setScoreError("Enter a number between 0 and 10");
            return;
        }
        if (!currentTeam || isLocked || !isPerforming) return;
        setScoreError("");
        setSubmitting(true);
        await submitSelfScore(currentTeam.id, Math.round(num * 10) / 10);
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

                        {isLocked ? (
                            <div className="row-item" style={{ padding: "20px", textAlign: "center", marginTop: "10px" }}>
                                <div style={{ fontFamily: "var(--font-display)", fontSize: "3rem", color: "var(--gold-light)", letterSpacing: "0.1em" }}>{t?.selfScore ?? selfScore}</div>
                                <p style={{ color: "var(--text-sub)", fontSize: "0.8rem", marginTop: "6px" }}>Locked in</p>
                            </div>
                        ) : !selfEnabled || !isPerforming ? (
                            <div className="row-item" style={{ padding: "20px", textAlign: "center", marginTop: "10px" }}>
                                <p style={{ color: "var(--text-sub)", fontSize: "0.9rem" }}>
                                    {!isPerforming && selfEnabled ? "Not your turn yet" : "Scoring window not open yet"}
                                </p>
                                <p style={{ color: "var(--text-dim)", fontSize: "0.78rem", marginTop: "4px" }}>Admin will enable this before your slot</p>
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

                    {/* Leaderboard — only shown when admin enables it */}
                    <AnimatePresence>
                        {event?.leaderboardVisible && (
                            <motion.div
                                key="lb-card"
                                className="card"
                                style={{ padding: "22px" }}
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ delay: 0.1 }}
                            >
                                <span className="label-cap" style={{ color: "var(--gold)" }}>🏆 Leaderboard</span>
                                <p style={{ color: "var(--text-sub)", fontSize: "0.78rem", marginBottom: "14px" }}>Live rankings — judge scores only.</p>
                                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                    {leaderboard.slice(0, 10).map((team: any, i: number) => {
                                        const isCurrent = team.id === event?.currentTeamId;
                                        const isSelected = !!team.selected;
                                        const isMe = team.id === currentTeam?.id;
                                        return (
                                            <div
                                                key={team.id}
                                                style={{
                                                    display: "grid",
                                                    gridTemplateColumns: "36px 1fr auto",
                                                    alignItems: "center",
                                                    gap: "10px",
                                                    padding: "10px 14px",
                                                    borderRadius: "8px",
                                                    background: isMe ? "rgba(201,168,76,0.10)" : isCurrent ? "rgba(201,168,76,0.06)" : isSelected ? "rgba(139,92,246,0.06)" : "rgba(255,255,255,0.03)",
                                                    border: isMe ? "1px solid var(--gold-border)" : "1px solid transparent",
                                                    opacity: team.eliminated ? 0.4 : 1,
                                                }}
                                            >
                                                <span style={{ fontFamily: "var(--font-display)", fontSize: "0.9rem", color: team.eliminated ? "#F87171" : "var(--text-dim)" }}>
                                                    {team.eliminated ? "✕" : `#${i + 1}`}
                                                </span>
                                                <div style={{ minWidth: 0 }}>
                                                    <div style={{
                                                        fontWeight: isMe ? 700 : 500,
                                                        fontSize: "0.83rem",
                                                        color: isMe ? "var(--gold-light)" : team.eliminated ? "var(--text-dim)" : "var(--text)",
                                                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                                                        textDecoration: team.eliminated ? "line-through" : "none",
                                                    }}>
                                                        {team.teamName}{isMe && " (you)"}
                                                    </div>
                                                    {isCurrent && !team.eliminated && (
                                                        <span className="badge badge-gold" style={{ fontSize: "0.5rem", marginTop: "2px" }}>ON STAGE</span>
                                                    )}
                                                    {isSelected && !isCurrent && !team.eliminated && (
                                                        <span className="badge badge-purple" style={{ fontSize: "0.5rem", marginTop: "2px" }}>SELECTED</span>
                                                    )}
                                                </div>
                                                <span style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", color: team.eliminated ? "var(--text-dim)" : "var(--gold-light)", fontWeight: 700 }}>
                                                    {team.judgeAvg ?? "—"}
                                                </span>
                                            </div>
                                        );
                                    })}
                                    {leaderboard.length === 0 && (
                                        <p style={{ color: "var(--text-dim)", fontSize: "0.85rem", textAlign: "center", padding: "12px 0" }}>No scores yet.</p>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Battle Section */}
                    <AnimatePresence>
                        {battle?.active && battleTeamA && battleTeamB && (
                            <motion.div
                                key="battle-section"
                                className="card"
                                style={{ padding: "22px" }}
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ delay: 0.05 }}
                            >
                                <span className="label-cap" style={{ color: "var(--gold)" }}>Roast Battle</span>
                                <div style={{ fontFamily: "var(--font-ui)", fontSize: "0.68rem", color: "var(--text-dim)", marginBottom: "14px", letterSpacing: "0.1em" }}>
                                    ROUND {battle.roundNumber}
                                </div>

                                {/* VS display */}
                                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                                    <div style={{
                                        flex: 1, textAlign: "center",
                                        padding: "10px", borderRadius: "8px",
                                        background: battle.currentTurn === "A" ? "rgba(201,168,76,0.10)" : "rgba(255,255,255,0.03)",
                                        border: `1px solid ${battle.currentTurn === "A" ? "var(--gold-border)" : "transparent"}`,
                                        transition: "all 0.3s",
                                    }}>
                                        <div style={{ fontWeight: 700, fontSize: "0.82rem", color: battle.currentTurn === "A" ? "var(--gold-light)" : "var(--text-sub)" }}>{battleTeamA.teamName}</div>
                                        {battle.currentTurn === "A" && <div style={{ fontSize: "0.6rem", color: "var(--gold)", letterSpacing: "0.1em", marginTop: "2px" }}>ROASTING</div>}
                                    </div>
                                    <span style={{ color: "var(--text-dim)", fontSize: "0.75rem", fontFamily: "var(--font-display)", flexShrink: 0 }}>vs</span>
                                    <div style={{
                                        flex: 1, textAlign: "center",
                                        padding: "10px", borderRadius: "8px",
                                        background: battle.currentTurn === "B" ? "rgba(124,58,237,0.10)" : "rgba(255,255,255,0.03)",
                                        border: `1px solid ${battle.currentTurn === "B" ? "rgba(124,58,237,0.4)" : "transparent"}`,
                                        transition: "all 0.3s",
                                    }}>
                                        <div style={{ fontWeight: 700, fontSize: "0.82rem", color: battle.currentTurn === "B" ? "#A78BFA" : "var(--text-sub)" }}>{battleTeamB.teamName}</div>
                                        {battle.currentTurn === "B" && <div style={{ fontSize: "0.6rem", color: "#A78BFA", letterSpacing: "0.1em", marginTop: "2px" }}>ROASTING</div>}
                                    </div>
                                </div>

                                {/* Audience vote */}
                                {battle.audienceVoteOpen && currentTeam && (
                                    <div style={{ marginBottom: "14px" }}>
                                        <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", letterSpacing: "0.1em", marginBottom: "8px" }}>YOUR VOTE</div>
                                        <div style={{ display: "flex", gap: "8px" }}>
                                            <button
                                                onClick={() => castAudienceVote(currentTeam.id, "A")}
                                                style={{
                                                    flex: 1, padding: "10px", borderRadius: "8px", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer", border: "none",
                                                    background: myBattleVote === "A" ? "var(--gold)" : "rgba(201,168,76,0.12)",
                                                    color: myBattleVote === "A" ? "#1a0f00" : "var(--gold-light)",
                                                    transition: "all 0.2s",
                                                }}
                                            >{battleTeamA.teamName}</button>
                                            <button
                                                onClick={() => castAudienceVote(currentTeam.id, "B")}
                                                style={{
                                                    flex: 1, padding: "10px", borderRadius: "8px", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer", border: "none",
                                                    background: myBattleVote === "B" ? "#7C3AED" : "rgba(124,58,237,0.12)",
                                                    color: myBattleVote === "B" ? "#fff" : "#A78BFA",
                                                    transition: "all 0.2s",
                                                }}
                                            >{battleTeamB.teamName}</button>
                                        </div>
                                        {myBattleVote && (
                                            <p style={{ fontSize: "0.72rem", color: "var(--text-dim)", marginTop: "6px", textAlign: "center" }}>
                                                You voted for {myBattleVote === "A" ? battleTeamA.teamName : battleTeamB.teamName} — you can change it
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Momentum bar */}
                                {(bAvTotal > 0 || myBattleVote) && (
                                    <div style={{ marginBottom: "14px" }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                                            <span style={{ fontSize: "0.65rem", color: "var(--gold-light)", fontWeight: 700 }}>{bAvTotal ? `${Math.round((bAvA / bAvTotal) * 100)}%` : "50%"}</span>
                                            <span style={{ fontSize: "0.63rem", color: "var(--text-dim)", letterSpacing: "0.08em" }}>AUDIENCE MOMENTUM</span>
                                            <span style={{ fontSize: "0.65rem", color: "#A78BFA", fontWeight: 700 }}>{bAvTotal ? `${Math.round((bAvB / bAvTotal) * 100)}%` : "50%"}</span>
                                        </div>
                                        <div style={{ height: "8px", borderRadius: "6px", overflow: "hidden", display: "flex", background: "rgba(255,255,255,0.05)" }}>
                                            <div style={{ width: `${bAvTotal ? (bAvA / bAvTotal) * 100 : 50}%`, background: "linear-gradient(90deg, #C9A84C, #F59E0B)", transition: "width 0.5s ease" }} />
                                            <div style={{ flex: 1, background: "linear-gradient(90deg, #6D28D9, #7C3AED)" }} />
                                        </div>
                                    </div>
                                )}

                                {/* Judge votes (visible when admin allows) */}
                                {battle.judgeVotesVisible && (
                                    <div style={{ display: "flex", gap: "8px", marginBottom: "14px" }}>
                                        <div style={{ flex: 1, textAlign: "center", padding: "10px", borderRadius: "8px", background: "rgba(201,168,76,0.06)", border: "1px solid var(--gold-border)" }}>
                                            <div style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", color: "var(--gold-light)" }}>{bJvA}</div>
                                            <div style={{ fontSize: "0.6rem", color: "var(--text-dim)", letterSpacing: "0.08em" }}>JUDGE VOTES</div>
                                        </div>
                                        <div style={{ flex: 1, textAlign: "center", padding: "10px", borderRadius: "8px", background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.3)" }}>
                                            <div style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", color: "#A78BFA" }}>{bJvB}</div>
                                            <div style={{ fontSize: "0.6rem", color: "var(--text-dim)", letterSpacing: "0.08em" }}>JUDGE VOTES</div>
                                        </div>
                                    </div>
                                )}

                                {/* Winner reveal */}
                                {battle.resultVisible && (
                                    <div style={{ padding: "14px", borderRadius: "10px", background: "rgba(201,168,76,0.08)", border: "1px solid var(--gold-border)", textAlign: "center" }}>
                                        <div style={{ fontSize: "0.62rem", color: "var(--text-dim)", letterSpacing: "0.14em", marginBottom: "4px" }}>WINNER ADVANCES</div>
                                        <div style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", color: "var(--gold-light)" }}>
                                            {bJvA >= bJvB ? battleTeamA.teamName : battleTeamB.teamName}
                                        </div>
                                    </div>
                                )}

                            </motion.div>
                        )}
                    </AnimatePresence>
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
