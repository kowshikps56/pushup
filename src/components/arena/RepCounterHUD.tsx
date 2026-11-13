"use client";

/**
 * RepCounterHUD: Monospace high-density LED-style repetition counter,
 * depth progress meter, form integrity monitor, and Web Audio API feedback synthesizer.
 */

import React, { useEffect, useRef } from "react";
import { FormViolation, PushUpPhase } from "@/types/exercise";
import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, ShieldCheck, Zap } from "lucide-react";

export interface RepCounterHUDProps {
  repCount: number;
  phase: PushUpPhase;
  primaryElbowAngle: number;
  hipAlignmentAngle: number;
  violations: FormViolation[];
  depthProgress: number; // 0 to 100%
  className?: string;
}

/**
 * Low-latency procedural Web Audio synthesizer.
 */
class HUDSoundEngine {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  // High-frequency crisp chime for successful rep registration
  public playRepChime(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1760, now + 0.08);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.08);
    } catch {
      // Audio autoplay policy fallback
    }
  }

  // Low harsh buzz for form breaches
  public playFoulBuzz(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "square";
      osc.frequency.setValueAtTime(150, now);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.12);
    } catch {
      // Audio autoplay policy fallback
    }
  }
}

const soundEngine = new HUDSoundEngine();

export const RepCounterHUD: React.FC<RepCounterHUDProps> = ({
  repCount,
  phase,
  primaryElbowAngle,
  hipAlignmentAngle,
  violations,
  depthProgress,
  className,
}) => {
  const prevCountRef = useRef(repCount);
  const prevViolationsCountRef = useRef(violations.length);

  // Trigger audio feedback on rep increment
  useEffect(() => {
    if (repCount > prevCountRef.current) {
      soundEngine.playRepChime();
    }
    prevCountRef.current = repCount;
  }, [repCount]);

  // Trigger buzz on new violation
  useEffect(() => {
    if (violations.length > prevViolationsCountRef.current) {
      soundEngine.playFoulBuzz();
    }
    prevViolationsCountRef.current = violations.length;
  }, [violations]);

  // Form integrity evaluation
  const isSag = hipAlignmentAngle < 150.0;
  const isPike = hipAlignmentAngle > 195.0;
  const isFormGood = !isSag && !isPike;

  // Clamped depth percent
  const clampedDepth = Math.min(100, Math.max(0, depthProgress));
  const isLockedDepth = primaryElbowAngle <= 90.0 || phase === "BOTTOM_POSITION";

  return (
    <div
      className={cn(
        "flex flex-col gap-4 p-4 rounded-md bg-card border border-border text-white select-none",
        className
      )}
    >
      {/* Header & FSM Phase Ticker */}
      <div className="flex items-center justify-between border-b border-border/80 pb-3">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-accent-cyan" />
          <span className="text-xs font-mono uppercase tracking-widest text-zinc-400">
            COMPETITION COUNTER
          </span>
        </div>

        {/* Phase Pill */}
        <div
          className={cn(
            "px-2.5 py-0.5 rounded text-[11px] font-mono uppercase font-bold tracking-wider",
            phase === "BOTTOM_POSITION"
              ? "bg-accent-emerald/20 text-accent-emerald border border-accent-emerald/40"
              : phase === "DESCENDING"
              ? "bg-accent-gold/20 text-accent-gold border border-accent-gold/40"
              : phase === "ASCENDING"
              ? "bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/40"
              : phase === "TOP_POSITION"
              ? "bg-zinc-800 text-zinc-300 border border-zinc-700"
              : "bg-zinc-900 text-zinc-500 border border-zinc-800"
          )}
        >
          {phase === "TOP_POSITION"
            ? "LOCKOUT"
            : phase === "BOTTOM_POSITION"
            ? "DEPTH LOCKED"
            : phase}
        </div>
      </div>

      {/* Main Counter Display */}
      <div className="flex items-baseline justify-between">
        <div className="flex items-baseline gap-2">
          <span
            className={cn(
              "font-mono text-7xl md:text-9xl font-black tracking-tighter transition-all duration-75",
              isLockedDepth
                ? "text-accent-emerald drop-shadow-hud-emerald scale-[1.02]"
                : "text-white"
            )}
          >
            {repCount.toString().padStart(2, "0")}
          </span>
          <span className="text-sm font-mono uppercase text-zinc-500 tracking-wider">
            REPS
          </span>
        </div>

        {/* Real-Time Form Integrity Status */}
        <div className="flex flex-col items-end gap-1.5">
          {isFormGood ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-accent-emerald/15 border border-accent-emerald/40 text-accent-emerald text-xs font-mono font-bold tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              <span>GOOD FORM</span>
            </div>
          ) : isSag ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-accent-crimson/20 border border-accent-crimson text-accent-crimson text-xs font-mono font-bold tracking-wider animate-pulse">
              <AlertTriangle className="w-4 h-4" />
              <span>SAG WARNING</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-accent-crimson/20 border border-accent-crimson text-accent-crimson text-xs font-mono font-bold tracking-wider animate-pulse">
              <AlertTriangle className="w-4 h-4" />
              <span>PIKE DETECTED</span>
            </div>
          )}

          <span className="text-[10px] font-mono text-zinc-400">
            PLANK: {Math.round(hipAlignmentAngle)}° (150°-195°)
          </span>
        </div>
      </div>

      {/* Depth Meter Progress Bar */}
      <div className="flex flex-col gap-1.5 pt-2">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-zinc-400 tracking-wider">DEPTH TARGET (90°)</span>
          <span
            className={cn(
              "font-bold",
              isLockedDepth ? "text-accent-emerald" : "text-accent-cyan"
            )}
          >
            {Math.round(clampedDepth)}%
          </span>
        </div>

        {/* Depth Bar Track */}
        <div className="relative w-full h-3 rounded bg-canvas-dark border border-border overflow-hidden">
          <div
            className={cn(
              "h-full transition-all duration-75",
              isLockedDepth
                ? "bg-accent-emerald shadow-hud-emerald"
                : "bg-accent-cyan shadow-hud-cyan"
            )}
            style={{ width: `${clampedDepth}%` }}
          />

          {/* 90° Threshold Indicator Notch at 100% */}
          <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/60 pointer-events-none" />
        </div>
      </div>

      {/* Active Violations Ticker */}
      {violations.length > 0 && (
        <div className="mt-1 flex flex-col gap-1 p-2 rounded bg-accent-crimson/10 border border-accent-crimson/30 text-accent-crimson text-xs font-mono">
          <div className="flex items-center gap-1 font-bold">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>PENALTY RECORDED:</span>
          </div>
          <span className="text-[11px] text-zinc-300">
            {violations[violations.length - 1].message}
          </span>
        </div>
      )}
    </div>
  );
};

