"use client";

/**
 * PushUp Arena - 1v1 Competitive Private Room Route
 * Path: src/app/arena/room/[code]/page.tsx
 *
 * Full integration node orchestrating:
 * - Webcam ingestion & hardware lifecycle
 * - MediaPipe AI Pose Landmarker inference loop
 * - Deterministic repetition FSM & biomechanical verification
 * - WebRTC P2P mesh & Supabase Realtime synchronization
 * - Synchronized match countdown & authoritative clock
 * - Anti-cheat timing guards and match finalization RPC
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Copy,
  Flame,
  LogOut,
  Mic,
  MicOff,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Swords,
  Trophy,
  Users,
  Video,
  VideoOff,
  Wifi,
  Zap,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { MatchSession, PrivateRoom, Profile } from "@/types/database";
import {
  FormViolation,
  PoseFrameAnalysis,
  PushUpPhase,
  RepTelemetry,
} from "@/types/exercise";

import { detectPoseFrame, initPoseDetector } from "@/features/exercises/pushups/poseDetector";
import { PushUpRepCounter } from "@/features/exercises/pushups/repCounter";
import { useMatchSync } from "@/hooks/useMatchSync";

import { CameraFeed } from "@/components/arena/CameraFeed";
import { RepCounterHUD } from "@/components/arena/RepCounterHUD";
import { MatchTimer } from "@/components/arena/MatchTimer";
import { WebRTCVideoPanel } from "@/components/arena/WebRTCVideoPanel";

interface PageProps {
  params: {
    code: string;
  };
}

type MatchPhase = "LOBBY" | "COUNTDOWN" | "IN_PROGRESS" | "FINISHED";

export default function ArenaRoomPage({ params }: PageProps) {
  const roomCode = params.code?.toUpperCase();
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();

  // ---------------------------------------------------------------------------
  // Room & Authentication State
  // ---------------------------------------------------------------------------
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [localUsername, setLocalUsername] = useState<string>("Competitor (You)");
  const [remoteUsername, setRemoteUsername] = useState<string>("Opponent");
  const [roomData, setRoomData] = useState<PrivateRoom | null>(null);
  const [matchData, setMatchData] = useState<MatchSession | null>(null);
  const [isHost, setIsHost] = useState<boolean>(false);
  const [isLoadingRoom, setIsLoadingRoom] = useState<boolean>(true);
  const [roomError, setRoomError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // ---------------------------------------------------------------------------
  // Hardware & Media State
  // ---------------------------------------------------------------------------
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isCameraOn, setIsCameraOn] = useState<boolean>(true);
  const [isMicOn, setIsMicOn] = useState<boolean>(false);
  const [hasConsentedVideo, setHasConsentedVideo] = useState<boolean>(false);
  const [cameraPermissionError, setCameraPermissionError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Match & Competition State
  // ---------------------------------------------------------------------------
  const [isReady, setIsReady] = useState<boolean>(false);
  const [matchPhase, setMatchPhase] = useState<MatchPhase>("LOBBY");
  const [countdownSeconds, setCountdownSeconds] = useState<number>(3);
  const [serverEndTime, setServerEndTime] = useState<string | null>(null);
  const [localRepCount, setLocalRepCount] = useState<number>(0);
  const [localTelemetry, setLocalTelemetry] = useState<RepTelemetry[]>([]);
  const [matchResult, setMatchResult] = useState<{
    winner_id?: string | null;
    is_draw?: boolean;
    status: string;
  } | null>(null);

  // ---------------------------------------------------------------------------
  // AI Kinematic Vision State
  // ---------------------------------------------------------------------------
  const [frameAnalysis, setFrameAnalysis] = useState<PoseFrameAnalysis | null>(null);
  const [isModelLoaded, setIsModelLoaded] = useState<boolean>(false);

  // ---------------------------------------------------------------------------
  // Refs
  // ---------------------------------------------------------------------------
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const repCounterRef = useRef<PushUpRepCounter>(new PushUpRepCounter());
  const animationFrameIdRef = useRef<number | null>(null);
  const matchPhaseRef = useRef<MatchPhase>("LOBBY");
  matchPhaseRef.current = matchPhase;

  // ---------------------------------------------------------------------------
  // 1. Initial Room Fetch & Authentication Setup
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let isMounted = true;

    async function initRoom() {
      try {
        setIsLoadingRoom(true);

        // A. Authenticate User
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          // Generate a persistent guest session if anonymous auth isn't configured
          const guestId = `guest_${Math.random().toString(36).substring(2, 9)}`;
          setCurrentUserId(guestId);
          setLocalUsername(`Athlete_${guestId.substring(6, 10)}`);
        } else {
          setCurrentUserId(user.id);
          const { data: profile } = await supabase
            .from("profiles")
            .select("username, display_name")
            .eq("id", user.id)
            .single();

          if (profile) {
            setLocalUsername(profile.display_name || profile.username);
          }
        }

        // B. Fetch Private Room Record
        const { data: room, error: roomFetchError } = await supabase
          .from("private_rooms")
          .select("*")
          .eq("code", roomCode)
          .eq("is_active", true)
          .single();

        if (roomFetchError || !room) {
          if (isMounted) {
            setRoomError("Room not found or session has expired.");
            setIsLoadingRoom(false);
          }
          return;
        }

        if (isMounted) {
          setRoomData(room);
          setIsHost(user ? room.host_id === user.id : false);
        }

        // C. Fetch Associated Match Record
        const { data: match } = await supabase
          .from("matches")
          .select("*")
          .eq("id", room.match_id)
          .single();

        if (match && isMounted) {
          setMatchData(match);
          if (match.server_end_time) {
            setServerEndTime(match.server_end_time);
          }
        }

        // D. Register participant in public.match_participants if authenticated
        if (user) {
          await supabase.from("match_participants").upsert(
            {
              match_id: room.match_id,
              user_id: user.id,
              is_ready: false,
              has_consented_video: false,
              final_score: 0,
            },
            { onConflict: "match_id,user_id" }
          );
        }
      } catch (err) {
        console.error("[ArenaRoom] Initialization exception:", err);
        if (isMounted) setRoomError("Failed to initialize match arena.");
      } finally {
        if (isMounted) setIsLoadingRoom(false);
      }
    }

    if (roomCode) {
      initRoom();
    }

    return () => {
      isMounted = false;
    };
  }, [roomCode, supabase]);

  // ---------------------------------------------------------------------------
  // 2. Hardware Stream Initialization (Webcam & Microphone)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let streamInstance: MediaStream | null = null;

    async function setupMedia() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            frameRate: { ideal: 30, max: 30 },
          },
          audio: true,
        });

        streamInstance = stream;

        // Default audio track to muted until unmuted by user
        stream.getAudioTracks().forEach((track) => {
          track.enabled = false;
        });

        setLocalStream(stream);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.warn("[ArenaRoom] Camera/Mic permission denied or unavailable:", err);
        setCameraPermissionError(
          "Camera access denied. Enable webcam permissions to participate in real-time tracking."
        );
      }
    }

    setupMedia();

    return () => {
      if (streamInstance) {
        streamInstance.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // ---------------------------------------------------------------------------
  // 3. MediaPipe Pose Landmarker Initialization
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let isCancelled = false;

    async function loadModel() {
      try {
        await initPoseDetector();
        if (!isCancelled) {
          setIsModelLoaded(true);
        }
      } catch (err) {
        console.error("[ArenaRoom] MediaPipe model initialization failed:", err);
      }
    }

    loadModel();

    return () => {
      isCancelled = true;
    };
  }, []);

  // ---------------------------------------------------------------------------
  // 4. Realtime Match Synchronization & WebRTC Signaling Hook
  // ---------------------------------------------------------------------------
  const handleRemoteStream = useCallback((stream: MediaStream) => {
    setRemoteStream(stream);
  }, []);

  const handleMatchCompleted = useCallback(async () => {
    if (matchPhaseRef.current === "FINISHED") return;
    setMatchPhase("FINISHED");

    // Finalize match via stored procedure
    if (roomData?.match_id) {
      try {
        const { data: result } = await supabase.rpc("finalize_match", {
          p_match_id: roomData.match_id,
        });
        if (result) {
          setMatchResult(result);
        }
      } catch (err) {
        console.error("[ArenaRoom] Error finalizing match:", err);
      }
    }
  }, [roomData?.match_id, supabase]);

  const {
    opponentScore,
    opponentReady,
    opponentVideoConsent,
    peerConnectionState,
    isChannelConnected,
    sendRepScore,
    setReady: syncSetReady,
  } = useMatchSync({
    matchId: roomData?.match_id || "",
    userId: currentUserId,
    localStream,
    serverEndTime,
    onRemoteStream: handleRemoteStream,
    onMatchCompleted: handleMatchCompleted,
  });

  // ---------------------------------------------------------------------------
  // 5. Pre-Match Countdown Coordinator
  // ---------------------------------------------------------------------------
  useEffect(() => {
    // When both competitors are ready and we are in LOBBY phase, initiate countdown
    if (isReady && opponentReady && matchPhase === "LOBBY") {
      setMatchPhase("COUNTDOWN");
      setCountdownSeconds(3);

      const interval = setInterval(() => {
        setCountdownSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setMatchPhase("IN_PROGRESS");
            // Set local authoritative server end time estimation if not received
            const duration = roomData?.duration_seconds || 60;
            const projectedEnd = new Date(Date.now() + duration * 1000).toISOString();
            setServerEndTime(projectedEnd);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [isReady, opponentReady, matchPhase, roomData?.duration_seconds]);

  // ---------------------------------------------------------------------------
  // 6. Computer Vision Frame Processing Hot Loop (requestAnimationFrame)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!isModelLoaded) return;

    let isActive = true;

    const processFrameLoop = () => {
      if (!isActive) return;

      const video = videoRef.current;
      if (video && video.readyState >= 2 && video.videoWidth > 0) {
        const timestamp = performance.now();
        const landmarks = detectPoseFrame(video, timestamp);

        if (landmarks) {
          const { analysis, newRep } = repCounterRef.current.processFrame(
            landmarks,
            timestamp
          );

          setFrameAnalysis(analysis);

          // Ingest validated repetition completed during competitive phase
          if (newRep && matchPhaseRef.current === "IN_PROGRESS") {
            setLocalRepCount((prev) => {
              const nextCount = prev + 1;
              setLocalTelemetry((history) => [...history, newRep]);
              sendRepScore(nextCount, newRep);
              return nextCount;
            });
          }
        }
      }

      animationFrameIdRef.current = requestAnimationFrame(processFrameLoop);
    };

    animationFrameIdRef.current = requestAnimationFrame(processFrameLoop);

    return () => {
      isActive = false;
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [isModelLoaded, sendRepScore]);

  // ---------------------------------------------------------------------------
  // Media Toggles
  // ---------------------------------------------------------------------------
  const toggleCamera = useCallback(() => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOn(videoTrack.enabled);
      }
    }
  }, [localStream]);

  const toggleMic = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicOn(audioTrack.enabled);
      }
    }
  }, [localStream]);

  const handleReadyToggle = useCallback(() => {
    const nextReady = !isReady;
    setIsReady(nextReady);
    syncSetReady(nextReady, hasConsentedVideo);
  }, [isReady, hasConsentedVideo, syncSetReady]);

  const handleVideoConsentToggle = useCallback(() => {
    const nextConsent = !hasConsentedVideo;
    setHasConsentedVideo(nextConsent);
    if (isReady) {
      syncSetReady(isReady, nextConsent);
    }
  }, [hasConsentedVideo, isReady, syncSetReady]);

  const copyRoomCode = useCallback(() => {
    if (roomCode) {
      navigator.clipboard.writeText(roomCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  }, [roomCode]);

  const handleResetMatch = useCallback(() => {
    repCounterRef.current.reset();
    setLocalRepCount(0);
    setLocalTelemetry([]);
    setIsReady(false);
    setMatchPhase("LOBBY");
    setMatchResult(null);
    syncSetReady(false, hasConsentedVideo);
  }, [hasConsentedVideo, syncSetReady]);

  // Depth meter calculation (from 160° down to 90°)
  const primaryAngle = frameAnalysis?.primaryElbowAngle ?? 160;
  const depthPercent = Math.min(
    100,
    Math.max(0, ((160 - primaryAngle) / (160 - 90)) * 100)
  );

  // ---------------------------------------------------------------------------
  // Render: Loading & Error States
  // ---------------------------------------------------------------------------
  if (isLoadingRoom) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-canvas text-white p-4">
        <div className="flex items-center gap-3 px-6 py-4 rounded-md bg-card border border-border">
          <RefreshCw className="w-5 h-5 text-accent-cyan animate-spin" />
          <span className="font-mono text-sm tracking-widest uppercase">
            CALIBRATING ARENA ENVIRONMENT...
          </span>
        </div>
      </div>
    );
  }

  if (roomError || !roomData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-canvas text-white p-4">
        <div className="flex flex-col items-center gap-4 max-w-md w-full p-6 rounded-md bg-card border border-accent-crimson/50 shadow-hud-crimson text-center">
          <ShieldAlert className="w-12 h-12 text-accent-crimson" />
          <h2 className="font-mono text-xl font-bold uppercase tracking-wider text-white">
            ROOM CONNECTION REJECTED
          </h2>
          <p className="font-mono text-xs text-zinc-400">
            {roomError || "This competitive private room is invalid, expired, or deactivated."}
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-2 px-5 py-2.5 mt-2 rounded bg-card-elevated hover:bg-zinc-800 border border-border text-xs font-mono font-bold tracking-wider uppercase transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            RETURN TO COMMAND DASHBOARD
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-canvas text-white selection:bg-accent-cyan/30">
      {/* --------------------------------------------------------------------- */}
      {/* Arena Navigation & Header Telemetry Bar */}
      {/* --------------------------------------------------------------------- */}
      <header className="flex items-center justify-between px-4 py-3 bg-canvas-subtle border-b border-border z-30 select-none">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard")}
            className="p-1.5 rounded hover:bg-card-elevated border border-transparent hover:border-border text-zinc-400 hover:text-white transition-colors"
            title="Leave Room"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xl">🦾</span>
            <span className="font-goofy text-xl tracking-wider text-white">
              PUSHUP ARENA
            </span>
          </div>

          {/* Room Code Badge with Copy Action */}
          <button
            onClick={copyRoomCode}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-card border border-border hover:border-accent-cyan/60 text-xs font-mono font-bold text-zinc-300 transition-colors"
            title="Click to Copy Room Code"
          >
            <span className="text-zinc-500">ROOM:</span>
            <span className="text-accent-cyan tracking-widest">{roomCode}</span>
            {copiedCode ? (
              <Check className="w-3.5 h-3.5 text-accent-emerald ml-1" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-zinc-500 hover:text-white ml-1" />
            )}
          </button>
        </div>

        {/* Channel & WebRTC Connection Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-card border border-border text-xs font-mono">
            <span
              className={cn(
                "w-2 h-2 rounded-full",
                isChannelConnected ? "bg-accent-emerald" : "bg-accent-crimson animate-pulse"
              )}
            />
            <span className="text-zinc-400 uppercase text-[11px]">
              {isChannelConnected ? "SYNC ACTIVE" : "CONNECTING RELAY"}
            </span>
          </div>

          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-1.5 px-3 py-1 rounded bg-accent-crimson/15 hover:bg-accent-crimson/25 border border-accent-crimson/40 text-accent-crimson text-xs font-mono font-bold uppercase transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>EXIT</span>
          </button>
        </div>
      </header>

      {/* --------------------------------------------------------------------- */}
      {/* Main Arena Dynamic Workspace */}
      {/* --------------------------------------------------------------------- */}
      <main className="flex-1 flex flex-col p-4 md:p-6 max-w-7xl w-full mx-auto gap-4">
        {/* Fullscreen 3-2-1 Countdown Overlay */}
        {matchPhase === "COUNTDOWN" && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-canvas-dark/90 backdrop-blur-md">
            <span className="text-xs font-mono tracking-widest uppercase text-accent-cyan mb-2">
              ENGAGING 1V1 COMPETITION
            </span>
            <div className="font-mono text-9xl font-black text-accent-cyan drop-shadow-hud-cyan animate-ping">
              {countdownSeconds > 0 ? countdownSeconds : "GO!"}
            </div>
          </div>
        )}

        {/* Permission Warning Banner if Camera Access is Blocked */}
        {cameraPermissionError && (
          <div className="flex items-center gap-3 p-3 rounded-md bg-accent-crimson/15 border border-accent-crimson text-accent-crimson text-xs font-mono">
            <ShieldAlert className="w-5 h-5 flex-shrink-0" />
            <span>{cameraPermissionError}</span>
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* VIEW A: LOBBY & CALIBRATION STAGE */}
        {/* ------------------------------------------------------------------- */}
        {matchPhase === "LOBBY" && (
          <div className="flex-1 flex flex-col gap-6 justify-center">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Local Player Calibration & Camera Feed */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
                  <span>CAMERA CALIBRATION & BIOMECHANICAL PREVIEW</span>
                  <span className="text-accent-cyan">{localUsername} (YOU)</span>
                </div>

                <CameraFeed
                  videoRef={videoRef}
                  landmarks={frameAnalysis?.landmarks ?? null}
                  primaryElbowAngle={frameAnalysis?.primaryElbowAngle ?? 180}
                  hipAlignmentAngle={frameAnalysis?.hipAlignmentAngle ?? 180}
                  phase={frameAnalysis?.phase ?? "CALIBRATING"}
                />

                <div className="flex items-center justify-between px-3 py-2 rounded bg-card border border-border text-xs font-mono text-zinc-400">
                  <span>MODEL STATUS:</span>
                  <span className={isModelLoaded ? "text-accent-emerald" : "text-accent-gold"}>
                    {isModelLoaded ? "WASM NEURAL POSE ENGINE READY" : "LOADING WEIGHTS..."}
                  </span>
                </div>
              </div>

              {/* Opponent Lobby Readiness Card */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
                  <span>OPPONENT STATUS</span>
                  <span className="text-zinc-300">{remoteUsername}</span>
                </div>

                <div className="relative aspect-video rounded-md bg-card border border-border flex flex-col items-center justify-center p-6 text-center">
                  <div className="w-16 h-16 rounded-full bg-canvas-dark border border-border flex items-center justify-center mb-3">
                    <Users className="w-8 h-8 text-zinc-500" />
                  </div>

                  <span className="font-mono text-sm font-bold uppercase tracking-wider text-white mb-1">
                    {remoteUsername}
                  </span>

                  {/* Opponent Ready State Badge */}
                  <div className="flex items-center gap-2 mt-2">
                    <span
                      className={cn(
                        "w-2.5 h-2.5 rounded-full",
                        opponentReady ? "bg-accent-emerald" : "bg-accent-gold animate-pulse"
                      )}
                    />
                    <span
                      className={cn(
                        "font-mono text-xs font-bold uppercase tracking-wider",
                        opponentReady ? "text-accent-emerald" : "text-accent-gold"
                      )}
                    >
                      {opponentReady ? "READY FOR COMBAT" : "CALIBRATING IN LOBBY..."}
                    </span>
                  </div>

                  <span className="text-[11px] font-mono text-zinc-500 mt-3">
                    {opponentVideoConsent
                      ? "Opponent camera stream authorized."
                      : "Opponent camera privacy mode active."}
                  </span>
                </div>

                {/* Match Duration Indicator */}
                <div className="flex items-center justify-between px-3 py-2 rounded bg-card border border-border text-xs font-mono text-zinc-400">
                  <span>MATCH CLOCK:</span>
                  <span className="text-white font-bold">
                    {roomData.duration_seconds} SECONDS (1V1 SPRINT)
                  </span>
                </div>
              </div>
            </div>

            {/* Central Readiness Control Bar */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 rounded-md bg-card border border-border">
              {/* Consent Toggles */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleVideoConsentToggle}
                  className={cn(
                    "flex items-center gap-2 px-3.5 py-2 rounded border text-xs font-mono font-bold uppercase transition-all",
                    hasConsentedVideo
                      ? "bg-accent-cyan/15 border-accent-cyan text-accent-cyan shadow-hud-cyan"
                      : "bg-card-elevated border-border text-zinc-400 hover:text-white"
                  )}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>
                    {hasConsentedVideo ? "CAMERA BROADCAST ENABLED" : "ENABLE CAMERA CONSENT"}
                  </span>
                </button>
              </div>

              {/* Ready Up Button */}
              <button
                type="button"
                onClick={handleReadyToggle}
                className={cn(
                  "w-full md:w-auto px-8 py-3 rounded text-sm font-mono font-black uppercase tracking-widest transition-all",
                  isReady
                    ? "bg-accent-emerald text-black shadow-hud-emerald"
                    : "bg-accent-cyan text-black hover:bg-cyan-300 shadow-hud-cyan"
                )}
              >
                {isReady ? "LOCKED IN (READY)" : "READY UP"}
              </button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* VIEW B: ACTIVE COMPETITION ARENA */}
        {/* ------------------------------------------------------------------- */}
        {matchPhase === "IN_PROGRESS" && (
          <div className="flex-1 flex flex-col gap-4">
            {/* Top Match Authority Banner & Countdown Clock */}
            <div className="flex items-center justify-between p-3 rounded-md bg-card border border-border">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded bg-accent-cyan/15 border border-accent-cyan text-accent-cyan">
                  <Flame className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <span className="font-mono text-xs font-black tracking-wider text-white uppercase">
                    1V1 STANDARD PUSH-UP ENGAGEMENT
                  </span>
                  <span className="font-mono text-[10px] text-zinc-400">
                    REALTIME SYNCHRONIZED TELEMETRY
                  </span>
                </div>
              </div>

              {/* Authoritative Server Countdown Clock */}
              <MatchTimer
                serverStartTime={matchData?.server_start_time ?? null}
                serverEndTime={serverEndTime}
                durationSeconds={roomData.duration_seconds}
                onTimeExpired={handleMatchCompleted}
              />
            </div>

            {/* Split Screen Video Grid with HUD Overlays */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Local Competitor Camera Feed with HUD Rep Counter */}
              <div className="flex flex-col gap-3">
                <CameraFeed
                  videoRef={videoRef}
                  landmarks={frameAnalysis?.landmarks ?? null}
                  primaryElbowAngle={frameAnalysis?.primaryElbowAngle ?? 180}
                  hipAlignmentAngle={frameAnalysis?.hipAlignmentAngle ?? 180}
                  phase={frameAnalysis?.phase ?? "CALIBRATING"}
                />

                <RepCounterHUD
                  repCount={localRepCount}
                  phase={frameAnalysis?.phase ?? "CALIBRATING"}
                  primaryElbowAngle={primaryAngle}
                  hipAlignmentAngle={frameAnalysis?.hipAlignmentAngle ?? 180}
                  violations={frameAnalysis?.activeViolations ?? []}
                  depthProgress={depthPercent}
                />
              </div>

              {/* WebRTC P2P Video Panel */}
              <div className="flex flex-col gap-3">
                <WebRTCVideoPanel
                  localStream={localStream}
                  remoteStream={remoteStream}
                  localScore={localRepCount}
                  remoteScore={opponentScore}
                  localUsername={localUsername}
                  remoteUsername={remoteUsername}
                  connectionState={peerConnectionState}
                  hasRemoteVideoConsent={opponentVideoConsent}
                  onToggleCamera={toggleCamera}
                  onToggleMic={toggleMic}
                  isCameraOn={isCameraOn}
                  isMicOn={isMicOn}
                />

                {/* Opponent Monospace Scoreboard Card */}
                <div className="flex flex-col gap-2 p-4 rounded-md bg-card border border-border">
                  <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
                    <span className="uppercase tracking-wider">OPPONENT SCOREBOARD</span>
                    <span className="text-accent-crimson font-bold uppercase">{remoteUsername}</span>
                  </div>

                  <div className="flex items-baseline justify-between pt-1">
                    <span className="font-mono text-6xl md:text-8xl font-black text-accent-crimson">
                      {opponentScore.toString().padStart(2, "0")}
                    </span>
                    <span className="text-xs font-mono text-zinc-500 uppercase">
                      VERIFIED REPS
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* VIEW C: FINISHED STATE MODAL */}
        {/* ------------------------------------------------------------------- */}
        {matchPhase === "FINISHED" && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-canvas-dark/85 backdrop-blur-lg">
            <div className="flex flex-col items-center max-w-lg w-full p-6 md:p-8 rounded-lg bg-card-elevated border border-border shadow-2xl text-center select-none">
              <Trophy
                className={cn(
                  "w-16 h-16 mb-3",
                  localRepCount > opponentScore
                    ? "text-accent-emerald drop-shadow-hud-emerald"
                    : localRepCount < opponentScore
                    ? "text-accent-crimson drop-shadow-hud-crimson"
                    : "text-accent-gold drop-shadow-hud-gold"
                )}
              />

              <h2
                className={cn(
                  "font-mono text-3xl md:text-4xl font-black tracking-wider uppercase mb-1",
                  localRepCount > opponentScore
                    ? "text-accent-emerald"
                    : localRepCount < opponentScore
                    ? "text-accent-crimson"
                    : "text-accent-gold"
                )}
              >
                {localRepCount > opponentScore
                  ? "VICTORY"
                  : localRepCount < opponentScore
                  ? "DEFEAT"
                  : "DEAD HEAT (DRAW)"}
              </h2>

              <span className="text-xs font-mono uppercase tracking-widest text-zinc-400 mb-6">
                MATCH TIME CONCLUDED
              </span>

              {/* Final Score Comparison Box */}
              <div className="grid grid-cols-2 gap-4 w-full p-4 rounded bg-canvas-dark border border-border mb-6">
                <div className="flex flex-col items-center">
                  <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider">
                    {localUsername} (YOU)
                  </span>
                  <span className="font-mono text-5xl font-black text-accent-cyan mt-1">
                    {localRepCount}
                  </span>
                </div>

                <div className="flex flex-col items-center border-l border-border">
                  <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider">
                    {remoteUsername}
                  </span>
                  <span className="font-mono text-5xl font-black text-accent-crimson mt-1">
                    {opponentScore}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
                <button
                  type="button"
                  onClick={handleResetMatch}
                  className="flex-1 w-full py-3 rounded bg-accent-cyan text-black hover:bg-cyan-300 font-mono text-xs font-bold uppercase tracking-wider transition-all"
                >
                  REMATCH
                </button>

                <button
                  type="button"
                  onClick={() => router.push("/dashboard")}
                  className="flex-1 w-full py-3 rounded bg-card hover:bg-zinc-800 border border-border text-white font-mono text-xs font-bold uppercase tracking-wider transition-all"
                >
                  RETURN TO DASHBOARD
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

