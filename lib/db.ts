import { db } from "./firebase";
import { ref, set, update, push, get, remove, serverTimestamp } from "firebase/database";

// ── Upload Meme File (base64 → stored directly in RTDB) ────────────────────
export const uploadMemeFile = async (file: File, name: string, emoji: string, type: "audio" | "video"): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async () => {
            try {
                const dataUrl = reader.result as string;
                await push(ref(db, "memes"), { name, url: dataUrl, emoji, type });
                resolve(dataUrl);
            } catch (e) {
                reject(e);
            }
        };
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
    });
};

// ── Teams ──────────────────────────────────────────────────────────────────
export const registerTeam = async (teamData: any) => {
    const teamRef = push(ref(db, "teams"));
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    await set(teamRef, { ...teamData, pin, selfScore: null, selfScoreLocked: false, status: "registered", registeredAt: Date.now() });
    return { id: teamRef.key, pin };
};

export const updateTeam = (teamId: string, data: any) => update(ref(db, `teams/${teamId}`), data);
export const setTeamEliminated = (teamId: string, val: boolean) => update(ref(db, `teams/${teamId}`), { eliminated: val });
export const deleteTeam = (teamId: string) => remove(ref(db, `teams/${teamId}`));

export const submitSelfScore = (teamId: string, score: number) =>
    update(ref(db, `teams/${teamId}`), { selfScore: score, selfScoreLocked: true });

// ── Scores ─────────────────────────────────────────────────────────────────
export const submitJudgeScore = (teamId: string, judgeId: string, score: number) =>
    set(ref(db, `scores/${teamId}/${judgeId}`), { score, submitted: true, timestamp: Date.now() });

// ── Event Control ──────────────────────────────────────────────────────────
export const setCurrentTeam = (teamId: string) => update(ref(db, "event"), { currentTeamId: teamId });

export const startTimer = (duration: number) =>
    update(ref(db, "event"), { timerDuration: duration, timerStartTime: Date.now(), timerRunning: true });

export const pauseTimer = (remaining: number) =>
    update(ref(db, "event"), { timerRunning: false, timerRemaining: remaining });

export const resetTimer = () =>
    update(ref(db, "event"), { timerRunning: false, timerStartTime: null, timerRemaining: null });

export const setSelfScoreEnabled = (val: boolean) => update(ref(db, "event"), { selfScoreEnabled: val });
export const setJudgeScoringEnabled = (val: boolean) => update(ref(db, "event"), { judgeScoringEnabled: val });
export const setSelfScoreRevealed = (val: boolean) => update(ref(db, "event"), { selfScoreRevealed: val });
export const setJudgeScoreRevealed = (val: boolean) => update(ref(db, "event"), { judgeScoreRevealed: val });
export const setPhase = (phase: string) => update(ref(db, "event"), { phase });

// ── Memes ──────────────────────────────────────────────────────────────────
export const triggerMeme = (memeId: string) =>
    set(ref(db, "activeMeme"), { id: memeId, triggeredAt: Date.now() });

export const clearMeme = () => set(ref(db, "activeMeme"), { id: null, triggeredAt: null });

// ── Roasts ─────────────────────────────────────────────────────────────────
export const submitRoast = (teamId: string, teamName: string, message: string) =>
    push(ref(db, "roasts"), { teamId, teamName, message, status: "pending", timestamp: Date.now() });

export const approveRoast = (roastId: string) => update(ref(db, `roasts/${roastId}`), { status: "approved" });
export const rejectRoast = (roastId: string) => update(ref(db, `roasts/${roastId}`), { status: "rejected" });

// ── Judges ─────────────────────────────────────────────────────────────────
export const addJudge = (judgeData: any) => push(ref(db, "judges"), judgeData);
export const removeJudge = (judgeId: string) => remove(ref(db, `judges/${judgeId}`));
export const updateJudge = (judgeId: string, data: any) => update(ref(db, `judges/${judgeId}`), data);

// ── Init DB defaults ───────────────────────────────────────────────────────
export const initEventDefaults = async () => {
    const snap = await get(ref(db, "event"));
    if (!snap.exists()) {
        await set(ref(db, "event"), {
            currentTeamId: null, timerDuration: 90, timerStartTime: null,
            timerRunning: false, selfScoreEnabled: false, judgeScoringEnabled: false,
            selfScoreRevealed: false, judgeScoreRevealed: false, phase: "idle",
        });
    }
    // Memes are now uploaded by admin — no placeholders seeded
    const settingsSnap = await get(ref(db, "settings"));
    if (!settingsSnap.exists()) {
        await set(ref(db, "settings"), { adminPin: "420691", judgeCount: 3 });
    }
};
