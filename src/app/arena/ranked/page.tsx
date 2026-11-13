"use client";

/**
 * PushUp Arena - Ranked Competitive Matchmaking Lobby
 * Path: src/app/arena/ranked/page.tsx
 *
 * Skill-based matchmaking (SBMM) system:
 * - Dynamic expanding rating window search algorithm (±100 -> ±250 -> Global)
 * - Deterministic coordinator selection for atomic match creation
 * - Realtime broadcast signaling for match assignment
 * - Pre-flight camera diagnostic check & anti-cheat notices
 * - High-impact 2.5s Match Found transition with prospective Elo delta odds
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Flame,
  Radio,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Swords,
  Trophy,
  User,
  Users,
  Video,
  VideoOff,
  Wifi,
  Zap,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Profile, UserRating } from "@/types/database";
import {
  calculateProspectiveDeltas,
  CompetitiveTier,
  getTierFromRating,
} from "@/lib/elo";

type QueueState = "IDLE" | "SEARCHING" | "MATCH_FOUND" | "CONNECTING" | "FAILED";

interface MatchAssignment {
  matchId: string;
  roomCode: string;
  opponentId: string;
  opponentUsername: string;
  opponentRating: number;
  opponentTier: CompetitiveTier;
  winDelta: number;
  lossDelta: number;
  winProbability: number;
}

export default function RankedMatchmakingPage() {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();

  // Athlete Profile & Rating State
  const [profile, setProfile] = useState<Profile | null>(null);
  const [rating, setRating] = useState<UserRating | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(true);

  // Hardware Diagnostic State
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean>(false);
  const [cameraCheckRunning, setCameraCheckRunning] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Queue Lifecycle State
  const [queueState, setQueueState] = useState<QueueState>("IDLE");
  const [searchElapsedMs, setSearchElapsedMs] = useState<number>(0);
  const [searchRadius, setSearchRadius] = useState<number>(100);
  const [activeQueueCount, setActiveQueueCount] = useState<number>(1);
  const [assignedMatch, setAssignedMatch] = useState<MatchAssignment | null>(null);

  // Refs for timers and channel
  const searchStartTimeRef = useRef<number>(0);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const elapsedTimerRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<any>(null);
  const currentUserIdRef = useRef<string>("");

  // ---------------------------------------------------------------------------
  // 1. Initial Authentication & Hardware Verification
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let isMounted = true;

    async function initLobby() {
      try {
        setIsLoadingAuth(true);

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          // Fallback preview athlete if session not authenticated
          const demoUser: Profile = {
            id: "guest-ranked-user",
            username: "gladiator_alpha",
            display_name: "Gladiator Alpha",
            avatar_url: null,
            height_cm: 180,
            weight_kg: 78,
            fitness_level: "advanced",
            is_pro: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          const demoRating: UserRating = {
            user_id: "guest-ranked-user",
            exercise_id: "pushups",
            mu: 1540.0,
            tier: "Gold",
            matches_played: 24,
            wins: 17,
            losses: 7,
            draws: 0,
            best_rep_count: 58,
            updated_at: new Date().toISOString(),
          };

          if (isMounted) {
            setProfile(demoUser);
            setRating(demoRating);
            currentUserIdRef.current = demoUser.id;
          }
          return;
        }

        currentUserIdRef.current = user.id;

        // Fetch athlete profile
        const { data: prof } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (prof && isMounted) {
          setProfile(prof);
        }

        // Fetch pushup ratings
        const { data: rat } = await supabase
          .from("ratings")
          .select("*")
          .eq("user_id", user.id)
          .eq("exercise_id", "pushups")
          .single();

        if (rat && isMounted) {
          setRating(rat);
        }
      } catch (err) {
        console.error("[RankedLobby] Auth verification failed:", err);
      } finally {
        if (isMounted) setIsLoadingAuth(false);
      }
    }

    initLobby();

    return () => {
      isMounted = false;
    };
  }, [supabase]);

  // Pre-flight hardware camera check
  const verifyCameraHardware = useCallback(async (): Promise<boolean> => {
    setCameraCheckRunning(true);
    setCameraError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
      });

      // Release test stream tracks immediately
      stream.getTracks().forEach((t) => t.stop());
      setHasCameraPermission(true);
      setCameraCheckRunning(false);
      return true;
    } catch (err) {
      console.warn("[RankedLobby] Camera hardware diagnostic failed:", err);
      setHasCameraPermission(false);
      setCameraError("Camera access required for AI biomechanical validation in ranked play.");
      setCameraCheckRunning(false);
      return false;
    }
  }, []);

  // ---------------------------------------------------------------------------
  // 2. Matchmaking Algorithm & Realtime Pool Lifecycle
  // ---------------------------------------------------------------------------
  const generateRoomCode = (): string => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleMatchFound = useCallback(
    (match: MatchAssignment) => {
      setAssignedMatch(match);
      setQueueState("MATCH_FOUND");

      // Clear search polling
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);

      // Redirect after 2.5 seconds showcase
      setTimeout(() => {
        router.push(`/arena/room/${match.roomCode}?ranked=true`);
      }, 2500);
    },
    [router]
  );

  const cancelQueue = useCallback(async () => {
    const userId = currentUserIdRef.current;
    if (!userId) return;

    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);

    try {
      await supabase.from("matchmaking_queue").delete().eq("user_id", userId);
    } catch (err) {
      console.warn("[RankedLobby] Error removing user from queue:", err);
    }

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    setQueueState("IDLE");
    setSearchElapsedMs(0);
  }, [supabase]);

  // Clean up on tab close / unmount
  useEffect(() => {
    const handleUnload = () => {
      if (currentUserIdRef.current && queueState === "SEARCHING") {
        supabase
          .from("matchmaking_queue")
          .delete()
          .eq("user_id", currentUserIdRef.current);
      }
    };

    window.addEventListener("beforeunload", handleUnload);
    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      cancelQueue();
    };
  }, [cancelQueue, queueState, supabase]);

  const enterQueue = async () => {
    const userId = currentUserIdRef.current;
    if (!userId) {
      router.push("/login");
      return;
    }

    // 1. Verify Camera Access
    const cameraOk = await verifyCameraHardware();
    if (!cameraOk) {
      return;
    }

    setQueueState("SEARCHING");
    setSearchElapsedMs(0);
    searchStartTimeRef.current = Date.now();

    // 2. Start elapsed timer (updates every 100ms)
    elapsedTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - searchStartTimeRef.current;
      setSearchElapsedMs(elapsed);

      // Dynamic search radius expansion:
      if (elapsed < 15000) {
        setSearchRadius(100);
      } else if (elapsed < 30000) {
        setSearchRadius(250);
      } else {
        setSearchRadius(9999);
      }
    }, 100);

    // 3. Register athlete in public.matchmaking_queue
    const userRatingVal = rating?.mu || 1200;
    try {
      await supabase.from("matchmaking_queue").upsert({
        user_id: userId,
        exercise_id: "pushups",
        rating: userRatingVal,
        queued_at: new Date().toISOString(),
      });
    } catch (err) {
      console.error("[RankedLobby] Queue upsert error:", err);
    }

    // 4. Open Realtime Channel for direct match assignment notification
    const channel = supabase.channel(`matchmaking:${userId}`, {
      config: { broadcast: { ack: false, self: false } },
    });

    channel.on(
      "broadcast",
      { event: "match_assigned" },
      ({ payload }: { payload: MatchAssignment }) => {
        handleMatchFound(payload);
      }
    );

    channel.subscribe();
    channelRef.current = channel;

    // 5. Matchmaker worker loop (runs every 3000ms)
    pollIntervalRef.current = setInterval(async () => {
      try {
        // Query candidate pool
        const { data: candidates } = await supabase
          .from("matchmaking_queue")
          .select("user_id, rating, queued_at")
          .eq("exercise_id", "pushups")
          .neq("user_id", userId);

        if (candidates) {
          setActiveQueueCount(candidates.length + 1);

          // Find candidate within current search radius
          const elapsed = Date.now() - searchStartTimeRef.current;
          const currentRadius = elapsed < 15000 ? 100 : elapsed < 30000 ? 250 : 9999;

          const matchCandidate = candidates.find(
            (c) => Math.abs(c.rating - userRatingVal) <= currentRadius
          );

          if (matchCandidate) {
            // Coordinator selection: lowest alphabetical user_id creates the transaction
            const isCoordinator = userId < matchCandidate.user_id;

            if (isCoordinator) {
              // 1. Create ranked match
              const { data: match } = await supabase
                .from("matches")
                .insert({
                  exercise_id: "pushups",
                  match_type: "ranked_random",
                  status: "lobby",
                  duration_seconds: 60,
                })
                .select()
                .single();

              if (match) {
                const roomCode = generateRoomCode();

                // 2. Create room lookup record for seamless routing
                await supabase.from("private_rooms").insert({
                  code: roomCode,
                  match_id: match.id,
                  host_id: userId,
                  exercise_id: "pushups",
                  duration_seconds: 60,
                  is_active: true,
                  expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
                });

                // 3. Insert both match participants
                await supabase.from("match_participants").insert([
                  { match_id: match.id, user_id: userId, final_score: 0 },
                  { match_id: match.id, user_id: matchCandidate.user_id, final_score: 0 },
                ]);

                // 4. Remove both from queue
                await supabase
                  .from("matchmaking_queue")
                  .delete()
                  .in("user_id", [userId, matchCandidate.user_id]);

                // 5. Compute pre-match odds deltas
                const deltasForSelf = calculateProspectiveDeltas(
                  userRatingVal,
                  matchCandidate.rating,
                  rating?.matches_played || 0
                );

                const deltasForOpponent = calculateProspectiveDeltas(
                  matchCandidate.rating,
                  userRatingVal,
                  0
                );

                // Notify opponent via their channel
                const opponentChannel = supabase.channel(
                  `matchmaking:${matchCandidate.user_id}`
                );
                await opponentChannel.send({
                  type: "broadcast",
                  event: "match_assigned",
                  payload: {
                    matchId: match.id,
                    roomCode,
                    opponentId: userId,
                    opponentUsername: profile?.display_name || profile?.username || "Challenger",
                    opponentRating: userRatingVal,
                    opponentTier: getTierFromRating(userRatingVal),
                    winDelta: deltasForOpponent.winDelta,
                    lossDelta: deltasForOpponent.lossDelta,
                    winProbability: deltasForOpponent.winProbability,
                  } as MatchAssignment,
                });

                // Trigger self match assignment
                handleMatchFound({
                  matchId: match.id,
                  roomCode,
                  opponentId: matchCandidate.user_id,
                  opponentUsername: `Athlete_${matchCandidate.user_id.substring(0, 5)}`,
                  opponentRating: matchCandidate.rating,
                  opponentTier: getTierFromRating(matchCandidate.rating),
                  winDelta: deltasForSelf.winDelta,
                  lossDelta: deltasForSelf.lossDelta,
                  winProbability: deltasForSelf.winProbability,
                });
              }
            }
          }
        }
      } catch (err) {
        console.error("[RankedLobby] Matching loop error:", err);
      }
    }, 3000);
  };

  // Format elapsed search time: MM:SS.s
  const totalSeconds = Math.floor(searchElapsedMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const tenths = Math.floor((searchElapsedMs % 1000) / 100);
  const formattedSearchTime = `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}.${tenths}`;

  const currentTier = rating ? getTierFromRating(rating.mu) : "Bronze";

  return (
    <div className="flex flex-col min-h-screen bg-canvas text-white selection:bg-accent-cyan/30">
      {/* --------------------------------------------------------------------- */}
      {/* Top Header Navigation */}
      {/* --------------------------------------------------------------------- */}
      <header className="flex items-center justify-between px-6 py-4 bg-canvas-subtle border-b border-border select-none">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              cancelQueue();
              router.push("/dashboard");
            }}
            className="p-1.5 rounded hover:bg-card-elevated border border-transparent hover:border-border text-zinc-400 hover:text-white transition-colors"
            title="Return to Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-accent-emerald shadow-hud-emerald" />
            <span className="font-mono font-black text-sm uppercase tracking-wider text-white">
              RANKED COMPETITIVE LOBBY
            </span>
          </div>
        </div>

        {/* Division Badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-card border border-border">
            <ShieldCheck className="w-4 h-4 text-accent-gold" />
            <span className="font-mono text-xs font-bold uppercase text-zinc-300">
              {currentTier}
            </span>
            <span className="font-mono text-xs font-black text-accent-cyan ml-1">
              {rating ? Math.round(rating.mu) : 1200} ELO
            </span>
          </div>
        </div>
      </header>

      {/* --------------------------------------------------------------------- */}
      {/* Main Ranked Workspace Grid */}
      {/* --------------------------------------------------------------------- */}
      <main className="flex-1 flex flex-col lg:flex-row p-6 max-w-7xl w-full mx-auto gap-6 select-none">
        {/* Left Column: Matchmaking Radar & Queue Trigger */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 rounded-md bg-card border border-border shadow-2xl relative overflow-hidden">
          {/* Hardware Diagnostic Banner if Camera Blocked */}
          {cameraError && (
            <div className="absolute top-4 inset-x-4 flex items-center gap-2 p-3 rounded bg-accent-crimson/15 border border-accent-crimson text-accent-crimson text-xs font-mono">
              <ShieldAlert className="w-4 h-4 flex-shrink-0" />
              <span>{cameraError}</span>
            </div>
          )}

          {/* Radar Graphics & Search Visualizer */}
          <div className="relative flex items-center justify-center w-64 h-64 my-6">
            {/* Expanding Pulsing Search Rings */}
            {queueState === "SEARCHING" && (
              <>
                <div className="absolute inset-0 rounded-full border border-accent-emerald/20 animate-ping" />
                <div className="absolute inset-6 rounded-full border border-accent-emerald/40 animate-pulse" />
                <div className="absolute inset-16 rounded-full border border-accent-cyan/60 animate-spin" />
              </>
            )}

            {/* Central HUD Dial */}
            <div
              className={cn(
                "relative flex flex-col items-center justify-center w-48 h-48 rounded-full border-2 bg-canvas-dark transition-all duration-300",
                queueState === "SEARCHING"
                  ? "border-accent-emerald shadow-hud-emerald"
                  : queueState === "MATCH_FOUND"
                  ? "border-accent-cyan shadow-hud-cyan scale-105"
                  : "border-border"
              )}
            >
              {queueState === "SEARCHING" ? (
                <>
                  <Radio className="w-8 h-8 text-accent-emerald animate-pulse mb-2" />
                  <span className="font-mono text-2xl font-black text-white">
                    {formattedSearchTime}
                  </span>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-accent-emerald mt-1">
                    RADAR ACTIVE
                  </span>
                </>
              ) : queueState === "MATCH_FOUND" ? (
                <>
                  <Swords className="w-10 h-10 text-accent-cyan mb-2 animate-bounce" />
                  <span className="font-mono text-sm font-black uppercase text-accent-cyan tracking-widest">
                    DUEL LOCKED
                  </span>
                </>
              ) : (
                <>
                  <Swords className="w-10 h-10 text-zinc-500 mb-2" />
                  <span className="font-mono text-xs font-black uppercase tracking-wider text-zinc-400">
                    QUEUE IDLE
                  </span>
                  <span className="text-[9px] font-mono text-zinc-600 mt-1">
                    READY FOR COMBAT
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Search Radius & Queue Telemetry Chips */}
          <div className="flex items-center gap-4 text-xs font-mono text-zinc-400 mb-8">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-canvas-dark border border-border">
              <Activity className="w-3.5 h-3.5 text-accent-cyan" />
              <span>
                SEARCH RADIUS:{" "}
                <strong className="text-white">
                  {searchRadius > 500 ? "GLOBAL" : `±${searchRadius} PTS`}
                </strong>
              </span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-canvas-dark border border-border">
              <Users className="w-3.5 h-3.5 text-accent-emerald" />
              <span>
                QUEUE POOL: <strong className="text-white">{activeQueueCount}</strong>
              </span>
            </div>
          </div>

          {/* Primary CTA: Enter or Cancel Queue */}
          {queueState === "IDLE" ? (
            <button
              type="button"
              onClick={enterQueue}
              disabled={cameraCheckRunning}
              className="w-full max-w-sm py-4 rounded bg-accent-emerald text-black hover:bg-emerald-300 font-mono text-sm font-black uppercase tracking-widest transition-all shadow-hud-emerald flex items-center justify-center gap-2"
            >
              {cameraCheckRunning ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Zap className="w-4 h-4 fill-current" />
                  <span>ENTER RANKED QUEUE</span>
                </>
              )}
            </button>
          ) : queueState === "SEARCHING" ? (
            <button
              type="button"
              onClick={cancelQueue}
              className="w-full max-w-sm py-3.5 rounded bg-card-elevated hover:bg-accent-crimson/20 border border-accent-crimson text-accent-crimson font-mono text-xs font-black uppercase tracking-wider transition-all shadow-hud-crimson"
            >
              CANCEL MATCHMAKING
            </button>
          ) : null}
        </div>

        {/* Right Column: Ranked Rules, Fair Play & Demotion Shield */}
        <div className="w-full lg:w-96 flex flex-col gap-4">
          {/* Rules & Fair Play Panel */}
          <div className="flex flex-col p-5 rounded-md bg-card border border-border shadow-xl">
            <div className="flex items-center gap-2 pb-3 border-b border-border mb-3">
              <ShieldCheck className="w-4 h-4 text-accent-cyan" />
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-white">
                RANKED PROTOCOL & FAIR PLAY
              </h3>
            </div>

            <ul className="flex flex-col gap-2.5 font-mono text-[11px] text-zinc-400">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-cyan mt-1 flex-shrink-0" />
                <span>
                  <strong>Strict 90° Depth Trigger:</strong> Incomplete elbow flexion will trigger depth fouls and suppress score increments.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-cyan mt-1 flex-shrink-0" />
                <span>
                  <strong>Plank Alignment:</strong> Body lines sagging below 150° or piking above 195° invalidate reps during cycle descent.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-crimson mt-1 flex-shrink-0" />
                <span>
                  <strong>Disconnect Penalties:</strong> Abandoning an active competition incurs an automatic forfeit and a -25 rating penalty.
                </span>
              </li>
            </ul>
          </div>

          {/* Division Advance Track */}
          <div className="flex flex-col p-5 rounded-md bg-card border border-border shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-border mb-3">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-white">
                DIVISION PROGRESSION
              </span>
              <Trophy className="w-4 h-4 text-accent-gold" />
            </div>

            <div className="flex items-center justify-between text-xs font-mono my-2">
              <span className="text-zinc-400">CURRENT TIER</span>
              <span className="font-bold text-accent-cyan uppercase">{currentTier}</span>
            </div>

            <div className="w-full h-2 rounded bg-canvas-dark border border-border overflow-hidden mb-3">
              <div
                className="h-full bg-accent-emerald shadow-hud-emerald"
                style={{ width: "68%" }}
              />
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500">
              <span>DEMOTION SHIELD: ACTIVE</span>
              <span>172 PTS TO PROMOTION</span>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------------- */}
        {/* Match Found Transition Dialog (2.5 Second Showcase) */}
        {/* ------------------------------------------------------------------- */}
        {queueState === "MATCH_FOUND" && assignedMatch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-canvas-dark/90 backdrop-blur-lg">
            <div className="flex flex-col items-center max-w-md w-full p-6 md:p-8 rounded-lg bg-card-elevated border-2 border-accent-cyan shadow-2xl text-center animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-center w-14 h-14 rounded-full bg-accent-cyan/15 border-2 border-accent-cyan text-accent-cyan mb-3 shadow-hud-cyan">
                <Swords className="w-7 h-7" />
              </div>

              <span className="text-xs font-mono font-black uppercase tracking-widest text-accent-emerald mb-1 animate-pulse">
                OPPONENT SECURED
              </span>

              <h2 className="font-mono text-3xl font-black text-white uppercase mb-4">
                {assignedMatch.opponentUsername}
              </h2>

              {/* Opponent Rating & Division Badge */}
              <div className="flex items-center gap-3 px-4 py-2 rounded bg-canvas-dark border border-border mb-6">
                <ShieldCheck className="w-4 h-4 text-accent-gold" />
                <span className="font-mono text-xs font-bold uppercase text-zinc-300">
                  {assignedMatch.opponentTier}
                </span>
                <span className="font-mono text-xs font-black text-accent-cyan">
                  {Math.round(assignedMatch.opponentRating)} ELO
                </span>
              </div>

              {/* Prospective Rating Deltas & Odds Preview */}
              <div className="grid grid-cols-2 gap-3 w-full p-4 rounded bg-canvas-dark border border-border mb-6 font-mono text-xs">
                <div className="flex flex-col items-center">
                  <span className="text-[10px] text-zinc-500 uppercase">WIN PROBABILITY</span>
                  <span className="text-xl font-black text-white mt-0.5">
                    {assignedMatch.winProbability}%
                  </span>
                </div>

                <div className="flex flex-col items-center border-l border-border">
                  <span className="text-[10px] text-zinc-500 uppercase">RATING AT STAKE</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-accent-emerald font-black">
                      +{assignedMatch.winDelta}
                    </span>
                    <span className="text-zinc-600">/</span>
                    <span className="text-accent-crimson font-black">
                      {assignedMatch.lossDelta}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono text-accent-cyan animate-pulse">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>ROUTING COMPETITORS TO ARENA...</span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
