"use client";

/**
 * WebRTCVideoPanel: 1v1 Split-Screen Competitive Video Panel.
 * Synchronizes local and remote camera feeds, displays real-time score differentials,
 * privacy fallbacks with audio soundwave animations, and peripheral media controls.
 */

import React, { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Wifi,
  Shield,
  User,
  Radio,
} from "lucide-react";

export interface WebRTCVideoPanelProps {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  localScore: number;
  remoteScore: number;
  localUsername: string;
  remoteUsername: string;
  connectionState: RTCPeerConnectionState;
  hasRemoteVideoConsent: boolean;
  onToggleCamera: () => void;
  onToggleMic: () => void;
  isCameraOn: boolean;
  isMicOn: boolean;
  className?: string;
}

export const WebRTCVideoPanel: React.FC<WebRTCVideoPanelProps> = ({
  localStream,
  remoteStream,
  localScore,
  remoteScore,
  localUsername,
  remoteUsername,
  connectionState,
  hasRemoteVideoConsent,
  onToggleCamera,
  onToggleMic,
  isCameraOn,
  isMicOn,
  className,
}) => {
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  // Bind local stream to video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Bind remote stream to video element
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Score differential calculation
  const scoreDiff = localScore - remoteScore;

  // Check if remote stream actually has active video tracks
  const hasActiveRemoteVideo =
    hasRemoteVideoConsent &&
    remoteStream !== null &&
    remoteStream.getVideoTracks().length > 0 &&
    remoteStream.getVideoTracks()[0].enabled;

  return (
    <div className={cn("flex flex-col gap-3 w-full select-none", className)}>
      {/* 1v1 Split Video Arena */}
      <div className="relative grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
        {/* Local Competitor Panel */}
        <div className="relative aspect-video rounded-md overflow-hidden bg-canvas-dark border border-border">
          {localStream && isCameraOn ? (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover scale-x-[-1]"
            />
          ) : (
            <div className="flex flex-col items-center justify-center w-full h-full bg-card p-4 text-center">
              <div className="w-12 h-12 rounded-full bg-canvas-dark border border-border flex items-center justify-center mb-2 text-zinc-500">
                <User className="w-6 h-6" />
              </div>
              <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                CAMERA DISABLED
              </span>
            </div>
          )}

          {/* Local Nameplate & Score Badge */}
          <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-2 px-2.5 py-1 rounded bg-card/85 backdrop-blur-md border border-border">
            <span className="w-2 h-2 rounded-full bg-accent-cyan" />
            <span className="text-xs font-mono font-bold uppercase text-white tracking-wide">
              {localUsername} (YOU)
            </span>
          </div>

          <div className="absolute bottom-2.5 right-2.5 z-10 px-3 py-1 rounded bg-card/85 backdrop-blur-md border border-border flex items-baseline gap-1.5">
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">
              SCORE
            </span>
            <span className="font-mono text-xl font-black text-accent-cyan">
              {localScore}
            </span>
          </div>
        </div>

        {/* Central Athletic VS Divider Badge (Visible in Desktop Grid) */}
        <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex-col items-center pointer-events-none">
          <div className="flex items-center justify-center w-11 h-11 rounded-full bg-card-elevated border-2 border-border shadow-2xl">
            <span className="font-mono text-xs font-black tracking-widest text-zinc-300">
              VS
            </span>
          </div>
          {/* Live Score Gap Indicator */}
          <div
            className={cn(
              "mt-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider border",
              scoreDiff > 0
                ? "bg-accent-emerald/20 text-accent-emerald border-accent-emerald/40"
                : scoreDiff < 0
                ? "bg-accent-crimson/20 text-accent-crimson border-accent-crimson/40"
                : "bg-accent-gold/20 text-accent-gold border-accent-gold/40"
            )}
          >
            {scoreDiff > 0 ? `+${scoreDiff}` : scoreDiff < 0 ? `${scoreDiff}` : "TIED"}
          </div>
        </div>

        {/* Remote Opponent Panel */}
        <div className="relative aspect-video rounded-md overflow-hidden bg-canvas-dark border border-border">
          {hasActiveRemoteVideo ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center justify-center w-full h-full bg-card p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-canvas-dark border border-border flex items-center justify-center mb-3 text-zinc-500">
                <Shield className="w-7 h-7 text-accent-cyan/60" />
              </div>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-300 mb-1">
                OPPONENT VIDEO HIDDEN
              </span>
              <span className="text-[11px] font-mono text-zinc-500 max-w-xs">
                Camera consent disabled for private telemetry mode.
              </span>

              {/* Animated Soundwave Active Audio Indicator */}
              <div className="flex items-center gap-1 mt-4">
                <span className="w-1 h-3 bg-accent-cyan animate-pulse rounded-full" />
                <span className="w-1 h-5 bg-accent-cyan animate-pulse delay-75 rounded-full" />
                <span className="w-1 h-7 bg-accent-cyan animate-pulse delay-150 rounded-full" />
                <span className="w-1 h-4 bg-accent-cyan animate-pulse delay-100 rounded-full" />
                <span className="w-1 h-2 bg-accent-cyan animate-pulse rounded-full" />
              </div>
            </div>
          )}

          {/* Remote Nameplate & Score Badge */}
          <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-2 px-2.5 py-1 rounded bg-card/85 backdrop-blur-md border border-border">
            <span
              className={cn(
                "w-2 h-2 rounded-full",
                connectionState === "connected"
                  ? "bg-accent-emerald"
                  : "bg-accent-gold animate-pulse"
              )}
            />
            <span className="text-xs font-mono font-bold uppercase text-white tracking-wide">
              {remoteUsername}
            </span>
          </div>

          <div className="absolute bottom-2.5 right-2.5 z-10 px-3 py-1 rounded bg-card/85 backdrop-blur-md border border-border flex items-baseline gap-1.5">
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">
              SCORE
            </span>
            <span className="font-mono text-xl font-black text-accent-crimson">
              {remoteScore}
            </span>
          </div>
        </div>
      </div>

      {/* Peripheral HUD Controls Dock */}
      <div className="flex items-center justify-between px-4 py-2.5 rounded-md bg-card border border-border">
        {/* Connection Quality Indicator */}
        <div className="flex items-center gap-2">
          <Wifi
            className={cn(
              "w-4 h-4",
              connectionState === "connected"
                ? "text-accent-emerald"
                : connectionState === "connecting"
                ? "text-accent-gold animate-pulse"
                : "text-accent-crimson"
            )}
          />
          <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">
            {connectionState === "connected"
              ? "P2P ENCRYPTED"
              : connectionState === "connecting"
              ? "ESTABLISHING SIGNAL"
              : "RECONNECTING"}
          </span>
        </div>

        {/* Media Toggle Controls */}
        <div className="flex items-center gap-2">
          {/* Mic Toggle Button */}
          <button
            type="button"
            onClick={onToggleMic}
            className={cn(
              "flex items-center justify-center w-9 h-9 rounded border transition-colors",
              isMicOn
                ? "bg-card-elevated border-border text-white hover:border-accent-cyan"
                : "bg-accent-crimson/20 border-accent-crimson text-accent-crimson"
            )}
            title={isMicOn ? "Mute Microphone" : "Unmute Microphone"}
          >
            {isMicOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          </button>

          {/* Camera Toggle Button */}
          <button
            type="button"
            onClick={onToggleCamera}
            className={cn(
              "flex items-center justify-center w-9 h-9 rounded border transition-colors",
              isCameraOn
                ? "bg-card-elevated border-border text-white hover:border-accent-cyan"
                : "bg-accent-crimson/20 border-accent-crimson text-accent-crimson"
            )}
            title={isCameraOn ? "Disable Camera" : "Enable Camera"}
          >
            {isCameraOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};

