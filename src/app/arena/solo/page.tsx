"use client";

/**
 * PushUp Arena - Solo Practice & Biomechanical Calibration Lab
 * Path: src/app/arena/solo/page.tsx
 *
 * Dedicated environment for:
 * - Real-time camera framing & 3D BlazePose topology calibration
 * - Zero-risk practice repetitions with live 90° depth and plank angle feedback
 * - Configurable solo timed sets (30s, 60s, 120s) and freeform practice
 * - Personal record synchronization to public.ratings
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Compass,
  Play,
  RefreshCw,
  RotateCcw,
  Save,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  StopCircle,
  Trophy,
  Video,
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  FormViolation,
  PoseFrameAnalysis,
  PushUpPhase,
  RepTelemetry,
} from "@/types/exercise";

import { detectPoseFrame, initPoseDetector } from "@/features/exercises/pushups/poseDetector";
import { PushUpRepCounter } from "@/features/exercises/pushups/repCounter";

import { CameraFeed } from "@/components/arena/CameraFeed";
import { RepCounterHUD } from "@/components/arena/RepCounterHUD";

type PracticeMode = "FREEFORM" | "TIMED";

export default function SoloArenaPage() {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();

  // ---------------------------------------------------------------------------
  // Hardware & Vision Pipeline
  // ---------------------------------------------------------------------------
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isCameraReady, setIsCameraReady] = useState<boolean>(false);
  const [isModelReady, setIsModelReady] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [frameAnalysis, setFrameAnalysis] = useState<PoseFrameAnalysis | null>(null);

  // ---------------------------------------------------------------------------
  // Practice & Session State
  // ---------------------------------------------------------------------------
  const [mode, setMode] = useState<PracticeMode>("FREEFORM");
  const [timedDuration, setTimedDuration] = useState<number>(60);
  const [isSessionActive, setIsSessionActive] = useState<boolean>(false);
  const [remainingTime, setRemainingTime] = useState<number>(60);
  const [isCountingDown, setIsCountingDown] = useState<boolean>(false);
  const [countdownSec, setCountdownSec] = useState<number>(3);
  const [repCount, setRepCount] = useState<number>(0);
  const [telemetryHistory, setTelemetryHistory] = useState<RepTelemetry[]>([]);
  const [isFinishedModalOpen, setIsFinishedModalOpen] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // ---------------------------------------------------------------------------
  // Diagnostics Drawer State
  // ---------------------------------------------------------------------------
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState<boolean>(true);

  // ---------------------------------------------------------------------------
  // Refs
  // ---------------------------------------------------------------------------
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const repCounterRef = useRef<PushUpRepCounter>(new PushUpRepCounter());
  const animationFrameRef = useRef<number | null>(null);
  const isSessionActiveRef = useRef<boolean>(false);
  isSessionActiveRef.current = isSessionActive;

  // ---------------------------------------------------------------------------
  // 1. Hardware Stream Ingestion
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let streamInstance: MediaStream | null = null;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            frameRate: { ideal: 30, max: 30 },
          },
          audio: false,
        });

        streamInstance = stream;
        setLocalStream(stream);
        setIsCameraReady(true);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.warn("[SoloArena] Camera access error:", err);
        setCameraError("Camera unavailable or permission denied. Please enable camera access.");
      }
    }

    startCamera();

    return () => {
      if (streamInstance) {
        streamInstance.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // ---------------------------------------------------------------------------
  // 2. MediaPipe Pose Landmarker Loader
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let isCancelled = false;

    async function loadPoseEngine() {
      try {
        await initPoseDetector();
        if (!isCancelled) {
          setIsModelReady(true);
        }
      } catch (err) {
        console.error("[SoloArena] Model loading failed:", err);
      }
    }

    loadPoseEngine();

    return () => {
      isCancelled = true;
    };
  }, []);

  // ---------------------------------------------------------------------------
  // 3. Vision Detection Loop
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!isModelReady) return;

    let isActive = true;

    const loop = () => {
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

          // Ingest rep count if in freeform or active timed session
          if (newRep) {
            setRepCount((prev) => prev + 1);
            setTelemetryHistory((hist) => [...hist, newRep]);
          }
        }
      }

      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);

    return () => {
      isActive = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isModelReady]);

  // ---------------------------------------------------------------------------
  // 4. Timed Test Session Management
  // ---------------------------------------------------------------------------
  const startTimedTest = useCallback(() => {
    repCounterRef.current.reset();
    setRepCount(0);
    setTelemetryHistory([]);
    setRemainingTime(timedDuration);
    setIsCountingDown(true);
    setCountdownSec(3);

    const countdownTimer = setInterval(() => {
      setCountdownSec((prev) => {
        if (prev <= 1) {
          clearInterval(countdownTimer);
          setIsCountingDown(false);
          setIsSessionActive(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [timedDuration]);

  // Clock countdown interval
  useEffect(() => {
    if (!isSessionActive || mode !== "TIMED") return;

    const timer = setInterval(() => {
      setRemainingTime((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsSessionActive(false);
          setIsFinishedModalOpen(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isSessionActive, mode]);

  const handleReset = useCallback(() => {
    repCounterRef.current.reset();
    setRepCount(0);
    setTelemetryHistory([]);
    setIsSessionActive(false);
    setIsCountingDown(false);
    setRemainingTime(timedDuration);
    setIsFinishedModalOpen(false);
    setSaveSuccess(false);
  }, [timedDuration]);

  // ---------------------------------------------------------------------------
  // 5. Save Solo Record to Supabase
  // ---------------------------------------------------------------------------
  const handleSaveResult = async () => {
    try {
      setIsSaving(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert("Please log in to persist personal benchmark records.");
        setIsSaving(false);
        return;
      }

      // 1. Create solo match record
      const { data: match, error: matchErr } = await supabase
        .from("matches")
        .insert({
          exercise_id: "pushups",
          match_type: "solo_timed",
          status: "in_progress",
          duration_seconds: timedDuration,
        })
        .select()
        .single();

      if (matchErr || !match) {
        console.error("[SoloArena] Error creating match:", matchErr);
        setIsSaving(false);
        return;
      }

      // 2. Add match participant
      await supabase.from("match_participants").insert({
        match_id: match.id,
        user_id: user.id,
        final_score: repCount,
        is_ready: true,
        has_consented_video: false,
        telemetry_summary: telemetryHistory,
      });

      // 3. Finalize match through authoritative RPC (updates best_rep_count in ratings)
      await supabase.rpc("finalize_match", {
        p_match_id: match.id,
      });

      setSaveSuccess(true);
    } catch (err) {
      console.error("[SoloArena] Exception saving record:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // Telemetry metric shortcuts
  const primaryElbowAngle = frameAnalysis?.primaryElbowAngle ?? 180;
  const hipAlignmentAngle = frameAnalysis?.hipAlignmentAngle ?? 180;
  const depthPercent = Math.min(
    100,
    Math.max(0, ((160 - primaryElbowAngle) / (160 - 90)) * 100)
  );

  const isAligned = hipAlignmentAngle >= 150.0 && hipAlignmentAngle <= 195.0;

  return (
    <div className="flex flex-col min-h-screen bg-canvas text-white selection:bg-accent-cyan/30">
      {/* --------------------------------------------------------------------- */}
      {/* Top Header Navigation */}
      {/* --------------------------------------------------------------------- */}
      <header className="flex items-center justify-between px-6 py-4 bg-canvas-subtle border-b border-border select-none">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard")}
            className="p-1.5 rounded hover:bg-card-elevated border border-transparent hover:border-border text-zinc-400 hover:text-white transition-colors"
            title="Return to Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-accent-cyan" />
            <span className="font-mono font-black text-sm uppercase tracking-wider text-white">
              SOLO PRACTICE & CALIBRATION LAB
            </span>
          </div>
        </div>

        {/* Neural Engine Readiness Pill */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-card border border-border text-xs font-mono">
            <span
              className={cn(
                "w-2 h-2 rounded-full",
                isModelReady ? "bg-accent-emerald" : "bg-accent-gold animate-pulse"
              )}
            />
            <span className="text-zinc-400 uppercase text-[11px]">
              {isModelReady ? "AI ENGINE 3D CALIBRATED" : "LOADING WASM WEIGHTS"}
            </span>
          </div>

          <button
            onClick={() => setIsDiagnosticsOpen(!isDiagnosticsOpen)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs font-mono uppercase transition-colors",
              isDiagnosticsOpen
                ? "bg-accent-cyan/15 border-accent-cyan text-accent-cyan"
                : "bg-card border-border text-zinc-400 hover:text-white"
            )}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>DIAGNOSTICS</span>
          </button>
        </div>
      </header>

      {/* --------------------------------------------------------------------- */}
      {/* Main Workspace Layout */}
      {/* --------------------------------------------------------------------- */}
      <main className="flex-1 flex flex-col p-4 md:p-6 max-w-7xl w-full mx-auto gap-4">
        {/* Countdown Overlay for Timed Test Mode */}
        {isCountingDown && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-canvas-dark/90 backdrop-blur-md">
            <span className="text-xs font-mono tracking-widest uppercase text-accent-cyan mb-2">
              PREPARING BENCHMARK TEST
            </span>
            <div className="font-mono text-9xl font-black text-accent-cyan drop-shadow-hud-cyan animate-ping">
              {countdownSec > 0 ? countdownSec : "START!"}
            </div>
          </div>
        )}

        {/* Camera Permission Alert Banner */}
        {cameraError && (
          <div className="flex items-center gap-3 p-3 rounded-md bg-accent-crimson/15 border border-accent-crimson text-accent-crimson text-xs font-mono">
            <ShieldAlert className="w-5 h-5 flex-shrink-0" />
            <span>{cameraError}</span>
          </div>
        )}

        {/* Central Arena Grid: Camera Feed + Real-Time Telemetry HUD */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1">
          {/* Left/Center: High-Precision Camera Feed Canvas */}
          <div className="lg:col-span-2 flex flex-col gap-3">
            <CameraFeed
              videoRef={videoRef}
              landmarks={frameAnalysis?.landmarks ?? null}
              primaryElbowAngle={primaryElbowAngle}
              hipAlignmentAngle={hipAlignmentAngle}
              phase={frameAnalysis?.phase ?? "CALIBRATING"}
              className="flex-1 min-h-[380px]"
            />

            {/* Bottom Dock Control Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-md bg-card border border-border">
              {/* Mode Selector */}
              <div className="flex items-center gap-1.5 p-1 rounded bg-canvas-dark border border-border">
                <button
                  type="button"
                  onClick={() => {
                    setMode("FREEFORM");
                    handleReset();
                  }}
                  className={cn(
                    "px-3 py-1.5 rounded text-xs font-mono uppercase font-bold transition-all",
                    mode === "FREEFORM"
                      ? "bg-card-elevated text-white border border-border"
                      : "text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  FREEFORM
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("TIMED");
                    handleReset();
                  }}
                  className={cn(
                    "px-3 py-1.5 rounded text-xs font-mono uppercase font-bold transition-all",
                    mode === "TIMED"
                      ? "bg-accent-cyan text-black shadow-hud-cyan"
                      : "text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  TIMED TEST
                </button>
              </div>

              {/* Timed Test Duration Chips */}
              {mode === "TIMED" && (
                <div className="flex items-center gap-1.5">
                  {[30, 60, 120].map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      disabled={isSessionActive}
                      onClick={() => {
                        setTimedDuration(sec);
                        setRemainingTime(sec);
                      }}
                      className={cn(
                        "px-2.5 py-1 rounded text-xs font-mono font-bold transition-colors",
                        timedDuration === sec
                          ? "bg-card-elevated border border-accent-cyan text-accent-cyan"
                          : "bg-canvas-dark border border-border text-zinc-500 hover:text-white"
                      )}
                    >
                      {sec}S
                    </button>
                  ))}
                </div>
              )}

              {/* Execution Actions */}
              <div className="flex items-center gap-2">
                {mode === "TIMED" && !isSessionActive && (
                  <button
                    type="button"
                    onClick={startTimedTest}
                    className="flex items-center gap-2 px-5 py-2 rounded bg-accent-emerald text-black font-mono text-xs font-black uppercase tracking-wider hover:bg-emerald-300 transition-all shadow-hud-emerald"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>START TEST</span>
                  </button>
                )}

                {isSessionActive && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsSessionActive(false);
                      setIsFinishedModalOpen(true);
                    }}
                    className="flex items-center gap-2 px-5 py-2 rounded bg-accent-crimson text-white font-mono text-xs font-black uppercase tracking-wider hover:bg-rose-600 transition-all shadow-hud-crimson"
                  >
                    <StopCircle className="w-3.5 h-3.5" />
                    <span>STOP SET</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleReset}
                  className="flex items-center gap-1.5 px-3 py-2 rounded bg-card-elevated hover:bg-zinc-800 border border-border text-zinc-400 hover:text-white font-mono text-xs font-bold uppercase transition-colors"
                  title="Reset Rep Counter"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>RESET</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Rep Counter HUD & Diagnostics Engine */}
          <div className="flex flex-col gap-4">
            {/* High-Density LED Rep Counter HUD */}
            <RepCounterHUD
              repCount={repCount}
              phase={frameAnalysis?.phase ?? "CALIBRATING"}
              primaryElbowAngle={primaryElbowAngle}
              hipAlignmentAngle={hipAlignmentAngle}
              violations={frameAnalysis?.activeViolations ?? []}
              depthProgress={depthPercent}
            />

            {/* Live Clock for Timed Benchmark Sets */}
            {mode === "TIMED" && (
              <div className="flex flex-col p-4 rounded-md bg-card border border-border">
                <div className="flex items-center justify-between text-xs font-mono text-zinc-400 mb-2">
                  <span className="uppercase tracking-wider">SET CLOCK</span>
                  <Clock className="w-3.5 h-3.5 text-accent-cyan" />
                </div>
                <div className="flex items-baseline justify-between">
                  <span
                    className={cn(
                      "font-mono text-5xl font-black",
                      remainingTime <= 10 && remainingTime > 0
                        ? "text-accent-crimson animate-pulse"
                        : "text-white"
                    )}
                  >
                    00:{remainingTime.toString().padStart(2, "0")}
                  </span>
                  <span className="text-xs font-mono uppercase text-zinc-500">
                    {isSessionActive ? "ACTIVE" : "STANDBY"}
                  </span>
                </div>
              </div>
            )}

            {/* Real-time Angle Diagnostics Drawer */}
            {isDiagnosticsOpen && (
              <div className="flex flex-col gap-3 p-4 rounded-md bg-card border border-border select-none">
                <div className="flex items-center justify-between pb-2 border-b border-border/80 text-xs font-mono">
                  <span className="text-zinc-400 uppercase tracking-widest">
                    KINEMATIC ANGLE DIAGNOSTICS
                  </span>
                  <Activity className="w-3.5 h-3.5 text-accent-cyan" />
                </div>

                {/* Primary Elbow Flexion Readout */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-zinc-400">ELBOW FLEXION (90° TARGET)</span>
                    <span
                      className={cn(
                        "font-bold",
                        primaryElbowAngle <= 90
                          ? "text-accent-emerald"
                          : primaryElbowAngle <= 120
                          ? "text-accent-gold"
                          : "text-accent-cyan"
                      )}
                    >
                      {Math.round(primaryElbowAngle)}°
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded bg-canvas-dark border border-border overflow-hidden">
                    <div
                      className="h-full bg-accent-cyan transition-all"
                      style={{ width: `${depthPercent}%` }}
                    />
                  </div>
                </div>

                {/* Hip Plank Alignment Readout */}
                <div className="flex flex-col gap-1 pt-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-zinc-400">PLANK LINE (150°-195°)</span>
                    <span
                      className={cn(
                        "font-bold",
                        isAligned ? "text-accent-emerald" : "text-accent-crimson"
                      )}
                    >
                      {Math.round(hipAlignmentAngle)}°
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded bg-canvas-dark border border-border overflow-hidden">
                    <div
                      className={cn(
                        "h-full transition-all",
                        isAligned ? "bg-accent-emerald" : "bg-accent-crimson"
                      )}
                      style={{
                        width: `${Math.min(100, Math.max(0, ((hipAlignmentAngle - 120) / (200 - 120)) * 100))}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Landmark Confidence Gauge */}
                <div className="flex items-center justify-between pt-2 border-t border-border text-xs font-mono">
                  <span className="text-zinc-400">TRACKING CONFIDENCE</span>
                  <span
                    className={cn(
                      "font-bold",
                      (frameAnalysis?.confidence ?? 0) >= 0.65
                        ? "text-accent-emerald"
                        : "text-accent-crimson"
                    )}
                  >
                    {Math.round((frameAnalysis?.confidence ?? 0) * 100)}%
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ------------------------------------------------------------------- */}
        {/* Test Completion Modal */}
        {/* ------------------------------------------------------------------- */}
        {isFinishedModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-canvas-dark/85 backdrop-blur-md select-none">
            <div className="flex flex-col items-center max-w-md w-full p-6 rounded-lg bg-card-elevated border border-border shadow-2xl text-center">
              <Trophy className="w-14 h-14 text-accent-gold drop-shadow-hud-gold mb-3" />
              <h3 className="font-mono text-2xl font-black uppercase tracking-wider text-white mb-1">
                SOLO SET COMPLETED
              </h3>
              <span className="text-xs font-mono uppercase tracking-widest text-zinc-400 mb-6">
                BENCHMARK TELEMETRY LOGGED
              </span>

              {/* Final Score Readout */}
              <div className="w-full p-4 rounded bg-canvas-dark border border-border mb-6">
                <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider">
                  VERIFIED REPETITIONS
                </span>
                <div className="font-mono text-6xl font-black text-accent-cyan my-1">
                  {repCount}
                </div>
                <span className="text-[11px] font-mono text-zinc-500">
                  DURATION: {timedDuration} SECONDS
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 w-full">
                <button
                  type="button"
                  onClick={handleSaveResult}
                  disabled={isSaving || saveSuccess}
                  className={cn(
                    "w-full py-3 rounded font-mono text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2",
                    saveSuccess
                      ? "bg-accent-emerald text-black shadow-hud-emerald"
                      : "bg-accent-cyan text-black hover:bg-cyan-300 shadow-hud-cyan"
                  )}
                >
                  {isSaving ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : saveSuccess ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>RECORD SAVED TO RATINGS</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>SAVE TO BENCHMARK PROFILE</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleReset}
                  className="w-full py-2.5 rounded bg-card hover:bg-zinc-800 border border-border text-zinc-300 font-mono text-xs font-bold uppercase transition-colors"
                >
                  START NEW PRACTICE SET
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

