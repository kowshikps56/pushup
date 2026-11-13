"use client";

/**
 * PushUp Arena - Goofy Arcade Athlete Dashboard
 * Path: src/app/dashboard/page.tsx
 */

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowRight,
  Check,
  Compass,
  Copy,
  Crown,
  KeyRound,
  Play,
  Plus,
  RefreshCw,
  Share2,
  Shield,
  ShieldCheck,
  Sparkles,
  Swords,
  Timer,
  Trophy,
  Users,
  Zap,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { MatchSession, Profile, TierType, UserRating } from "@/types/database";

interface RecentMatchItem {
  id: string;
  created_at: string;
  match_type: string;
  duration_seconds: number;
  final_score: number;
  winner_id: string | null;
  rating_delta: number;
  is_winner: boolean;
  is_draw: boolean;
}

export default function DashboardPage() {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [rating, setRating] = useState<UserRating | null>(null);
  const [recentMatches, setRecentMatches] = useState<RecentMatchItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Private room creation modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [challengeMode, setChallengeMode] = useState<"timed" | "target">("timed");
  const [createDuration, setCreateDuration] = useState<number>(60);
  const [targetReps, setTargetReps] = useState<number>(25);
  const [isCreatingRoom, setIsCreatingRoom] = useState<boolean>(false);
  const [createdRoomCode, setCreatedRoomCode] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Join room form
  const [joinCodeInput, setJoinCodeInput] = useState<string>("");
  const [isJoiningRoom, setIsJoiningRoom] = useState<boolean>(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const loadDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setProfile({
          id: "guest-athlete",
          username: "challenger_prime",
          display_name: "Challenger Prime",
          avatar_url: null,
          height_cm: 180,
          weight_kg: 78,
          fitness_level: "advanced",
          is_pro: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        setRating({
          user_id: "guest-athlete",
          exercise_id: "pushups",
          mu: 1350,
          tier: "Silver",
          matches_played: 14,
          wins: 10,
          losses: 4,
          draws: 0,
          best_rep_count: 42,
          updated_at: new Date().toISOString(),
        });
        setRecentMatches([
          {
            id: "match-demo-1",
            created_at: new Date(Date.now() - 3600000).toISOString(),
            match_type: "ranked_random",
            duration_seconds: 60,
            final_score: 38,
            winner_id: "guest-athlete",
            rating_delta: 18,
            is_winner: true,
            is_draw: false,
          },
          {
            id: "match-demo-2",
            created_at: new Date(Date.now() - 86400000).toISOString(),
            match_type: "casual_private",
            duration_seconds: 60,
            final_score: 35,
            winner_id: "guest-athlete",
            rating_delta: 0,
            is_winner: true,
            is_draw: false,
          },
        ]);
        setIsLoading(false);
        return;
      }

      // Fetch Profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
      }

      // Fetch Ratings
      const { data: ratingData } = await supabase
        .from("ratings")
        .select("*")
        .eq("user_id", user.id)
        .eq("exercise_id", "pushups")
        .single();

      if (ratingData) {
        setRating(ratingData);
      }

      // Fetch Match Ledger
      const { data: participations } = await supabase
        .from("match_participants")
        .select("match_id, final_score, rating_delta")
        .eq("user_id", user.id)
        .order("match_id", { ascending: false })
        .limit(10);

      if (participations && participations.length > 0) {
        const matchIds = participations.map((p) => p.match_id);
        const { data: matches } = await supabase
          .from("matches")
          .select("*")
          .in("id", matchIds)
          .order("created_at", { ascending: false })
          .limit(5);

        if (matches) {
          const items: RecentMatchItem[] = matches.map((m) => {
            const p = participations.find((pt) => pt.match_id === m.id);
            const isWinner = m.winner_id === user.id;
            const isDraw = !m.winner_id && m.status === "completed";
            return {
              id: m.id,
              created_at: m.created_at,
              match_type: m.match_type,
              duration_seconds: m.duration_seconds,
              final_score: p?.final_score || 0,
              winner_id: m.winner_id,
              rating_delta: p?.rating_delta || 0,
              is_winner: isWinner,
              is_draw: isDraw,
            };
          });
          setRecentMatches(items);
        }
      }
    } catch (err) {
      console.error("[Dashboard] Hydration error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const generateRoomCode = (): string => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleCreateRoom = async () => {
    try {
      setIsCreatingRoom(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const hostId = user?.id || profile?.id;
      if (!hostId) {
        router.push("/login");
        return;
      }

      const { data: match, error: matchErr } = await supabase
        .from("matches")
        .insert({
          exercise_id: "pushups",
          match_type: "casual_private",
          status: "lobby",
          duration_seconds: challengeMode === "timed" ? createDuration : 300,
          target_reps: challengeMode === "target" ? targetReps : null,
        })
        .select()
        .single();

      if (matchErr || !match) {
        console.error("[Dashboard] Failed to create match:", matchErr);
        setIsCreatingRoom(false);
        return;
      }

      const code = generateRoomCode();
      const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

      const { error: roomErr } = await supabase.from("private_rooms").insert({
        code,
        match_id: match.id,
        host_id: hostId,
        exercise_id: "pushups",
        duration_seconds: createDuration,
        is_active: true,
        expires_at: expiresAt,
      });

      if (roomErr) {
        console.error("[Dashboard] Failed to create room:", roomErr);
        setIsCreatingRoom(false);
        return;
      }

      setCreatedRoomCode(code);
      setIsCreatingRoom(false);
    } catch (err) {
      console.error("[Dashboard] Exception creating room:", err);
      setIsCreatingRoom(false);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError(null);

    const cleanCode = joinCodeInput.trim().toUpperCase();
    if (cleanCode.length !== 6) {
      setJoinError("Room code must be exactly 6 characters.");
      return;
    }

    try {
      setIsJoiningRoom(true);

      const { data: room, error: fetchErr } = await supabase
        .from("private_rooms")
        .select("code, is_active, expires_at")
        .eq("code", cleanCode)
        .eq("is_active", true)
        .single();

      if (fetchErr || !room) {
        setJoinError("Room not found or no longer active.");
        setIsJoiningRoom(false);
        return;
      }

      router.push(`/arena/room/${cleanCode}`);
    } catch (err) {
      console.error("[Dashboard] Error checking room:", err);
      setJoinError("Network error checking room availability.");
      setIsJoiningRoom(false);
    }
  };

  const winRate =
    rating && rating.matches_played > 0
      ? Math.round((rating.wins / rating.matches_played) * 100)
      : 0;

  return (
    <div className="flex flex-col min-h-screen bg-[#08090C] text-white selection:bg-accent-crimson selection:text-white bg-arcade-grid select-none pb-24">
      <main className="flex-1 flex flex-col p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto gap-8 pt-6">
        {/* Goofy Header */}
        <div className="flex items-center justify-between pb-4 border-b-4 border-black">
          <div>
            <span className="font-goofy text-base text-accent-gold tracking-wider uppercase block">
              🕹️ ATHLETE HQ
            </span>
            <h1 className="font-goofy text-3xl sm:text-5xl text-white tracking-wide">
              WELCOME BACK, {profile?.display_name?.toUpperCase() || profile?.username?.toUpperCase() || "CHAMP"}!
            </h1>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <span className="px-3.5 py-1 rounded-xl bg-accent-gold text-black border-2 border-black font-goofy text-base shadow-goofy-black">
              ⭐ TIER: {rating?.tier?.toUpperCase() || "BRONZE"}
            </span>
          </div>
        </div>

        {/* Section 1: Goofy Stats Matrix with Crystal-Clear Monospace Numbers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-bouncy">
          {/* Card 1: ARENA ELO SCORE (eg. 1350) */}
          <div className="p-5 rounded-2xl bg-[#0E1117] border-3 border-black shadow-goofy-cyan flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-black text-zinc-400">
              <span className="uppercase tracking-wider">ARENA ELO SCORE</span>
              <span className="text-xl">⚡</span>
            </div>
            <div className="my-2.5 p-3 rounded-xl bg-black border-2 border-accent-cyan/80 flex items-baseline justify-between shadow-inner">
              <span className="font-mono text-5xl sm:text-6xl font-black text-accent-cyan tracking-tight tabular-nums text-shadow-arcade leading-none">
                {rating ? Math.round(rating.mu) : 1200}
              </span>
              <span className="font-mono text-sm font-black text-zinc-400">PTS</span>
            </div>
            <div className="flex items-center justify-between text-xs font-bold text-zinc-300">
              <span className="font-bold">DIVISION:</span>
              <span className="px-2.5 py-0.5 rounded-lg bg-accent-gold text-black font-goofy text-sm border-2 border-black font-black shadow-sm">
                {rating?.tier?.toUpperCase() || "BRONZE"}
              </span>
            </div>
          </div>

          {/* Card 2: VICTORY RATIO (eg. 71%) */}
          <div className="p-5 rounded-2xl bg-[#0E1117] border-3 border-black shadow-goofy-emerald flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-black text-zinc-400">
              <span className="uppercase tracking-wider">VICTORY RATIO</span>
              <span className="text-xl">🏆</span>
            </div>
            <div className="my-2.5 p-3 rounded-xl bg-black border-2 border-accent-emerald/80 flex items-baseline justify-between shadow-inner">
              <span className="font-mono text-5xl sm:text-6xl font-black text-accent-emerald tracking-tight tabular-nums text-shadow-arcade leading-none">
                {winRate}%
              </span>
              <span className="font-mono text-xs font-black text-zinc-400">WIN RATE</span>
            </div>
            <div className="flex items-center justify-between text-xs font-bold text-zinc-300">
              <span className="font-bold">RECORD:</span>
              <span className="font-mono font-bold text-white">
                <strong className="text-accent-emerald">{rating?.wins || 0}W</strong> - <strong className="text-accent-crimson">{rating?.losses || 0}L</strong> ({rating?.matches_played || 0} Tot)
              </span>
            </div>
          </div>

          {/* Card 3: PERSONAL RECORD (eg. 42) */}
          <div className="p-5 rounded-2xl bg-[#0E1117] border-3 border-black shadow-goofy-gold flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-black text-zinc-400">
              <span className="uppercase tracking-wider">PERSONAL RECORD</span>
              <span className="text-xl">🦾</span>
            </div>
            <div className="my-2.5 p-3 rounded-xl bg-black border-2 border-accent-gold/80 flex items-baseline justify-between shadow-inner">
              <span className="font-mono text-5xl sm:text-6xl font-black text-accent-gold tracking-tight tabular-nums text-shadow-arcade leading-none">
                {rating?.best_rep_count || 0}
              </span>
              <span className="font-mono text-xs font-black text-zinc-400">REPS / 60S</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-300">
              <span className="text-accent-emerald font-black">✓</span>
              <span>Strict 90° CV Depth Verified</span>
            </div>
          </div>

          {/* Card 4: PRO PASS */}
          <div className="p-5 rounded-2xl bg-[#12101A] border-3 border-black shadow-goofy-violet flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-bold text-accent-violet">
              <span className="uppercase tracking-wider">PRO PASS</span>
              <span className="text-xl">👑</span>
            </div>
            <div className="my-1">
              <span className="font-goofy text-3xl text-white text-shadow-arcade">
                {profile?.is_pro ? "PRO TITAN" : "FREE FIGHTER"}
              </span>
              <p className="text-xs text-zinc-400 mt-0.5 font-medium">
                {profile?.is_pro ? "Unlimited telemetry & perks" : "Upgrade for AI form coaching"}
              </p>
            </div>
            <Link
              href="/pricing"
              className="text-xs font-goofy tracking-wider text-accent-violet hover:underline flex items-center gap-1"
            >
              <span>{profile?.is_pro ? "MANAGE PRO" : "GET PRO PASS (₹99/MO) 🚀"}</span>
            </Link>
          </div>
        </div>

        {/* Section 2: Goofy 4 Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1 */}
          <div
            onClick={() => router.push("/arena/ranked")}
            className="p-6 rounded-2xl bg-[#0E1117] border-3 border-black shadow-goofy-cyan hover:scale-105 active:translate-x-1 active:translate-y-1 cursor-pointer transition-all flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-3xl">🥊</span>
                <span className="font-goofy text-xs text-accent-cyan tracking-wider">1V1 RANKED</span>
              </div>
              <h3 className="font-goofy text-2xl text-white mb-1 group-hover:text-accent-cyan transition-colors">
                FIND RANDOM MATCH
              </h3>
              <p className="font-bouncy text-xs text-zinc-400 leading-relaxed mb-4 font-medium">
                Drop into the live queue to battle an opponent of your skill level!
              </p>
            </div>
            <span className="font-goofy text-base text-accent-cyan flex items-center gap-1.5 tracking-wider">
              <span>QUEUE UP NOW ⚡</span>
              <ArrowRight className="w-4 h-4" />
            </span>
          </div>

          {/* Card 2 */}
          <div
            onClick={() => setIsCreateModalOpen(true)}
            className="p-6 rounded-2xl bg-[#0E1117] border-3 border-black shadow-goofy-emerald hover:scale-105 active:translate-x-1 active:translate-y-1 cursor-pointer transition-all flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-3xl">🍕</span>
                <span className="font-goofy text-xs text-accent-emerald tracking-wider">FRIEND BATTLE</span>
              </div>
              <h3 className="font-goofy text-2xl text-white mb-1 group-hover:text-accent-emerald transition-colors">
                CREATE FRIEND ROOM
              </h3>
              <p className="font-bouncy text-xs text-zinc-400 leading-relaxed mb-4 font-medium">
                Get a 6-character code and invite your buddy via WhatsApp!
              </p>
            </div>
            <span className="font-goofy text-base text-accent-emerald flex items-center gap-1.5 tracking-wider">
              <span>HOST LOBBY 🚀</span>
              <ArrowRight className="w-4 h-4" />
            </span>
          </div>

          {/* Card 3 */}
          <div className="p-6 rounded-2xl bg-[#0E1117] border-3 border-black shadow-goofy-black flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-3xl">🔑</span>
                <span className="font-goofy text-xs text-zinc-400 tracking-wider">HAVE A CODE?</span>
              </div>
              <h3 className="font-goofy text-2xl text-white mb-1">
                JOIN BY ROOM CODE
              </h3>
              <p className="font-bouncy text-xs text-zinc-400 leading-relaxed mb-3 font-medium">
                Enter your friend&apos;s 6-letter room code below.
              </p>
            </div>
            <form onSubmit={handleJoinRoom} className="flex flex-col gap-2 font-bouncy">
              <input
                type="text"
                maxLength={6}
                value={joinCodeInput}
                onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                placeholder="e.g. ARENA1"
                className="w-full px-3 py-2 rounded-xl bg-[#08090C] border-2 border-black focus:border-accent-cyan text-center font-goofy text-lg tracking-widest text-white outline-none"
              />
              {joinError && <span className="text-xs text-accent-crimson font-bold">{joinError}</span>}
              <button
                type="submit"
                disabled={isJoiningRoom || joinCodeInput.length !== 6}
                className="w-full py-2.5 rounded-xl bg-[#161B22] hover:bg-zinc-800 border-2 border-black font-goofy text-base uppercase text-white shadow-goofy-black active:translate-x-1 active:translate-y-1 transition-all disabled:opacity-50"
              >
                {isJoiningRoom ? "CONNECTING..." : "ENTER ROOM 🚀"}
              </button>
            </form>
          </div>

          {/* Card 4 */}
          <div
            onClick={() => router.push("/arena/solo")}
            className="p-6 rounded-2xl bg-[#0E1117] border-3 border-black shadow-goofy-violet hover:scale-105 active:translate-x-1 active:translate-y-1 cursor-pointer transition-all flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-3xl">🧪</span>
                <span className="font-goofy text-xs text-accent-violet tracking-wider">SOLO PRACTICE</span>
              </div>
              <h3 className="font-goofy text-2xl text-white mb-1 group-hover:text-accent-violet transition-colors">
                CALIBRATION LAB
              </h3>
              <p className="font-bouncy text-xs text-zinc-400 leading-relaxed mb-4 font-medium">
                Test your camera angle, tune elbow depth, and practice solo.
              </p>
            </div>
            <span className="font-goofy text-base text-accent-violet flex items-center gap-1.5 tracking-wider">
              <span>OPEN LAB 🧪</span>
              <ArrowRight className="w-4 h-4" />
            </span>
          </div>
        </div>

        {/* Section 3: Match History & Titans */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 p-6 rounded-2xl bg-[#0E1117] border-3 border-black shadow-goofy-black">
            <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-black">
              <div className="flex items-center gap-2">
                <span className="text-xl">📜</span>
                <h3 className="font-goofy text-xl text-white tracking-wide">
                  RECENT MATCH LEDGER
                </h3>
              </div>
              <Link href="/profile" className="font-goofy text-sm text-accent-cyan hover:underline">
                VIEW ALL MATCHES
              </Link>
            </div>

            {recentMatches.length === 0 ? (
              <div className="py-12 text-center font-bouncy text-sm text-zinc-500 font-bold">
                NO MATCHES LOGGED YET! JUMP INTO THE RING! 🥊
              </div>
            ) : (
              <div className="flex flex-col gap-2.5 font-bouncy">
                {recentMatches.map((match) => (
                  <div
                    key={match.id}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-[#161B22] border-2 border-black hover:scale-[1.01] transition-transform"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">
                        {match.is_winner ? "👑" : match.is_draw ? "🤝" : "💀"}
                      </span>
                      <div className="flex flex-col">
                        <span className="font-goofy text-base text-white tracking-wide">
                          {match.is_winner ? "VICTORY!" : match.is_draw ? "DRAW" : "DEFEAT"}
                        </span>
                        <span className="text-xs text-zinc-400 font-bold">
                          {match.match_type === "ranked_random" ? "RANKED 1V1" : "FRIEND BATTLE"} • {match.duration_seconds}S
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <span className="font-mono font-black text-2xl text-accent-cyan leading-none tabular-nums text-shadow-arcade block">
                          {match.final_score}
                        </span>
                        <span className="text-[10px] text-zinc-400 block font-mono font-bold">REPS</span>
                      </div>
                      {match.match_type === "ranked_random" && (
                        <div className="text-right w-16">
                          <span
                            className={cn(
                              "font-mono font-black text-lg tabular-nums text-shadow-arcade block",
                              match.rating_delta > 0
                                ? "text-accent-emerald"
                                : match.rating_delta < 0
                                ? "text-accent-crimson"
                                : "text-zinc-400"
                            )}
                          >
                            {match.rating_delta > 0 ? `+${match.rating_delta}` : match.rating_delta}
                          </span>
                          <span className="text-[10px] text-zinc-400 block font-mono font-bold">ELO</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-4 p-6 rounded-2xl bg-[#0E1117] border-3 border-black shadow-goofy-gold flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-black">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🏆</span>
                  <h3 className="font-goofy text-xl text-accent-gold tracking-wide">
                    TOP FLEX TITANS
                  </h3>
                </div>
                <Link href="/leaderboard" className="font-goofy text-sm text-accent-cyan hover:underline">
                  FULL TABLE
                </Link>
              </div>

              <div className="flex flex-col gap-2.5 font-bouncy">
                <div className="flex items-center justify-between p-3 rounded-xl bg-[#161B22] border-2 border-accent-gold shadow-goofy-gold">
                  <div className="flex items-center gap-2">
                    <span className="font-goofy text-lg text-accent-gold">#1</span>
                    <span className="font-bold text-white text-sm">Titan_Apex</span>
                  </div>
                  <span className="font-goofy text-base text-accent-gold">2,480 ELO</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-[#161B22] border-2 border-black shadow-goofy-black">
                  <div className="flex items-center gap-2">
                    <span className="font-goofy text-lg text-zinc-300">#2</span>
                    <span className="font-bold text-white text-sm">Valkyrie_99</span>
                  </div>
                  <span className="font-goofy text-base text-accent-cyan">2,395 ELO</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-[#161B22] border-2 border-black shadow-goofy-black">
                  <div className="flex items-center gap-2">
                    <span className="font-goofy text-lg text-amber-500">#3</span>
                    <span className="font-bold text-white text-sm">IronPulse</span>
                  </div>
                  <span className="font-goofy text-base text-zinc-300">2,340 ELO</span>
                </div>
              </div>
            </div>

            <Link
              href="/leaderboard"
              className="mt-6 w-full py-3 rounded-xl bg-[#161B22] hover:bg-zinc-800 border-2 border-black text-white font-goofy text-base tracking-wider text-center shadow-goofy-black transition-transform hover:scale-105 active:translate-x-1 active:translate-y-1"
            >
              VIEW LEADERBOARDS 🏆
            </Link>
          </div>
        </div>
      </main>

      {/* Private Room Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full p-6 rounded-2xl bg-[#0E1117] border-4 border-black shadow-goofy-emerald relative font-bouncy">
            <h3 className="font-goofy text-2xl text-white mb-1 flex items-center gap-2">
              <span>🍕 HOST FRIEND BATTLE</span>
            </h3>
            <p className="text-xs text-zinc-300 mb-6 font-medium">
              Create a challenge room and share your goofy 6-character room code!
            </p>

            {!createdRoomCode ? (
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-zinc-400 uppercase font-bold text-xs">CHALLENGE TYPE</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setChallengeMode("timed")}
                      className={cn(
                        "py-2.5 px-3 rounded-xl border-2 font-goofy text-base tracking-wider transition-all",
                        challengeMode === "timed"
                          ? "bg-accent-emerald text-black border-black shadow-goofy-black"
                          : "bg-[#161B22] border-black text-zinc-400"
                      )}
                    >
                      ⏱️ TIMED BATTLE
                    </button>
                    <button
                      type="button"
                      onClick={() => setChallengeMode("target")}
                      className={cn(
                        "py-2.5 px-3 rounded-xl border-2 font-goofy text-base tracking-wider transition-all",
                        challengeMode === "target"
                          ? "bg-accent-emerald text-black border-black shadow-goofy-black"
                          : "bg-[#161B22] border-black text-zinc-400"
                      )}
                    >
                      🎯 TARGET REPS
                    </button>
                  </div>
                </div>

                {challengeMode === "timed" ? (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-zinc-400 uppercase font-bold text-xs">DURATION</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[30, 60, 120].map((sec) => (
                        <button
                          key={sec}
                          type="button"
                          onClick={() => setCreateDuration(sec)}
                          className={cn(
                            "py-2.5 rounded-xl border-2 font-goofy text-base tracking-wider transition-all",
                            createDuration === sec
                              ? "bg-accent-emerald text-black border-black shadow-goofy-black"
                              : "bg-[#161B22] border-black text-zinc-400"
                          )}
                        >
                          {sec} SEC
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-zinc-400 uppercase font-bold text-xs">TARGET REPETITIONS</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[15, 25, 50].map((reps) => (
                        <button
                          key={reps}
                          type="button"
                          onClick={() => setTargetReps(reps)}
                          className={cn(
                            "py-2.5 rounded-xl border-2 font-goofy text-base tracking-wider transition-all",
                            targetReps === reps
                              ? "bg-accent-emerald text-black border-black shadow-goofy-black"
                              : "bg-[#161B22] border-black text-zinc-400"
                          )}
                        >
                          {reps} REPS
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="flex-1 py-3 rounded-xl bg-[#161B22] border-2 border-black text-zinc-400 hover:text-white font-goofy text-base tracking-wider"
                  >
                    CANCEL
                  </button>
                  <button
                    type="button"
                    disabled={isCreatingRoom}
                    onClick={handleCreateRoom}
                    className="flex-1 py-3 rounded-xl bg-accent-emerald text-black hover:bg-emerald-300 border-2 border-black font-goofy text-base tracking-wider shadow-goofy-black active:translate-x-1 active:translate-y-1"
                  >
                    {isCreatingRoom ? "CREATING..." : "GENERATE ROOM 🚀"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4 text-center">
                <span className="text-xs text-zinc-300 font-bold uppercase tracking-wider">
                  SEND THIS CODE TO YOUR FRIEND:
                </span>
                <div className="p-4 rounded-xl bg-[#08090C] border-3 border-black text-4xl font-goofy text-accent-emerald tracking-widest shadow-goofy-black">
                  {createdRoomCode}
                </div>

                <div className="grid grid-cols-2 gap-2 mt-2 font-goofy text-base tracking-wider">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/rooms/${createdRoomCode}`);
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 2000);
                    }}
                    className="py-3 px-3 rounded-xl bg-[#161B22] border-2 border-black text-zinc-200 hover:text-white flex items-center justify-center gap-1.5 shadow-goofy-black"
                  >
                    {copiedLink ? <Check className="w-4 h-4 text-accent-emerald" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedLink ? "COPIED!" : "COPY LINK"}</span>
                  </button>

                  <a
                    href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                      `Challenge me in PushUp Arena! Enter code ${createdRoomCode} at ${typeof window !== "undefined" ? window.location.origin : ""}/rooms/${createdRoomCode}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-3 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white border-2 border-black flex items-center justify-center gap-1.5 shadow-goofy-black"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>WHATSAPP</span>
                  </a>
                </div>

                <button
                  type="button"
                  onClick={() => router.push(`/arena/room/${createdRoomCode}`)}
                  className="mt-2 w-full py-3.5 rounded-xl bg-accent-emerald text-black hover:bg-emerald-300 border-2 border-black font-goofy text-lg tracking-wider shadow-goofy-black active:translate-x-1 active:translate-y-1"
                >
                  ENTER ROOM AS HOST 🥊
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
