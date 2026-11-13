"use client";

/**
 * Supabase Realtime & Local Mesh synchronization hook for 1v1 PushUp Arena matches.
 * Coordinates WebRTC peer signaling, real-time score broadcasts, and anti-cheat timing checks.
 * Includes automatic local BroadcastChannel fallback for multi-tab testing without cloud credentials.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  WebRTCCallbacks,
  WebRTCPeerConnectionManager,
} from "@/lib/webrtc/peerConnection";
import {
  isLocalMeshAvailable,
  LocalBroadcastSignaling,
} from "@/lib/webrtc/localMockSignaling";
import { RepTelemetry } from "@/types/exercise";

export interface UseMatchSyncParams {
  matchId: string;
  userId: string;
  localStream: MediaStream | null;
  serverEndTime: string | null;
  onRemoteStream?: (stream: MediaStream) => void;
  onMatchCompleted?: () => void;
}

export interface UseMatchSyncReturn {
  opponentScore: number;
  opponentReady: boolean;
  opponentVideoConsent: boolean;
  peerConnectionState: RTCPeerConnectionState;
  isChannelConnected: boolean;
  sendRepScore: (score: number, telemetry: RepTelemetry) => void;
  setReady: (isReady: boolean, videoConsent: boolean) => void;
  disconnectSync: () => void;
}

interface SignalPayload {
  from: string;
  type: "offer" | "answer" | "candidate";
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

interface ReadyPayload {
  userId: string;
  isReady: boolean;
  videoConsent: boolean;
}

interface ScorePayload {
  userId: string;
  currentScore: number;
  telemetry: RepTelemetry;
  timestamp: number;
}

export function useMatchSync({
  matchId,
  userId,
  localStream,
  serverEndTime,
  onRemoteStream,
  onMatchCompleted,
}: UseMatchSyncParams): UseMatchSyncReturn {
  const [opponentScore, setOpponentScore] = useState<number>(0);
  const [opponentReady, setOpponentReady] = useState<boolean>(false);
  const [opponentVideoConsent, setOpponentVideoConsent] = useState<boolean>(false);
  const [peerConnectionState, setPeerConnectionState] =
    useState<RTCPeerConnectionState>("new");
  const [isChannelConnected, setIsChannelConnected] = useState<boolean>(false);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const localMeshRef = useRef<LocalBroadcastSignaling | null>(null);
  const peerManagerRef = useRef<WebRTCPeerConnectionManager | null>(null);
  const isMatchFinishedRef = useRef<boolean>(false);
  const opponentIdRef = useRef<string | null>(null);
  const localReadyStateRef = useRef<{ isReady: boolean; videoConsent: boolean }>({
    isReady: false,
    videoConsent: false,
  });

  const onRemoteStreamRef = useRef(onRemoteStream);
  onRemoteStreamRef.current = onRemoteStream;

  const onMatchCompletedRef = useRef(onMatchCompleted);
  onMatchCompletedRef.current = onMatchCompleted;

  const serverEndTimeRef = useRef(serverEndTime);
  serverEndTimeRef.current = serverEndTime;

  /**
   * Initializes WebRTC peer connection manager
   */
  const initPeerManager = useCallback(() => {
    if (peerManagerRef.current) {
      return peerManagerRef.current;
    }

    const callbacks: WebRTCCallbacks = {
      onRemoteStream: (stream: MediaStream) => {
        onRemoteStreamRef.current?.(stream);
      },
      onIceCandidate: (candidate: RTCIceCandidate) => {
        const payload: SignalPayload = {
          from: userId,
          type: "candidate",
          candidate: candidate.toJSON(),
        };

        if (channelRef.current) {
          channelRef.current.send({
            type: "broadcast",
            event: "webrtc_signal",
            payload,
          });
        }

        if (localMeshRef.current) {
          localMeshRef.current.send("webrtc_signal", payload);
        }
      },
      onConnectionStateChange: (state: RTCPeerConnectionState) => {
        setPeerConnectionState(state);
      },
    };

    const manager = new WebRTCPeerConnectionManager(callbacks);
    manager.initialize(localStream || undefined);
    peerManagerRef.current = manager;
    return manager;
  }, [userId, localStream]);

  /**
   * Transmits repetition count and immutable kinematic telemetry to peer
   */
  const sendRepScore = useCallback(
    (score: number, telemetry: RepTelemetry) => {
      if (isMatchFinishedRef.current) {
        return;
      }

      // Client-side guard against late transmissions past server deadline
      if (serverEndTimeRef.current) {
        const deadline = new Date(serverEndTimeRef.current).getTime() + 1200;
        if (Date.now() > deadline) {
          console.warn("[useMatchSync] Suppressed score broadcast past server deadline.");
          return;
        }
      }

      const payload: ScorePayload = {
        userId,
        currentScore: score,
        telemetry,
        timestamp: Date.now(),
      };

      if (channelRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "score_update",
          payload,
        });
      }

      if (localMeshRef.current) {
        localMeshRef.current.send("score_update", payload);
      }
    },
    [userId]
  );

  /**
   * Broadcasts readiness state and initiates WebRTC negotiation if both ready
   */
  const setReady = useCallback(
    async (isReady: boolean, videoConsent: boolean) => {
      localReadyStateRef.current = { isReady, videoConsent };

      const payload: ReadyPayload = {
        userId,
        isReady,
        videoConsent,
      };

      if (channelRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "player_ready",
          payload,
        });
      }

      if (localMeshRef.current) {
        localMeshRef.current.send("player_ready", payload);
      }

      // If both players are ready and video consented, initiate offer if current user is initiator
      if (
        isReady &&
        videoConsent &&
        opponentIdRef.current &&
        userId < opponentIdRef.current
      ) {
        try {
          const manager = initPeerManager();
          const offer = await manager.createOffer();
          const signalPayload: SignalPayload = {
            from: userId,
            type: "offer",
            sdp: offer,
          };

          if (channelRef.current) {
            channelRef.current.send({
              type: "broadcast",
              event: "webrtc_signal",
              payload: signalPayload,
            });
          }

          if (localMeshRef.current) {
            localMeshRef.current.send("webrtc_signal", signalPayload);
          }
        } catch (err) {
          console.error("[useMatchSync] Failed to initiate WebRTC offer:", err);
        }
      }
    },
    [userId, initPeerManager]
  );

  /**
   * Graceful manual teardown
   */
  const disconnectSync = useCallback(() => {
    if (peerManagerRef.current) {
      peerManagerRef.current.destroy();
      peerManagerRef.current = null;
    }

    if (channelRef.current) {
      const supabase = getSupabaseBrowserClient();
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    if (localMeshRef.current) {
      localMeshRef.current.close();
      localMeshRef.current = null;
    }

    setIsChannelConnected(false);
  }, []);

  /**
   * Unified message ingestion logic shared between Supabase Realtime & Local BroadcastChannel
   */
  const handlePlayerReady = useCallback(
    async (payload: ReadyPayload) => {
      if (payload.userId === userId) {
        return;
      }

      opponentIdRef.current = payload.userId;
      setOpponentReady(payload.isReady);
      setOpponentVideoConsent(payload.videoConsent);

      if (
        payload.isReady &&
        payload.videoConsent &&
        localReadyStateRef.current.isReady &&
        localReadyStateRef.current.videoConsent &&
        userId < payload.userId
      ) {
        try {
          const manager = initPeerManager();
          const offer = await manager.createOffer();
          const signalPayload: SignalPayload = {
            from: userId,
            type: "offer",
            sdp: offer,
          };

          if (channelRef.current) {
            channelRef.current.send({
              type: "broadcast",
              event: "webrtc_signal",
              payload: signalPayload,
            });
          }

          if (localMeshRef.current) {
            localMeshRef.current.send("webrtc_signal", signalPayload);
          }
        } catch (err) {
          console.error("[useMatchSync] Error creating WebRTC offer:", err);
        }
      }
    },
    [userId, initPeerManager]
  );

  const handleWebRTCSignal = useCallback(
    async (payload: SignalPayload) => {
      if (payload.from === userId) {
        return;
      }

      opponentIdRef.current = payload.from;
      const manager = initPeerManager();

      try {
        if (payload.type === "offer" && payload.sdp) {
          const answer = await manager.handleOffer(payload.sdp);
          const answerPayload: SignalPayload = {
            from: userId,
            type: "answer",
            sdp: answer,
          };

          if (channelRef.current) {
            channelRef.current.send({
              type: "broadcast",
              event: "webrtc_signal",
              payload: answerPayload,
            });
          }

          if (localMeshRef.current) {
            localMeshRef.current.send("webrtc_signal", answerPayload);
          }
        } else if (payload.type === "answer" && payload.sdp) {
          await manager.handleAnswer(payload.sdp);
        } else if (payload.type === "candidate" && payload.candidate) {
          await manager.addIceCandidate(payload.candidate);
        }
      } catch (err) {
        console.error("[useMatchSync] WebRTC signaling processing error:", err);
      }
    },
    [userId, initPeerManager]
  );

  const handleScoreUpdate = useCallback(
    (payload: ScorePayload) => {
      if (payload.userId === userId || isMatchFinishedRef.current) {
        return;
      }

      if (serverEndTimeRef.current) {
        const maxAllowedTimestamp =
          new Date(serverEndTimeRef.current).getTime() + 1200;
        if (Date.now() > maxAllowedTimestamp) {
          console.warn(
            "[AntiCheat] Dropped score update arriving after authoritative server cutoff window."
          );
          return;
        }
      }

      setOpponentScore(payload.currentScore);
    },
    [userId]
  );

  /**
   * Channel lifecycle and signal binding
   */
  useEffect(() => {
    if (!matchId || !userId) {
      return;
    }

    // 1. Initialize Local Multi-Tab Mesh Fallback
    if (isLocalMeshAvailable()) {
      const mesh = new LocalBroadcastSignaling(`match_${matchId}`, userId);
      localMeshRef.current = mesh;

      mesh.on<ReadyPayload>("player_ready", (p) => handlePlayerReady(p));
      mesh.on<SignalPayload>("webrtc_signal", (p) => handleWebRTCSignal(p));
      mesh.on<ScorePayload>("score_update", (p) => handleScoreUpdate(p));
      mesh.on("match_finish", () => {
        isMatchFinishedRef.current = true;
        onMatchCompletedRef.current?.();
      });

      // Local mesh is immediately ready
      setIsChannelConnected(true);
    }

    // 2. Initialize Supabase Realtime Channel
    const supabase = getSupabaseBrowserClient();
    const channelTopic = `match:${matchId}`;
    const channel = supabase.channel(channelTopic, {
      config: {
        broadcast: { ack: false, self: false },
      },
    });

    channelRef.current = channel;

    channel.on(
      "broadcast",
      { event: "player_ready" },
      ({ payload }: { payload: ReadyPayload }) => handlePlayerReady(payload)
    );

    channel.on(
      "broadcast",
      { event: "webrtc_signal" },
      ({ payload }: { payload: SignalPayload }) => handleWebRTCSignal(payload)
    );

    channel.on(
      "broadcast",
      { event: "score_update" },
      ({ payload }: { payload: ScorePayload }) => handleScoreUpdate(payload)
    );

    channel.on("broadcast", { event: "match_finish" }, () => {
      isMatchFinishedRef.current = true;
      onMatchCompletedRef.current?.();
    });

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        setIsChannelConnected(true);
      } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
        // Fall back to local mesh status if available
        setIsChannelConnected(isLocalMeshAvailable());
      }
    });

    return () => {
      if (peerManagerRef.current) {
        peerManagerRef.current.destroy();
        peerManagerRef.current = null;
      }
      if (localMeshRef.current) {
        localMeshRef.current.close();
        localMeshRef.current = null;
      }
      channel.unsubscribe();
      supabase.removeChannel(channel);
      channelRef.current = null;
      setIsChannelConnected(false);
    };
  }, [matchId, userId, handlePlayerReady, handleWebRTCSignal, handleScoreUpdate]);

  /**
   * Track hot-swapping when localStream video/audio tracks toggle
   */
  useEffect(() => {
    if (!peerManagerRef.current) {
      return;
    }

    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0] ?? null;
      const audioTrack = localStream.getAudioTracks()[0] ?? null;

      peerManagerRef.current.replaceTrack(videoTrack, "video");
      peerManagerRef.current.replaceTrack(audioTrack, "audio");
    }
  }, [localStream]);

  return {
    opponentScore,
    opponentReady,
    opponentVideoConsent,
    peerConnectionState,
    isChannelConnected,
    sendRepScore,
    setReady,
    disconnectSync,
  };
}
