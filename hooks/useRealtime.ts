"use client";
import { db } from "@/lib/firebase";
import { ref, onValue } from "firebase/database";
import { useState, useEffect } from "react";

export const useRealtimeValue = <T>(path: string): T | null => {
    const [value, setValue] = useState<T | null>(null);
    useEffect(() => {
        const r = ref(db, path);
        const unsub = onValue(r, (snap) => setValue(snap.val() as T));
        return () => unsub();
    }, [path]);
    return value;
};

export const useTeams = () => {
    const raw = useRealtimeValue<Record<string, any>>("teams");
    if (!raw) return [];
    return Object.entries(raw).map(([id, data]) => ({ id, ...data }));
};

export const useScores = () => useRealtimeValue<Record<string, any>>("scores") ?? {};

export const useEvent = () => useRealtimeValue<Record<string, any>>("event");

export const useJudges = () => {
    const raw = useRealtimeValue<Record<string, any>>("judges");
    if (!raw) return [];
    return Object.entries(raw).map(([id, data]) => ({ id, ...data }));
};

export const useMemes = () => {
    const raw = useRealtimeValue<Record<string, any>>("memes");
    if (!raw) return [];
    return Object.entries(raw).map(([id, data]) => ({ id, ...data }));
};

export const useRoasts = (status?: string) => {
    const raw = useRealtimeValue<Record<string, any>>("roasts");
    if (!raw) return [];
    return Object.entries(raw)
        .map(([id, data]) => ({ id, ...data }))
        .filter((r: any) => (status ? r.status === status : true))
        .sort((a: any, b: any) => a.timestamp - b.timestamp);
};

export const useActiveMeme = () => useRealtimeValue<{ id: string | null; triggeredAt: number | null }>("activeMeme");

export const useSettings = () => useRealtimeValue<Record<string, any>>("settings");

export const useTimer = () => {
    const event = useEvent();
    const [remaining, setRemaining] = useState<number>(90);

    useEffect(() => {
        if (!event) return;
        const { timerRunning, timerStartTime, timerDuration, timerRemaining } = event;
        if (!timerRunning) {
            setRemaining(timerRemaining ?? timerDuration ?? 90);
            return;
        }
        const tick = () => {
            const elapsed = Math.floor((Date.now() - timerStartTime) / 1000);
            const left = Math.max(0, (timerDuration ?? 90) - elapsed);
            setRemaining(left);
        };
        tick();
        const interval = setInterval(tick, 500);
        return () => clearInterval(interval);
    }, [event]);

    return { remaining, total: event?.timerDuration ?? 90, running: event?.timerRunning ?? false };
};

export const useLeaderboard = () => {
    const teams = useTeams();
    const scores = useScores();

    return teams.map((team: any) => {
        const teamScores = scores[team.id] ?? {};
        const judgeEntries = Object.values(teamScores) as any[];
        const submitted = judgeEntries.filter((j) => j.submitted);
        const judgeAvg = submitted.length
            ? Math.round((submitted.reduce((acc, j) => acc + (j.score ?? 0), 0) / submitted.length) * 10) / 10
            : null;
        return {
            ...team,
            judgeAvg,
            judgeCount: submitted.length,
        };
    }).sort((a: any, b: any) => {
        if (a.eliminated && !b.eliminated) return 1;
        if (!a.eliminated && b.eliminated) return -1;
        return (b.judgeAvg ?? -1) - (a.judgeAvg ?? -1);
    });
};

// ── Battle ─────────────────────────────────────────────────────────────────
export const useBattle = () => useRealtimeValue<Record<string, any>>("battle");

export const useBattleAudienceVotes = () =>
    useRealtimeValue<Record<string, "A" | "B">>("battleAudienceVotes") ?? {};

export const useBattleJudgeVotes = () =>
    useRealtimeValue<Record<string, "A" | "B">>("battleJudgeVotes") ?? {};

export const useBattleTimer = () => {
    const battle = useBattle();
    const [remaining, setRemaining] = useState<number>(60);

    useEffect(() => {
        if (!battle) return;
        const { timerRunning, timerStartTime, timerDuration } = battle;
        if (!timerRunning) {
            setRemaining(timerDuration ?? 60);
            return;
        }
        const tick = () => {
            const elapsed = Math.floor((Date.now() - timerStartTime) / 1000);
            const left = Math.max(0, (timerDuration ?? 60) - elapsed);
            setRemaining(left);
        };
        tick();
        const interval = setInterval(tick, 500);
        return () => clearInterval(interval);
    }, [battle]);

    return {
        remaining,
        total: battle?.timerDuration ?? 60,
        running: battle?.timerRunning ?? false,
    };
};

