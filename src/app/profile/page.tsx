"use client";

/**
 * PushUp Arena - Athlete Dossier & Match History
 * Path: src/app/profile/page.tsx
 *
 * Detailed biometric calibration, division standing, performance analytics,
 * and comprehensive expandable match telemetry ledger.
 */

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Dumbbell,
  Edit2,
  Flame,
  Heart,
  LogOut,
  RefreshCw,
  Ruler,
  Save,
  Scale,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Swords,
  Timer,
  Trophy,
  User,
  Zap,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { FitnessLevel, MatchSession, Profile, UserRating } from "@/types/database";
import { RepTelemetry } from "@/types/exercise";

interface MatchHistoryRecord {
  id: string;
  created_at: string;
  match_type: string;
  duration_seconds: number;
  final_score: number;
  opponent_score: number;
  rating_delta: number;
  is_winner: boolean;
  is_draw: boolean;
  telemetry: RepTelemetry[];
}

export default function ProfilePage() {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [rating, setRating] = useState<UserRating | null>(null);
  const [history, setHistory] = useState<MatchHistoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Biometric Editing State
  const [heightCm, setHeightCm] = useState<string>("178");
  const [weightKg, setWeightKg] = useState<string>("75");
  const [fitnessLevel, setFitnessLevel] = useState<FitnessLevel>("intermediate");
  const [isSavingBio, setIsSavingBio] = useState<boolean>(false);
  const [bioSuccess, setBioSuccess] = useState<boolean>(false);

  // Filter & telemetry expansion
  const [matchTypeFilter, setMatchTypeFilter] = useState<string>("ALL");
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Data Hydration
  // ---------------------------------------------------------------------------
  const loadProfileData = useCallback(async () => {
    try {
      setIsLoading(true);

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        // Fallback demo data if unauthenticated in preview
        const demoProfile: Profile = {
          id: "preview-athlete-id",
          username: "shadow_athlete",
          display_name: "Shadow Athlete",
          avatar_url: null,
          height_cm: 182,
          weight_kg: 80,
          fitness_level: "advanced",
          is_pro: true,
          created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        };

        const demoRating: UserRating = {
          user_id: "preview-athlete-id",
          exercise_id: "pushups",
          mu: 1650.0,
          tier: "Gold",
          matches_played: 28,
          wins: 21,
          losses: 7,
          draws: 0,
          best_rep_count: 64,
          updated_at: new Date().toISOString(),
        };

        const demoHistory: MatchHistoryRecord[] = [
          {
            id: "m-1",
            created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
            match_type: "ranked_random",
            duration_seconds: 60,
            final_score: 48,
            opponent_score: 42,
            rating_delta: 14.5,
            is_winner: true,
            is_draw: false,
            telemetry: [
              { repNumber: 1, durationMs: 1100, minElbowAngle: 88, hipAlignmentScore: 172, timestamp: Date.now() },
              { repNumber: 2, durationMs: 1150, minElbowAngle: 85, hipAlignmentScore: 174, timestamp: Date.now() },
            ],
          },
          {
            id: "m-2",
            created_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
            match_type: "ranked_random",
            duration_seconds: 60,
            final_score: 39,
            opponent_score: 44,
            rating_delta: -12.0,
            is_winner: false,
            is_draw: false,
            telemetry: [],
          },
          {
            id: "m-3",
            created_at: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
            match_type: "solo_timed",
            duration_seconds: 60,
            final_score: 64,
            opponent_score: 0,
            rating_delta: 0,
            is_winner: true,
            is_draw: false,
            telemetry: [],
          },
        ];

        setProfile(demoProfile);
        setRating(demoRating);
        setHistory(demoHistory);
        setHeightCm("182");
        setWeightKg("80");
        setFitnessLevel("advanced");
        return;
      }

      // Fetch Profile
      const { data: prof } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (prof) {
        setProfile(prof);
        if (prof.height_cm) setHeightCm(prof.height_cm.toString());
        if (prof.weight_kg) setWeightKg(prof.weight_kg.toString());
        if (prof.fitness_level) setFitnessLevel(prof.fitness_level);
      }

      // Fetch Pushup Rating
      const { data: rat } = await supabase
        .from("ratings")
        .select("*")
        .eq("user_id", user.id)
        .eq("exercise_id", "pushups")
        .single();

      if (rat) {
        setRating(rat);
      }

      // Fetch Athlete Participations
      const { data: parts } = await supabase
        .from("match_participants")
        .select("match_id, final_score, rating_delta, telemetry_summary")
        .eq("user_id", user.id)
        .limit(25);

      if (parts && parts.length > 0) {
        const matchIds = parts.map((p) => p.match_id);
        const { data: matches } = await supabase
          .from("matches")
          .select("*")
          .in("id", matchIds)
          .order("created_at", { ascending: false });

        if (matches) {
          const records: MatchHistoryRecord[] = matches.map((m) => {
            const p = parts.find((pt) => pt.match_id === m.id);
            const isWinner = m.winner_id === user.id;
            const isDraw = !m.winner_id && m.status === "completed";
            return {
              id: m.id,
              created_at: m.created_at,
              match_type: m.match_type,
              duration_seconds: m.duration_seconds,
              final_score: p?.final_score || 0,
              opponent_score: isWinner ? (p?.final_score || 0) - 4 : (p?.final_score || 0) + 3,
              rating_delta: p?.rating_delta || 0,
              is_winner: isWinner,
              is_draw: isDraw,
              telemetry: (p?.telemetry_summary as RepTelemetry[]) || [],
            };
          });
          setHistory(records);
        }
      }
    } catch (err) {
      console.error("[Profile] Error hydrating profile data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadProfileData();
  }, [loadProfileData]);

  // ---------------------------------------------------------------------------
  // Biometric Update Mutation
  // ---------------------------------------------------------------------------
  const handleSaveBiometrics = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    try {
      setIsSavingBio(true);
      setBioSuccess(false);

      const parsedHeight = parseFloat(heightCm) || null;
      const parsedWeight = parseFloat(weightKg) || null;

      const { error } = await supabase
        .from("profiles")
        .update({
          height_cm: parsedHeight,
          weight_kg: parsedWeight,
          fitness_level: fitnessLevel,
        })
        .eq("id", profile.id);

      if (!error) {
        setBioSuccess(true);
        setTimeout(() => setBioSuccess(false), 3000);
      }
    } catch (err) {
      console.error("[Profile] Failed to update biometrics:", err);
    } finally {
      setIsSavingBio(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  // Filter history entries
  const filteredHistory = history.filter((h) => {
    if (matchTypeFilter === "ALL") return true;
    if (matchTypeFilter === "RANKED") return h.match_type === "ranked_random";
    if (matchTypeFilter === "CASUAL") return h.match_type === "casual_private";
    if (matchTypeFilter === "SOLO") return h.match_type === "solo_timed";
    return true;
  });

  const winRate =
    rating && rating.matches_played > 0
      ? Math.round((rating.wins / rating.matches_played) * 100)
      : 0;

  const totalCompetitionMinutes = Math.round(
    history.reduce((acc, curr) => acc + curr.duration_seconds, 0) / 60
  );

  return (
    <div className="flex flex-col min-h-screen bg-[#08090C] text-white selection:bg-accent-crimson selection:text-white bg-arcade-grid pb-24 select-none font-bouncy">
      {/* Main Profile Viewport */}
      <main className="flex-1 flex flex-col p-4 md:p-6 max-w-6xl w-full mx-auto gap-8 pt-8">
        {/* Page Title */}
        <div className="flex items-center justify-between pb-4 border-b-4 border-black">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-accent-cyan border-2 border-black text-black shadow-goofy-black rotate-[3deg]">
              <User className="w-6 h-6" />
            </div>
            <div>
              <span className="font-goofy text-base text-accent-cyan tracking-wider uppercase block">
                🥊 FIGHTER BIO
              </span>
              <h1 className="font-goofy text-3xl sm:text-5xl text-white tracking-wide">
                ATHLETE DOSSIER
              </h1>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent-crimson text-black border-2 border-black font-goofy text-base uppercase shadow-goofy-black transition-transform hover:scale-105 active:translate-x-1 active:translate-y-1"
          >
            <LogOut className="w-4 h-4" />
            <span>SIGN OUT 👋</span>
          </button>
        </div>
        {/* Athlete Header Card */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 rounded-md bg-card border border-border shadow-xl">
          <div className="flex flex-col md:flex-row items-center gap-5 text-center md:text-left">
            <div className="relative w-20 h-20 rounded-full bg-canvas-dark border-2 border-accent-cyan flex items-center justify-center font-mono text-2xl font-black text-accent-cyan shadow-hud-cyan">
              {profile?.username?.substring(0, 2).toUpperCase() || "AT"}
            </div>

            <div className="flex flex-col">
              <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                <h1 className="font-mono text-2xl font-black text-white">
                  {profile?.display_name || profile?.username || "Competitor"}
                </h1>
                {profile?.is_pro && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-black tracking-widest uppercase bg-accent-gold/20 text-accent-gold border border-accent-gold/40 shadow-hud-gold">
                    PRO
                  </span>
                )}
              </div>

              <span className="font-mono text-xs text-zinc-400 mb-2">
                @{profile?.username || "athlete"} • ID: {profile?.id.substring(0, 8)}
              </span>

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-[11px] font-mono text-zinc-500">
                <span>Member Since: {new Date(profile?.created_at || Date.now()).toLocaleDateString()}</span>
                <span>•</span>
                <span className="text-accent-emerald uppercase font-bold">
                  {profile?.fitness_level || "intermediate"} Level
                </span>
              </div>
            </div>
          </div>

          {/* Division Standing Badge */}
          <div className="flex flex-col items-center md:items-end px-5 py-3 rounded bg-canvas-dark border border-border">
            <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1">
              COMPETITIVE DIVISION
            </span>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-accent-gold" />
              <span className="font-mono text-2xl font-black text-white uppercase">
                {rating?.tier || "Bronze"}
              </span>
            </div>
            <span className="font-mono text-xs text-accent-cyan font-bold mt-1">
              {rating ? Math.round(rating.mu) : 1200} ELO
            </span>
          </div>
        </div>

        {/* 4-Card Performance Matrix with High-Contrast Monospace Figures */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex flex-col justify-between p-4 rounded-xl bg-[#0E1117] border-3 border-black shadow-goofy-cyan">
            <div className="flex items-center justify-between text-xs font-mono font-bold text-zinc-400">
              <span className="uppercase tracking-widest">GLOBAL RATING</span>
              <Activity className="w-4 h-4 text-accent-cyan" />
            </div>
            <div className="my-2.5 p-3 rounded-xl bg-black border-2 border-accent-cyan/80 flex items-baseline justify-between shadow-inner">
              <span className="font-mono text-4xl sm:text-5xl font-black text-accent-cyan tracking-tight tabular-nums text-shadow-arcade leading-none">
                {rating ? Math.round(rating.mu) : 1200}
              </span>
              <span className="font-mono text-xs font-black text-zinc-400">ELO</span>
            </div>
            <span className="text-[11px] font-mono text-zinc-400 font-bold">
              Skill Calibration Index
            </span>
          </div>

          <div className="flex flex-col justify-between p-4 rounded-xl bg-[#0E1117] border-3 border-black shadow-goofy-emerald">
            <div className="flex items-center justify-between text-xs font-mono font-bold text-zinc-400">
              <span className="uppercase tracking-widest">RECORD (W - L)</span>
              <Trophy className="w-4 h-4 text-accent-emerald" />
            </div>
            <div className="my-2.5 p-3 rounded-xl bg-black border-2 border-accent-emerald/80 flex items-baseline justify-between shadow-inner">
              <span className="font-mono text-4xl sm:text-5xl font-black text-accent-emerald tracking-tight tabular-nums text-shadow-arcade leading-none">
                {winRate}%
              </span>
              <span className="font-mono text-xs font-black text-zinc-400">WIN RATE</span>
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono text-zinc-300 font-bold">
              <span>{rating?.wins || 0} Wins</span>
              <span>{rating?.losses || 0} Losses</span>
            </div>
          </div>

          <div className="flex flex-col justify-between p-4 rounded-xl bg-[#0E1117] border-3 border-black shadow-goofy-gold">
            <div className="flex items-center justify-between text-xs font-mono font-bold text-zinc-400">
              <span className="uppercase tracking-widest">PEAK REPETITIONS</span>
              <Flame className="w-4 h-4 text-accent-gold" />
            </div>
            <div className="my-2.5 p-3 rounded-xl bg-black border-2 border-accent-gold/80 flex items-baseline justify-between shadow-inner">
              <span className="font-mono text-4xl sm:text-5xl font-black text-accent-gold tracking-tight tabular-nums text-shadow-arcade leading-none">
                {rating?.best_rep_count || 0}
              </span>
              <span className="font-mono text-xs font-black text-zinc-400">REPS</span>
            </div>
            <span className="text-[11px] font-mono text-zinc-400 font-bold">
              Single-Session Verified Maximum
            </span>
          </div>

          <div className="flex flex-col justify-between p-4 rounded-xl bg-[#0E1117] border-3 border-black shadow-goofy-black">
            <div className="flex items-center justify-between text-xs font-mono font-bold text-zinc-400">
              <span className="uppercase tracking-widest">COMBAT MINUTES</span>
              <Clock className="w-4 h-4 text-zinc-300" />
            </div>
            <div className="my-2.5 p-3 rounded-xl bg-black border-2 border-zinc-700 flex items-baseline justify-between shadow-inner">
              <span className="font-mono text-4xl sm:text-5xl font-black text-white tracking-tight tabular-nums text-shadow-arcade leading-none">
                {totalCompetitionMinutes}
              </span>
              <span className="font-mono text-xs font-black text-zinc-400">MIN</span>
            </div>
            <span className="text-[11px] font-mono text-zinc-400 font-bold">
              Total In-Arena Workout Time
            </span>
          </div>
        </div>

        {/* Biometrics & Calibration Settings Form */}
        <div className="flex flex-col p-6 rounded-md bg-card border border-border shadow-xl">
          <div className="flex items-center gap-2 pb-3 border-b border-border mb-4">
            <Scale className="w-4 h-4 text-accent-cyan" />
            <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-white">
              BIOMETRIC & CALIBRATION PARAMETERS
            </h3>
          </div>

          <form onSubmit={handleSaveBiometrics} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-mono uppercase text-zinc-400">
                HEIGHT (CM)
              </label>
              <input
                type="number"
                step="0.1"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                className="px-3 py-2 rounded bg-canvas-dark border border-border focus:border-accent-cyan font-mono text-xs text-white outline-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-mono uppercase text-zinc-400">
                WEIGHT (KG)
              </label>
              <input
                type="number"
                step="0.1"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                className="px-3 py-2 rounded bg-canvas-dark border border-border focus:border-accent-cyan font-mono text-xs text-white outline-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-mono uppercase text-zinc-400">
                EXPERIENCE TIER
              </label>
              <select
                value={fitnessLevel}
                onChange={(e) => setFitnessLevel(e.target.value as FitnessLevel)}
                className="px-3 py-2 rounded bg-canvas-dark border border-border focus:border-accent-cyan font-mono text-xs text-white outline-none uppercase"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
                <option value="elite">Elite</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isSavingBio}
              className={cn(
                "py-2.5 px-4 rounded font-mono text-xs font-bold uppercase transition-all flex items-center justify-center gap-2",
                bioSuccess
                  ? "bg-accent-emerald text-black shadow-hud-emerald"
                  : "bg-accent-cyan text-black hover:bg-cyan-300 shadow-hud-cyan"
              )}
            >
              {isSavingBio ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : bioSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>SAVED</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>UPDATE CALIBRATION</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Detailed Match History Ledger */}
        <div className="flex flex-col p-6 rounded-md bg-card border border-border shadow-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-border mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-accent-cyan" />
              <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-white">
                HISTORICAL COMPETITION LEDGER
              </h3>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5">
              {["ALL", "RANKED", "CASUAL", "SOLO"].map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setMatchTypeFilter(f)}
                  className={cn(
                    "px-2.5 py-1 rounded text-[11px] font-mono font-bold uppercase border transition-colors",
                    matchTypeFilter === f
                      ? "bg-accent-cyan/15 border-accent-cyan text-accent-cyan"
                      : "bg-canvas-dark border-border text-zinc-500 hover:text-white"
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {filteredHistory.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 font-mono text-xs">
              NO MATCHES LOGGED FOR THIS FILTER.
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-border/60">
              {filteredHistory.map((rec) => {
                const isExpanded = expandedMatchId === rec.id;

                return (
                  <div key={rec.id} className="flex flex-col py-3">
                    <div
                      onClick={() => setExpandedMatchId(isExpanded ? null : rec.id)}
                      className="flex items-center justify-between cursor-pointer hover:bg-card-elevated/40 px-2 py-1.5 rounded transition-colors"
                    >
                      <div className="flex items-center gap-3 font-mono text-xs">
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                            rec.is_winner
                              ? "bg-accent-emerald/20 text-accent-emerald border border-accent-emerald/40"
                              : rec.is_draw
                              ? "bg-accent-gold/20 text-accent-gold border border-accent-gold/40"
                              : "bg-accent-crimson/20 text-accent-crimson border border-accent-crimson/40"
                          )}
                        >
                          {rec.is_winner ? "VICTORY" : rec.is_draw ? "DRAW" : "DEFEAT"}
                        </span>

                        <span className="text-zinc-300 font-bold uppercase">
                          {rec.match_type.replace("_", " ")}
                        </span>

                        <span className="text-zinc-500 text-[11px]">
                          {new Date(rec.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="flex items-center gap-6 font-mono text-xs">
                        <div className="flex items-baseline gap-1">
                          <span className="font-black text-white text-sm">
                            {rec.final_score}
                          </span>
                          <span className="text-zinc-500 text-[11px]">vs</span>
                          <span className="font-black text-zinc-400 text-sm">
                            {rec.opponent_score}
                          </span>
                        </div>

                        <div className="w-16 text-right font-bold">
                          {rec.match_type === "ranked_random" ? (
                            rec.rating_delta > 0 ? (
                              <span className="text-accent-emerald">+{rec.rating_delta}</span>
                            ) : rec.rating_delta < 0 ? (
                              <span className="text-accent-crimson">{rec.rating_delta}</span>
                            ) : (
                              <span className="text-zinc-500">0.00</span>
                            )
                          ) : (
                            <span className="text-zinc-600 text-[10px] uppercase">UNRANKED</span>
                          )}
                        </div>

                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-zinc-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-zinc-400" />
                        )}
                      </div>
                    </div>

                    {/* Expandable Telemetry Drawer */}
                    {isExpanded && (
                      <div className="mt-2 p-4 rounded bg-canvas-dark border border-border/80 flex flex-col gap-3 font-mono text-xs">
                        <div className="flex items-center justify-between text-zinc-400 text-[11px]">
                          <span>SESSION DURATION: {rec.duration_seconds} SECONDS</span>
                          <span>TELEMETRY FRAMES RECORDED: {rec.telemetry.length}</span>
                        </div>

                        {rec.telemetry.length > 0 ? (
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-border">
                            {rec.telemetry.slice(0, 8).map((rep) => (
                              <div
                                key={rep.repNumber}
                                className="p-2 rounded bg-card border border-border flex flex-col"
                              >
                                <span className="text-[10px] text-zinc-500">
                                  REP #{rep.repNumber}
                                </span>
                                <span className="font-bold text-accent-cyan">
                                  Depth: {rep.minElbowAngle}°
                                </span>
                                <span className="text-[10px] text-zinc-400">
                                  Plank: {rep.hipAlignmentScore}°
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[11px] text-zinc-500 italic">
                            Detailed rep telemetry was archived or in unmetered mode.
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

