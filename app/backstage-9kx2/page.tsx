"use client";
import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import PageShell from "@/components/ui/PageShell";
import { useTeams, useEvent, useJudges, useMemes, useRoasts, useLeaderboard } from "@/hooks/useRealtime";
import {
    setCurrentTeam, startTimer, resetTimer,
    setSelfScoreEnabled, setJudgeScoringEnabled,
    setSelfScoreRevealed, setJudgeScoreRevealed,
    triggerMeme, clearMeme,
    approveRoast, rejectRoast,
    addJudge, removeJudge,
    uploadMemeFile, setTeamEliminated, deleteTeam, updateTeam,
} from "@/lib/db";
import { db } from "@/lib/firebase";
import { ref, push, remove, set } from "firebase/database";

const ADMIN_PIN = process.env.NEXT_PUBLIC_ADMIN_PIN || "420691";
const TAB_NAMES = ["Control", "Teams", "Memes", "Roasts", "Judges", "Leaderboard"];

export default function AdminPage() {
    const router = useRouter();
    const [authed, setAuthed] = useState(false);
    const [pinInput, setPinInput] = useState("");
    const [pinErr, setPinErr] = useState("");
    const [tab, setTab] = useState(0);
    const [duration, setDuration] = useState(90);
    const [jName, setJName] = useState("");
    const [jPin, setJPin] = useState("");
    const [expandedTeam, setExpandedTeam] = useState<string | null>(null);

    const [mName, setMName] = useState("");
    const [mEmoji, setMEmoji] = useState("🎵");
    const [mType, setMType] = useState<"audio" | "video">("audio");
    const [mFile, setMFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadMsg, setUploadMsg] = useState("");
    const [uploadProgress, setUploadProgress] = useState(0);
    const fileRef = useRef<HTMLInputElement>(null);
    const adminAudioRef = useRef<HTMLAudioElement | null>(null);

    const teams = useTeams();
    const event = useEvent();
    const judges = useJudges();
    const memes = useMemes();
    const pending = useRoasts("pending");
    const approved = useRoasts("approved");
    const leaderboard = useLeaderboard();

    const login = () => {
        if (pinInput.trim() === ADMIN_PIN) setAuthed(true);
        else setPinErr("Wrong PIN.");
    };

    const handleUploadMeme = async () => {
        if (!mFile || !mName.trim()) { setUploadMsg("Need a name and file."); return; }
        if (mFile.size > 10 * 1024 * 1024) { setUploadMsg("File too large. Max 10MB."); return; }
        setUploading(true); setUploadMsg(""); setUploadProgress(10);
        try {
            setUploadProgress(30);
            await uploadMemeFile(mFile, mName.trim(), mEmoji, mType);
            setUploadProgress(100);
            setMName(""); setMEmoji("🎵"); setMFile(null);
            if (fileRef.current) fileRef.current.value = "";
            setUploadMsg("✓ Added to soundboard!");
            setTimeout(() => { setUploadMsg(""); setUploadProgress(0); }, 3000);
        } catch (e: any) {
            setUploadMsg("✕ " + (e.message || "Upload failed"));
            setUploadProgress(0);
        }
        setUploading(false);
    };

    const deleteMeme = async (memeId: string, memeName: string) => {
        if (!confirm(`Delete "${memeName}" from the soundboard? This cannot be undone.`)) return;
        await remove(ref(db, `memes/${memeId}`));
    };

    const playMemeLocally = (meme: any) => {
        if (meme.type === "audio" && meme.url) {
            adminAudioRef.current?.pause();
            const a = new Audio(meme.url);
            a.play().catch((err) => console.warn("Audio play failed:", err));
            adminAudioRef.current = a;
        }
        triggerMeme(meme.id);
    };

    const stopLocalAudio = () => {
        adminAudioRef.current?.pause();
        adminAudioRef.current = null;
        clearMeme();
    };

    const wipeAllMemes = async () => {
        if (!confirm(`WARNING: This will permanently delete ALL ${memes.length} sound(s) from the soundboard. This cannot be undone. Are you sure?`)) return;
        await set(ref(db, "memes"), null);
    };

    if (!authed) return (
        <PageShell>
            <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
                <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    className="card" style={{ padding: "40px", maxWidth: "380px", width: "100%", textAlign: "center" }}>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: "2rem", color: "var(--text)", letterSpacing: "0.05em", marginBottom: "6px" }}>TECH CONTROL</div>
                    <p style={{ color: "var(--text-sub)", marginBottom: "24px", fontSize: "0.88rem" }}>Admin access only</p>
                    <input className="input" type="password" value={pinInput} onChange={e => setPinInput(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && login()} placeholder="6-digit PIN" maxLength={6}
                        style={{ textAlign: "center", fontSize: "1.6rem", letterSpacing: "0.4em", marginBottom: "14px" }} />
                    {pinErr && <p style={{ color: "#F87171", fontSize: "0.83rem", marginBottom: "12px" }}>{pinErr}</p>}
                    <button className="btn-gold" style={{ width: "100%" }} onClick={login}>ENTER →</button>
                </motion.div>
            </div>
        </PageShell>
    );

    return (
        <PageShell>
            <div style={{ padding: "24px 16px 40px" }}>
                <div style={{ maxWidth: "1080px", margin: "0 auto" }}>

                    {/* Header */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", paddingLeft: "4px" }}>
                        <div>
                            <p className="label-cap" style={{ color: "var(--gold)" }}>Admin / Tech Team</p>
                            <div style={{ fontFamily: "var(--font-display)", fontSize: "2rem", color: "var(--text)", letterSpacing: "0.04em" }}>TECH CONTROL</div>
                        </div>
                        <div style={{ display: "flex", gap: "8px" }}>
                            <button className="btn-gold" style={{ fontSize: "0.78rem", padding: "8px 14px" }} onClick={() => window.open("/live", "_blank")}>Live Screen</button>
                            <button className="btn" onClick={() => setAuthed(false)}>Logout</button>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div style={{ display: "flex", gap: "6px", marginBottom: "20px", flexWrap: "wrap" }}>
                        {TAB_NAMES.map((t, i) => (
                            <button key={i} onClick={() => setTab(i)} className={`btn${tab === i ? " active" : ""}`}
                                style={{ fontSize: "0.78rem", padding: "8px 16px" }}>{t}</button>
                        ))}
                    </div>

                    <AnimatePresence mode="wait">
                        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>

                            {/* ── CONTROL ───────────────────────────────── */}
                            {tab === 0 && (
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                                    <ACard title="Now Presenting">
                                        <span className="label-cap">Select Team</span>
                                        <select className="input" value={event?.currentTeamId || ""} onChange={e => setCurrentTeam(e.target.value)} style={{ marginBottom: "12px" }}>
                                            <option value="">-- None --</option>
                                            {teams.map((t: any) => <option key={t.id} value={t.id}>{t.teamName}</option>)}
                                        </select>
                                        {event?.currentTeamId && (
                                            <div className="row-item" style={{ padding: "12px" }}>
                                                <p style={{ color: "var(--gold-light)", fontWeight: 600, fontSize: "0.9rem" }}>
                                                    {teams.find((t: any) => t.id === event.currentTeamId)?.teamName}
                                                </p>
                                            </div>
                                        )}
                                    </ACard>

                                    <ACard title="Timer">
                                        <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "14px" }}>
                                            <span className="label-cap" style={{ margin: 0, whiteSpace: "nowrap" }}>Seconds</span>
                                            <input type="number" className="input" value={duration} onChange={e => setDuration(Number(e.target.value))} min={10} max={600} style={{ width: "80px" }} />
                                        </div>
                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                                            <button className="btn-gold" style={{ padding: "9px" }} onClick={() => startTimer(duration)}>▶ Start</button>
                                            <button className="btn-danger" style={{ padding: "9px" }} onClick={resetTimer}>↺ Reset</button>
                                        </div>
                                        <div style={{ marginTop: "12px", textAlign: "center", fontFamily: "var(--font-display)", fontSize: "1.6rem", color: event?.timerRunning ? "var(--gold-light)" : "var(--text-dim)", letterSpacing: "0.08em" }}>
                                            {event?.timerRunning ? "● RUNNING" : "■ STOPPED"}
                                        </div>
                                    </ACard>

                                    <ACard title="Scoring Windows">
                                        <Toggle label="Self-Score Open" value={!!event?.selfScoreEnabled} onChange={v => setSelfScoreEnabled(v)} />
                                        <Toggle label="Judge Scoring Open" value={!!event?.judgeScoringEnabled} onChange={v => setJudgeScoringEnabled(v)} />
                                        <div style={{ marginTop: "12px", borderTop: "1px solid var(--border)", paddingTop: "12px" }}>
                                            <button
                                                className="btn"
                                                style={{ width: "100%", fontSize: "0.78rem" }}
                                                disabled={!event?.currentTeamId}
                                                onClick={() => {
                                                    if (event?.currentTeamId) {
                                                        updateTeam(event.currentTeamId, { selfScoreLocked: false, selfScore: null });
                                                    }
                                                }}
                                            >
                                                Unlock Team Re-Score
                                            </button>
                                            <p style={{ color: "var(--text-dim)", fontSize: "0.68rem", marginTop: "6px", textAlign: "center" }}>
                                                Clears lock for current team
                                            </p>
                                        </div>
                                    </ACard>

                                    <ACard title="Score Reveals">
                                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                            <button onClick={() => setSelfScoreRevealed(!event?.selfScoreRevealed)} className={event?.selfScoreRevealed ? "btn-danger" : "btn-gold"} style={{ width: "100%" }}>
                                                {event?.selfScoreRevealed ? "Hide Self-Score" : "Reveal Self-Score"}
                                            </button>
                                            <button onClick={() => setJudgeScoreRevealed(!event?.judgeScoreRevealed)} className={event?.judgeScoreRevealed ? "btn-danger" : "btn-purple"} style={{ width: "100%" }}>
                                                {event?.judgeScoreRevealed ? "Hide Judge Score" : "Reveal Judge Score"}
                                            </button>
                                            <button className="btn" style={{ fontSize: "0.78rem" }} onClick={() => { setSelfScoreRevealed(false); setJudgeScoreRevealed(false); }}>
                                                Reset Both
                                            </button>
                                        </div>
                                    </ACard>
                                </div>
                            )}

                            {/* ── TEAMS ─────────────────────────────────── */}
                            {tab === 1 && (
                                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingLeft: "2px" }}>
                                        <span className="label-cap" style={{ color: "var(--gold)" }}>{teams.length} Teams Registered</span>
                                        <span style={{ color: "var(--text-dim)", fontSize: "0.75rem" }}>Click to expand · Right panel shows full details</span>
                                    </div>
                                    {teams.length === 0 && (
                                        <div className="card" style={{ padding: "40px", textAlign: "center" }}>
                                            <p style={{ color: "var(--text-dim)" }}>No teams registered yet.</p>
                                        </div>
                                    )}
                                    {teams.map((t: any) => {
                                        const isOpen = expandedTeam === t.id;
                                        const isCurrent = event?.currentTeamId === t.id;
                                        return (
                                            <motion.div key={t.id} layout
                                                className="card"
                                                style={{ overflow: "hidden", borderColor: isCurrent ? "var(--gold-border)" : undefined, padding: 0 }}>
                                                {/* Header row */}
                                                <div
                                                    onClick={() => setExpandedTeam(isOpen ? null : t.id)}
                                                    style={{ padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", gap: "12px" }}>
                                                    <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                                                        {isCurrent && <span className="badge badge-gold" style={{ flexShrink: 0, fontSize: "0.6rem" }}>ON STAGE</span>}
                                                        <div style={{ minWidth: 0 }}>
                                                            <div style={{ fontFamily: "var(--font-ui)", fontWeight: 700, color: "var(--text)", fontSize: "0.92rem", letterSpacing: "0.03em" }}>{t.teamName}</div>
                                                            <div style={{ color: "var(--text-dim)", fontSize: "0.74rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "340px" }}>{t.projectIdea}</div>
                                                        </div>
                                                    </div>
                                                    <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
                                                        <span className="badge badge-purple" style={{ fontSize: "0.62rem" }}>{t.members?.length ?? 0} members</span>
                                                        <span style={{ color: "var(--text-sub)", fontSize: "1rem", display: "inline-block", transform: isOpen ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>›</span>
                                                    </div>
                                                </div>

                                                {/* Expanded body */}
                                                <AnimatePresence initial={false}>
                                                    {isOpen && (
                                                        <motion.div
                                                            key="body"
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: "auto", opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            transition={{ duration: 0.22, ease: "easeInOut" }}
                                                            style={{ overflow: "hidden" }}
                                                        >
                                                            <div style={{ padding: "0 20px 20px", borderTop: "1px solid var(--border)", paddingTop: "16px" }}>
                                                                {/* Project idea */}
                                                                <div style={{ marginBottom: "16px" }}>
                                                                    <span className="label-cap" style={{ color: "var(--gold)" }}>Project Idea</span>
                                                                    <p style={{ color: "var(--text)", fontSize: "0.88rem", lineHeight: 1.6, marginTop: "4px" }}>{t.projectIdea}</p>
                                                                    {t.teamDescription && (
                                                                        <p style={{ color: "var(--text-sub)", fontSize: "0.78rem", marginTop: "4px", fontStyle: "italic" }}>❝ {t.teamDescription} ❞</p>
                                                                    )}
                                                                </div>

                                                                {/* Members */}
                                                                <span className="label-cap" style={{ color: "var(--gold)" }}>Members</span>
                                                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "8px", marginBottom: "14px" }}>
                                                                    {(t.members || []).map((m: any, idx: number) => (
                                                                        <div key={idx} className="row-item" style={{ padding: "12px 14px" }}>
                                                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "5px" }}>
                                                                                <span style={{ color: "var(--text)", fontWeight: 700, fontSize: "0.85rem" }}>{m.name}</span>
                                                                                {idx === 0 && <span className="badge badge-gold" style={{ fontSize: "0.55rem" }}>Lead</span>}
                                                                            </div>
                                                                            <div style={{ color: "var(--text-sub)", fontSize: "0.72rem", lineHeight: 1.8 }}>
                                                                                <div>{m.usn}</div>
                                                                                <div>{m.branch} · {m.year} Year</div>
                                                                                {m.funFact && <div style={{ color: "var(--text)", fontStyle: "italic" }}>" {m.funFact}"</div>}
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>

                                                                {/* Footer */}
                                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                                                                    <div style={{ color: "var(--text-dim)", fontSize: "0.72rem" }}>
                                                                        PIN: <span style={{ color: "var(--gold-light)", fontFamily: "var(--font-display)", fontSize: "1rem", letterSpacing: "0.12em" }}>{t.pin}</span>
                                                                        {t.registeredAt && <span style={{ marginLeft: "10px" }}>· {new Date(t.registeredAt).toLocaleTimeString()}</span>}
                                                                    </div>
                                                                    <div style={{ display: "flex", gap: "8px" }}>
                                                                        <button
                                                                            className={isCurrent ? "btn-danger" : "btn-gold"}
                                                                            style={{ fontSize: "0.72rem", padding: "6px 14px" }}
                                                                            onClick={() => setCurrentTeam(isCurrent ? "" : t.id)}>
                                                                            {isCurrent ? "Deselect" : "Set On Stage"}
                                                                        </button>
                                                                        <button
                                                                            className="btn-danger"
                                                                            style={{ fontSize: "0.72rem", padding: "6px 14px" }}
                                                                            onClick={() => {
                                                                                if (confirm(`Remove "${t.teamName}" from the list? This cannot be undone.`)) {
                                                                                    deleteTeam(t.id);
                                                                                    setExpandedTeam(null);
                                                                                }
                                                                            }}>
                                                                            Remove Team
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* ── MEMES — FILE UPLOAD ─────────────────────── */}
                            {tab === 2 && (

                                <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: "16px" }}>
                                    <ACard title="Soundboard">
                                        <p style={{ color: "var(--text-sub)", fontSize: "0.83rem", marginBottom: "14px" }}>Click to <strong style={{ color: "var(--gold-light)" }}>play locally</strong> + trigger on live screen. Right-click a sound to delete (confirmation required).</p>
                                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(120px,1fr))", gap: "10px", marginBottom: "14px" }}>
                                            {memes.map((m: any) => (
                                                <motion.button key={m.id} whileTap={{ scale: 0.93 }}
                                                    onClick={() => playMemeLocally(m)}
                                                    onContextMenu={(e) => { e.preventDefault(); deleteMeme(m.id, m.name); }}
                                                    className="row-item" style={{ padding: "16px 10px", cursor: "pointer", border: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                                                    <span style={{ color: "var(--text-sub)", fontSize: "0.7rem", fontWeight: 600, textAlign: "center" }}>{m.type.toUpperCase()}</span>
                                                    <span style={{ color: "var(--text)", fontSize: "0.85rem", fontWeight: 600, textAlign: "center" }}>{m.name}</span>
                                                    <span className="badge badge-purple" style={{ fontSize: "0.65rem" }}>{m.type}</span>
                                                </motion.button>
                                            ))}
                                            {memes.length === 0 && (
                                                <p style={{ color: "var(--text-dim)", fontSize: "0.85rem", gridColumn: "1/-1", padding: "20px 0" }}>No memes yet — upload one →</p>
                                            )}
                                        </div>
                                        <div style={{ display: "flex", gap: "8px" }}>
                                            <button className="btn" style={{ fontSize: "0.78rem" }} onClick={stopLocalAudio}>Stop / Clear</button>
                                            {memes.length > 0 && <button className="btn-danger" style={{ fontSize: "0.78rem" }} onClick={wipeAllMemes}>Wipe All</button>}
                                        </div>
                                    </ACard>

                                    <ACard title="Upload Meme">
                                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                            <div>
                                                <span className="label-cap">Name</span>
                                                <input className="input" value={mName} onChange={e => setMName(e.target.value)} />
                                            </div>

                                            <div style={{ display: "flex", gap: "8px" }}>
                                                {(["audio", "video"] as const).map(t => (
                                                    <button key={t} onClick={() => { setMType(t); setMFile(null); if (fileRef.current) fileRef.current.value = ""; }}
                                                        className={mType === t ? "btn-gold" : "btn"} style={{ flex: 1, padding: "8px" }}>{t.toUpperCase()}</button>
                                                ))}
                                            </div>
                                            <div>
                                                <span className="label-cap">Pick File {mType === "audio" ? "(MP3, WAV…)" : "(MP4, WebM…)"}</span>
                                                <input
                                                    ref={fileRef}
                                                    type="file"
                                                    accept={mType === "audio" ? "audio/*" : "video/*"}
                                                    onChange={e => setMFile(e.target.files?.[0] || null)}
                                                    style={{
                                                        width: "100%", padding: "10px",
                                                        background: "rgba(255,255,255,0.04)",
                                                        border: "1px dashed var(--border)",
                                                        borderRadius: "8px", color: "var(--text-sub)", fontSize: "0.82rem",
                                                        cursor: "pointer",
                                                    }}
                                                />
                                                {mFile && (
                                                    <p style={{ color: mFile.size > 10 * 1024 * 1024 ? "#F87171" : "var(--text-dim)", fontSize: "0.72rem", marginTop: "6px" }}>
                                                        {mFile.name} · {mFile.size > 1024 * 1024 ? `${(mFile.size / 1024 / 1024).toFixed(1)} MB` : `${Math.round(mFile.size / 1024)} KB`}
                                                        {mFile.size > 10 * 1024 * 1024 && " — Too large (max 10MB)"}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Progress bar */}
                                            {uploading && (
                                                <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: "6px", overflow: "hidden", height: "6px" }}>
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${uploadProgress}%` }}
                                                        transition={{ duration: 0.4 }}
                                                        style={{ height: "100%", background: "var(--gold)", borderRadius: "6px" }}
                                                    />
                                                </div>
                                            )}

                                            {uploadMsg && (
                                                <p style={{ color: uploadMsg.startsWith("✓") ? "#6EE7B7" : "#F87171", fontSize: "0.82rem", fontWeight: 600 }}>
                                                    {uploadMsg}
                                                </p>
                                            )}
                                            <button
                                                className="btn-purple"
                                                onClick={handleUploadMeme}
                                                disabled={uploading || !mFile || !mName.trim() || (mFile?.size ?? 0) > 10 * 1024 * 1024}
                                                style={{ opacity: uploading || !mFile || !mName.trim() ? 0.5 : 1 }}
                                            >
                                                {uploading ? `Processing… ${uploadProgress}%` : "⬆ Add to Soundboard"}
                                            </button>
                                        </div>
                                    </ACard>
                                </div>
                            )}

                            {/* ── ROASTS ────────────────────────────────── */}
                            {tab === 3 && (
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                                    <ACard title={`Pending (${pending.length})`}>
                                        {pending.length === 0 && <p style={{ color: "var(--text-dim)", fontSize: "0.85rem" }}>No pending roasts.</p>}
                                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                            {pending.map((r: any) => (
                                                <motion.div key={r.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="row-item" style={{ padding: "14px" }}>
                                                    <span className="badge badge-purple" style={{ marginBottom: "8px", display: "inline-block" }}>{r.teamName}</span>
                                                    <p style={{ color: "var(--text)", fontSize: "0.88rem", marginBottom: "10px" }}>{r.message}</p>
                                                    <div style={{ display: "flex", gap: "8px" }}>
                                                        <button className="btn-gold" style={{ flex: 1, padding: "7px", fontSize: "0.78rem" }} onClick={() => approveRoast(r.id)}>✓ Approve</button>
                                                        <button className="btn-danger" style={{ flex: 1, padding: "7px", fontSize: "0.78rem" }} onClick={() => rejectRoast(r.id)}>✕ Reject</button>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </ACard>
                                    <ACard title={`Live Ticker (${approved.length})`}>
                                        {approved.length === 0 && <p style={{ color: "var(--text-dim)", fontSize: "0.85rem" }}>No approved roasts yet.</p>}
                                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                            {approved.map((r: any) => (
                                                <div key={r.id} className="row-item" style={{ padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
                                                    <p style={{ color: "var(--text-sub)", fontSize: "0.85rem", flex: 1 }}>{r.message}</p>
                                                    <button onClick={() => rejectRoast(r.id)} style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", fontSize: "1rem", flexShrink: 0 }}>×</button>
                                                </div>
                                            ))}
                                        </div>
                                    </ACard>
                                </div>
                            )}

                            {/* ── JUDGES ────────────────────────────────── */}
                            {tab === 4 && (
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                                    <ACard title="Current Judges">
                                        {judges.length === 0 && <p style={{ color: "var(--text-dim)", fontSize: "0.85rem" }}>No judges added yet.</p>}
                                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                            {judges.map((j: any) => (
                                                <div key={j.id} className="row-item" style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                                    <div>
                                                        <p style={{ color: "var(--text)", fontWeight: 600 }}>{j.name}</p>
                                                        <p style={{ color: "var(--text-dim)", fontSize: "0.78rem" }}>PIN: {j.pin}</p>
                                                    </div>
                                                    <button className="btn-danger" style={{ padding: "6px 12px", fontSize: "0.75rem" }} onClick={() => removeJudge(j.id)}>Remove</button>
                                                </div>
                                            ))}
                                        </div>
                                    </ACard>
                                    <ACard title="Add Judge">
                                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                            <div><span className="label-cap">Name</span><input className="input" value={jName} onChange={e => setJName(e.target.value)} placeholder="Judge Name" /></div>
                                            <div><span className="label-cap">4-digit PIN</span><input className="input" value={jPin} onChange={e => setJPin(e.target.value)} placeholder="1234" maxLength={4} /></div>
                                            <button className="btn-gold" onClick={async () => {
                                                if (!jName || !jPin) return;
                                                await addJudge({ name: jName.trim(), pin: jPin.trim() });
                                                setJName(""); setJPin("");
                                            }}>Add Judge</button>
                                        </div>
                                    </ACard>
                                </div>
                            )}

                            {/* ── LEADERBOARD ───────────────────────────── */}
                            {tab === 5 && (
                                <ACard title="Leaderboard Control">
                                    <p style={{ color: "var(--text-sub)", fontSize: "0.82rem", marginBottom: "16px" }}>
                                        Shows judge marks only. Toggle <strong style={{ color: "#F87171" }}>Eliminate</strong> to remove a team from the running.
                                    </p>
                                    <div style={{ overflowX: "auto" }}>
                                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                            <thead>
                                                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                                                    {["#", "Team", "Judge Marks", "Judges In", "Status", "Action"].map(h => (
                                                        <th key={h} style={{ padding: "10px 12px", textAlign: "left", color: "var(--text-sub)", fontSize: "0.73rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {leaderboard.map((team: any, i: number) => {
                                                    const isCurrent = event?.currentTeamId === team.id;
                                                    return (
                                                        <tr key={team.id} style={{
                                                            borderBottom: "1px solid var(--border)",
                                                            opacity: team.eliminated ? 0.45 : 1,
                                                            background: isCurrent ? "rgba(201,168,76,0.07)" : undefined,
                                                            transition: "opacity 0.3s",
                                                        }}>
                                                            <td style={{ padding: "12px", color: "var(--text-dim)", fontFamily: "var(--font-display)", fontSize: "1.1rem" }}>
                                                                {team.eliminated ? "✕" : `#${i + 1}`}
                                                            </td>
                                                            <td style={{ padding: "12px" }}>
                                                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                                                    <span style={{
                                                                        color: team.eliminated ? "var(--text-dim)" : "var(--text)",
                                                                        fontWeight: 600,
                                                                        textDecoration: team.eliminated ? "line-through" : "none",
                                                                    }}>{team.teamName}</span>
                                                                    {isCurrent && <span className="badge badge-gold" style={{ fontSize: "0.58rem" }}>ON STAGE</span>}
                                                                </div>
                                                            </td>
                                                            <td style={{ padding: "12px", fontFamily: "var(--font-display)", fontSize: "1.2rem", color: team.eliminated ? "var(--text-dim)" : "var(--gold-light)", fontWeight: 700 }}>
                                                                {team.judgeAvg ?? "—"}
                                                            </td>
                                                            <td style={{ padding: "12px" }}>
                                                                <span className="badge badge-purple">{team.judgeCount} / {judges.length}</span>
                                                            </td>
                                                            <td style={{ padding: "12px" }}>
                                                                {team.eliminated
                                                                    ? <span className="badge badge-red" style={{ fontSize: "0.65rem" }}>❌ Eliminated</span>
                                                                    : isCurrent
                                                                        ? <span className="badge badge-gold" style={{ fontSize: "0.65rem" }}>🎤 On Stage</span>
                                                                        : <span className="badge badge-green" style={{ fontSize: "0.65rem" }}>✓ Active</span>
                                                                }
                                                            </td>
                                                            <td style={{ padding: "12px" }}>
                                                                <button
                                                                    onClick={() => setTeamEliminated(team.id, !team.eliminated)}
                                                                    className={team.eliminated ? "btn-gold" : "btn-danger"}
                                                                    style={{ fontSize: "0.7rem", padding: "5px 12px" }}>
                                                                    {team.eliminated ? "↩ Restore" : "✕ Eliminate"}
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </ACard>
                            )}


                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </PageShell>
    );
}

function ACard({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="card" style={{ padding: "22px" }}>
            <div style={{ fontSize: "0.73rem", fontWeight: 700, color: "var(--gold)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "16px" }}>{title}</div>
            {children}
        </div>
    );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
    return (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
            <span style={{ color: "var(--text)", fontSize: "0.88rem" }}>{label}</span>
            <button className={`toggle-track${value ? " on" : ""}`} onClick={() => onChange(!value)} aria-label="toggle">
                <div className="toggle-thumb" />
            </button>
        </div>
    );
}
