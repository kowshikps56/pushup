"use client";

/**
 * MatchTimer: High-precision authoritative competition timer.
 * Synchronizes against serverEndTime and renders a circular SVG depleting track
 * with sub-second millisecond precision and critical time warning animations.
 */

import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Clock } from "lucide-react";

export interface MatchTimerProps {
  serverStartTime: string | null;
  serverEndTime: string | null;
  durationSeconds: number;
  onTimeExpired?: () => void;
  isPaused?: boolean;
  className?: string;
}

export const MatchTimer: React.FC<MatchTimerProps> = ({
  serverStartTime,
  serverEndTime,
  durationSeconds,
  onTimeExpired,
  isPaused = false,
  className,
}) => {
  const [remainingMs, setRemainingMs] = useState<number>(durationSeconds * 1000);
  const hasExpiredRef = useRef<boolean>(false);
  const onTimeExpiredRef = useRef(onTimeExpired);
  onTimeExpiredRef.current = onTimeExpired;

  useEffect(() => {
    hasExpiredRef.current = false;
  }, [serverEndTime]);

  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      if (!serverEndTime) {
        setRemainingMs(durationSeconds * 1000);
        return;
      }

      const endMs = new Date(serverEndTime).getTime();
      const now = Date.now();
      const diff = Math.max(0, endMs - now);

      setRemainingMs(diff);

      if (diff <= 0 && !hasExpiredRef.current) {
        hasExpiredRef.current = true;
        onTimeExpiredRef.current?.();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [serverEndTime, durationSeconds, isPaused]);

  // Total duration in milliseconds
  const totalDurationMs = durationSeconds * 1000;
  const progressFraction = Math.min(1, Math.max(0, remainingMs / totalDurationMs));

  // Time calculations
  const totalSeconds = Math.floor(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const tenths = Math.floor((remainingMs % 1000) / 100);

  const formattedTime = `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}.${tenths}`;

  const isLowTime = remainingMs <= 10000 && remainingMs > 0 && !!serverEndTime;
  const isExpired = remainingMs === 0 && !!serverEndTime;

  // SVG circular geometry
  const radius = 48;
  const strokeWidth = 5;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progressFraction);

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center p-3 rounded-md bg-card border border-border select-none",
        isLowTime && "border-accent-crimson shadow-hud-crimson animate-pulse",
        className
      )}
    >
      <div className="relative flex items-center justify-center w-32 h-32">
        <svg className="w-full h-full transform -rotate-90">
          {/* Background Track Circle */}
          <circle
            cx="64"
            cy="64"
            r={radius}
            className="stroke-[#161B22]"
            strokeWidth={strokeWidth}
            fill="transparent"
          />

          {/* Depleting Active Track Circle */}
          <circle
            cx="64"
            cy="64"
            r={radius}
            fill="transparent"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className={cn(
              "transition-all duration-100",
              isLowTime
                ? "stroke-accent-crimson"
                : isExpired
                ? "stroke-zinc-600"
                : "stroke-accent-cyan"
            )}
            style={{
              filter: isLowTime
                ? "drop-shadow(0 0 6px rgba(255, 51, 102, 0.8))"
                : "drop-shadow(0 0 4px rgba(0, 242, 254, 0.5))",
            }}
          />
        </svg>

        {/* Inner Digital Monospace Readout */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <Clock
            className={cn(
              "w-3.5 h-3.5 mb-0.5",
              isLowTime
                ? "text-accent-crimson animate-bounce"
                : "text-zinc-500"
            )}
          />
          <span
            className={cn(
              "font-mono text-xl font-black tracking-tight",
              isLowTime
                ? "text-accent-crimson drop-shadow-hud-crimson"
                : isExpired
                ? "text-zinc-500"
                : "text-white"
            )}
          >
            {formattedTime}
          </span>
          <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-500">
            {isExpired ? "TIME UP" : isLowTime ? "CRITICAL" : "REMAINING"}
          </span>
        </div>
      </div>
    </div>
  );
};

