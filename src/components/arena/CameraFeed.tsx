"use client";

/**
 * CameraFeed: Video rendering layer with real-time HTML5 Canvas skeletal overlay.
 * Renders biomechanical joint vectors, depth color-shifting, and HUD alignment badges.
 */

import React, { useEffect, useRef } from "react";
import { NormalizedLandmark, PushUpPhase } from "@/types/exercise";
import { cn } from "@/lib/utils";
import { Activity, ShieldAlert, Sparkles } from "lucide-react";

export interface CameraFeedProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  landmarks: NormalizedLandmark[] | null;
  primaryElbowAngle: number;
  hipAlignmentAngle: number;
  phase: PushUpPhase;
  isMirrored?: boolean;
  className?: string;
}

// BlazePose key joint indices
const SKELETON_PAIRS: [number, number][] = [
  // Upper body
  [11, 12], // Left shoulder -> Right shoulder
  [11, 13], // Left shoulder -> Left elbow
  [13, 15], // Left elbow -> Left wrist
  [12, 14], // Right shoulder -> Right elbow
  [14, 16], // Right elbow -> Right wrist
  // Torso
  [11, 23], // Left shoulder -> Left hip
  [12, 24], // Right shoulder -> Right hip
  [23, 24], // Left hip -> Right hip
  // Lower body
  [23, 25], // Left hip -> Left knee
  [25, 27], // Left knee -> Left ankle
  [24, 26], // Right hip -> Right knee
  [26, 28], // Right knee -> Right ankle
];

export const CameraFeed: React.FC<CameraFeedProps> = ({
  videoRef,
  landmarks,
  primaryElbowAngle,
  hipAlignmentAngle,
  phase,
  isMirrored = true,
  className,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Renders the skeleton vectors and HUD markings on every landmark frame
  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = video.videoWidth || canvas.clientWidth || 640;
    const height = video.videoHeight || canvas.clientHeight || 480;

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    ctx.clearRect(0, 0, width, height);

    if (!landmarks || landmarks.length < 33) {
      return;
    }

    // Convert normalized landmark (0-1) to canvas coordinates with optional mirror flip
    const toScreen = (lm: NormalizedLandmark) => {
      const x = isMirrored ? (1 - lm.x) * width : lm.x * width;
      const y = lm.y * height;
      return { x, y };
    };

    // Determine if hip line has violated alignment
    const isHipFault = hipAlignmentAngle < 150.0 || hipAlignmentAngle > 195.0;

    // 1. Draw Skeletal Connections (Bones)
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    SKELETON_PAIRS.forEach(([idxA, idxB]) => {
      const lmA = landmarks[idxA];
      const lmB = landmarks[idxB];
      if (!lmA || !lmB) return;

      const ptA = toScreen(lmA);
      const ptB = toScreen(lmB);

      // Highlight spine/hip alignment line if sagging or piking
      const isPlankBone =
        (idxA === 11 && idxB === 23) ||
        (idxA === 12 && idxB === 24) ||
        (idxA === 23 && idxB === 25) ||
        (idxA === 24 && idxB === 26);

      ctx.beginPath();
      ctx.moveTo(ptA.x, ptA.y);
      ctx.lineTo(ptB.x, ptB.y);

      if (isPlankBone && isHipFault) {
        ctx.strokeStyle = "#FF3366"; // Hot Crimson warning line
        ctx.lineWidth = 3.5;
        ctx.shadowColor = "rgba(255, 51, 102, 0.7)";
        ctx.shadowBlur = 10;
      } else {
        ctx.strokeStyle = "#00F2FE"; // Neon Electric Cyan
        ctx.lineWidth = 2.5;
        ctx.shadowColor = "rgba(0, 242, 254, 0.5)";
        ctx.shadowBlur = 6;
      }

      ctx.stroke();
    });

    // Reset shadow
    ctx.shadowBlur = 0;

    // 2. Draw Landmark Joint Nodes
    const ELBOW_INDICES = [13, 14];
    const KEY_JOINTS = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];

    KEY_JOINTS.forEach((idx) => {
      const lm = landmarks[idx];
      if (!lm) return;
      const pt = toScreen(lm);

      const isElbow = ELBOW_INDICES.includes(idx);

      ctx.beginPath();
      ctx.arc(pt.x, pt.y, isElbow ? 6.5 : 4.5, 0, Math.PI * 2);

      if (isElbow) {
        // Dynamic elbow coloration based on depth progress
        if (primaryElbowAngle <= 90.0 || phase === "BOTTOM_POSITION") {
          ctx.fillStyle = "#00FF87"; // Acid Emerald (optimal depth reached)
          ctx.shadowColor = "rgba(0, 255, 135, 0.9)";
          ctx.shadowBlur = 14;
        } else if (phase === "DESCENDING") {
          ctx.fillStyle = "#F59E0B"; // Amber (in descent)
          ctx.shadowColor = "rgba(245, 158, 11, 0.6)";
          ctx.shadowBlur = 8;
        } else {
          ctx.fillStyle = "#00F2FE"; // Electric Cyan (lockout/starting)
          ctx.shadowColor = "rgba(0, 242, 254, 0.6)";
          ctx.shadowBlur = 8;
        }
      } else {
        ctx.fillStyle = "#FFFFFF";
        ctx.shadowColor = "rgba(255, 255, 255, 0.4)";
        ctx.shadowBlur = 4;
      }

      ctx.fill();
      ctx.strokeStyle = "#090A0F";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });
  }, [landmarks, primaryElbowAngle, hipAlignmentAngle, phase, isMirrored, videoRef]);

  const isFault = hipAlignmentAngle < 150.0 || hipAlignmentAngle > 195.0;

  return (
    <div
      className={cn(
        "relative w-full aspect-video bg-canvas-dark rounded-md overflow-hidden border border-border shadow-2xl select-none",
        isFault && "border-accent-crimson/50 shadow-hud-crimson",
        className
      )}
    >
      {/* Underlying Video Stream */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={cn(
          "absolute inset-0 w-full h-full object-cover",
          isMirrored && "scale-x-[-1]"
        )}
      />

      {/* HTML5 Canvas Skeletal Overlay */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-10"
      />

      {/* Tactical HUD Corner Reticles */}
      <div className="absolute top-2 left-2 w-4 h-4 border-l-2 border-t-2 border-accent-cyan/80 pointer-events-none z-20" />
      <div className="absolute top-2 right-2 w-4 h-4 border-r-2 border-t-2 border-accent-cyan/80 pointer-events-none z-20" />
      <div className="absolute bottom-2 left-2 w-4 h-4 border-l-2 border-b-2 border-accent-cyan/80 pointer-events-none z-20" />
      <div className="absolute bottom-2 right-2 w-4 h-4 border-r-2 border-b-2 border-accent-cyan/80 pointer-events-none z-20" />

      {/* Top-Left Status Pill */}
      <div className="absolute top-3 left-3 z-20 flex items-center gap-2 px-2.5 py-1 rounded bg-card/85 backdrop-blur-md border border-border text-xs font-mono uppercase tracking-wider text-white">
        {landmarks && phase !== "CALIBRATING" ? (
          <>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-emerald opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-emerald" />
            </span>
            <span className="text-accent-emerald font-semibold">LIVE TRACKING</span>
          </>
        ) : phase === "CALIBRATING" ? (
          <>
            <span className="h-2 w-2 rounded-full bg-accent-gold animate-pulse" />
            <span className="text-accent-gold font-semibold">CALIBRATING</span>
          </>
        ) : (
          <>
            <span className="h-2 w-2 rounded-full bg-accent-crimson" />
            <span className="text-accent-crimson font-semibold">SEARCHING POSE</span>
          </>
        )}
      </div>

      {/* Top-Right Alignment Indicator */}
      <div className="absolute top-3 right-3 z-20">
        {isFault ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-accent-crimson/20 border border-accent-crimson text-accent-crimson text-xs font-mono tracking-wider animate-pulse">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>ALIGNMENT BREACH</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-accent-emerald/15 border border-accent-emerald/40 text-accent-emerald text-xs font-mono tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>PLANK LOCKED</span>
          </div>
        )}
      </div>

      {/* Bottom Telemetry Bar */}
      <div className="absolute bottom-3 inset-x-3 z-20 flex items-center justify-between pointer-events-none">
        {/* Elbow Angle Telemetry */}
        <div className="px-3 py-1.5 rounded bg-card/85 backdrop-blur-md border border-border flex flex-col">
          <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">
            ELBOW DEPTH
          </span>
          <div className="flex items-baseline gap-1">
            <span
              className={cn(
                "text-2xl font-mono font-black",
                primaryElbowAngle <= 90
                  ? "text-accent-emerald drop-shadow-hud-emerald"
                  : primaryElbowAngle <= 120
                  ? "text-accent-gold"
                  : "text-accent-cyan"
              )}
            >
              {Math.round(primaryElbowAngle)}°
            </span>
            <span className="text-[11px] font-mono text-zinc-500">/ 90°</span>
          </div>
        </div>

        {/* Hip Alignment Telemetry */}
        <div className="px-3 py-1.5 rounded bg-card/85 backdrop-blur-md border border-border flex flex-col items-end">
          <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">
            PLANK VECTOR
          </span>
          <div className="flex items-baseline gap-1">
            <span
              className={cn(
                "text-2xl font-mono font-black",
                isFault ? "text-accent-crimson" : "text-white"
              )}
            >
              {Math.round(hipAlignmentAngle)}°
            </span>
            <span className="text-[11px] font-mono text-zinc-500">180° OPT</span>
          </div>
        </div>
      </div>
    </div>
  );
};

