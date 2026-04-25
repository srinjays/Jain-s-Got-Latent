"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import PageShell from "@/components/ui/PageShell";
import { registerTeam } from "@/lib/db";

const BRANCHES = ["CSE", "ISE", "ECE", "EEE", "ME", "CV", "AIML", "DS", "CY"];
const YEARS = ["1st", "2nd", "3rd", "4th"];
const empty = () => ({ name: "", usn: "", branch: "CSE", year: "2nd", funFact: "" });

export default function RegisterPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState<{ pin: string; name: string } | null>(null);
    const [error, setError] = useState("");
    const [teamName, setTeamName] = useState("");
    const [projectIdea, setProjectIdea] = useState("");
    const [teamDesc, setTeamDesc] = useState("");
    const [count, setCount] = useState(3);
    const [members, setMembers] = useState([empty(), empty(), empty()]);

    const upd = (i: number, f: string, v: string) => {
        const m = [...members]; m[i] = { ...m[i], [f]: v }; setMembers(m);
    };
    const changeCount = (n: number) => {
        setCount(n);
        setMembers(n > members.length
            ? [...members, ...Array(n - members.length).fill(null).map(empty)]
            : members.slice(0, n));
    };

    const validate = () => {
        if (!teamName.trim()) return "Team name is required";
        if (!projectIdea.trim()) return "Project idea is required";
        for (let i = 0; i < members.length; i++) {
            if (!members[i].name.trim()) return `Member ${i + 1} name is required`;
            if (!members[i].usn.trim()) return `Member ${i + 1} USN is required`;
        }
        return "";
    };

    const submit = async () => {
        const err = validate(); if (err) { setError(err); return; }
        setLoading(true); setError("");
        try {
            const r = await registerTeam({ teamName: teamName.trim(), projectIdea, teamDescription: teamDesc, members });
            setDone({ pin: r.pin, name: teamName.trim() });
        } catch { setError("Registration failed. Check your connection."); }
        finally { setLoading(false); }
    };

    if (done) return (
        <PageShell>
            <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 200 }}
                    className="card-gold" style={{ padding: "44px 40px", maxWidth: "420px", width: "100%", textAlign: "center" }}>
                    <div style={{ fontSize: "2.8rem", marginBottom: "14px" }}>🎉</div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: "2rem", color: "var(--text)", marginBottom: "8px" }}>You're In!</div>
                    <p style={{ color: "var(--text-sub)", marginBottom: "28px", fontSize: "0.9rem" }}>
                        Team <strong style={{ color: "var(--text)" }}>{done.name}</strong> is registered
                    </p>
                    <div className="row-item" style={{ padding: "22px", marginBottom: "22px", textAlign: "center" }}>
                        <span className="label-cap" style={{ textAlign: "center" }}>Team PIN — Save this</span>
                        <div style={{ fontFamily: "var(--font-display)", fontSize: "3.5rem", color: "var(--gold-light)", letterSpacing: "0.35em", lineHeight: 1.1 }}>{done.pin}</div>
                        <p style={{ color: "var(--text-dim)", fontSize: "0.75rem", marginTop: "8px" }}>You'll need this to log in later.</p>
                    </div>
                    <div style={{ display: "flex", gap: "10px" }}>
                        <button className="btn-gold" style={{ flex: 1 }} onClick={() => router.push(`/participant?pin=${done.pin}`)}>Open Dashboard</button>
                        <button className="btn-ghost" style={{ flex: 1 }} onClick={() => router.push("/")}>Home</button>
                    </div>
                </motion.div>
            </div>
        </PageShell>
    );

    return (
        <PageShell>
            <div style={{ padding: "60px 20px 100px", display: "flex", flexDirection: "column", alignItems: "center" }}>
                <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: "center", marginBottom: "32px" }}>
                    <div className="diamond-line" style={{ justifyContent: "center", marginBottom: "12px" }}>◆ JOIN THE CHAOS ◆</div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: "2.6rem", color: "var(--text)" }}>Team Registration</div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                    className="card" style={{ width: "100%", maxWidth: "660px", padding: "32px" }}>

                    {/* Team Info */}
                    <SectionLabel>Team Info</SectionLabel>
                    <Field label="Team Name *">
                        <input className="input" value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="Team Sigma, Team What-Are-We-Doing…" />
                    </Field>
                    <Field label="Project Idea *">
                        <textarea className="input" value={projectIdea} onChange={e => setProjectIdea(e.target.value)}
                            placeholder="Describe your brilliantly questionable idea…" rows={3} />
                    </Field>
                    <Field label="Team Tagline (optional)">
                        <input className="input" value={teamDesc} onChange={e => setTeamDesc(e.target.value)} placeholder="We peaked in high school" />
                    </Field>

                    <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "22px 0" }} />

                    {/* Members */}
                    <SectionLabel>Members</SectionLabel>
                    <div style={{ display: "flex", gap: "8px", marginBottom: "18px" }}>
                        {[3, 4].map(n => (
                            <button key={n} onClick={() => changeCount(n)} className={count === n ? "btn-gold" : "btn"} style={{ flex: 1, padding: "9px", fontSize: "0.72rem" }}>
                                {n} Members
                            </button>
                        ))}
                    </div>

                    {members.map((m, i) => (
                        <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                            className="card" style={{ padding: "18px", marginBottom: "12px" }}>
                            <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--gold)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "14px" }}>
                                Member {i + 1}{i === 0 ? " · Team Lead" : ""}
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                                <Field label="Full Name *"><input className="input" value={m.name} onChange={e => upd(i, "name", e.target.value)} placeholder="Your name" /></Field>
                                <Field label="USN *"><input className="input" value={m.usn} onChange={e => upd(i, "usn", e.target.value.toUpperCase())} placeholder="01FE21CS001" /></Field>
                                <Field label="Branch"><select className="input" value={m.branch} onChange={e => upd(i, "branch", e.target.value)}>{BRANCHES.map(b => <option key={b}>{b}</option>)}</select></Field>
                                <Field label="Year"><select className="input" value={m.year} onChange={e => upd(i, "year", e.target.value)}>{YEARS.map(y => <option key={y}>{y}</option>)}</select></Field>
                            </div>
                            <Field label="Fun Fact" style={{ marginTop: "10px" }}>
                                <input className="input" value={m.funFact} onChange={e => upd(i, "funFact", e.target.value)} placeholder="Has never debugged without cursing" />
                            </Field>
                        </motion.div>
                    ))}

                    <AnimatePresence>
                        {error && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="badge badge-red"
                                style={{ display: "block", width: "100%", borderRadius: "8px", padding: "11px 14px", marginBottom: "14px", fontSize: "0.83rem" }}>
                                ⚠ {error}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <button className="btn-gold" style={{ width: "100%", padding: "13px", marginBottom: "10px" }} onClick={submit} disabled={loading}>
                        {loading ? "Registering…" : "REGISTER TEAM →"}
                    </button>
                    <button className="btn-ghost" style={{ width: "100%" }} onClick={() => router.push("/")}>← Back</button>
                </motion.div>
            </div>
        </PageShell>
    );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
    return <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--gold)", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: "14px" }}>{children}</div>;
}
function Field({ label, children, style = {} }: { label: string; children: React.ReactNode; style?: React.CSSProperties }) {
    return <div style={{ marginBottom: "12px", ...style }}>
        <span className="label-cap">{label}</span>{children}
    </div>;
}
