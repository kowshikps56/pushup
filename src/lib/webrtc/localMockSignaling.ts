/**
 * Local Multi-Tab WebRTC Signaling Helper for PushUp Arena.
 * Utilizes the browser's native BroadcastChannel API to establish low-latency
 * 1v1 P2P WebRTC data & video meshes between two local tabs on localhost:3000
 * without requiring remote Supabase Realtime cloud infrastructure.
 */

import { RepTelemetry } from "@/types/exercise";

export interface LocalSignalEvent<T = unknown> {
  event: "player_ready" | "webrtc_signal" | "score_update" | "match_finish" | "tab_ping";
  senderId: string;
  payload: T;
  timestamp: number;
}

type EventListener<T = any> = (payload: T, senderId: string) => void;

export class LocalBroadcastSignaling {
  private channelName: string;
  private channel: BroadcastChannel | null = null;
  private userId: string;
  private listeners: Map<string, Set<EventListener>> = new Map();
  private isDestroyed = false;

  constructor(channelName = "pushup_arena_local_mesh", userId: string) {
    this.channelName = channelName;
    this.userId = userId;

    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        this.channel = new BroadcastChannel(this.channelName);
        this.channel.onmessage = (event: MessageEvent<LocalSignalEvent>) => {
          this.handleIncomingMessage(event.data);
        };
      } catch (err) {
        console.warn("[LocalBroadcastSignaling] Failed to initialize BroadcastChannel:", err);
      }
    }
  }

  /**
   * Dispatches a broadcast event across all tabs joined to the local channel mesh.
   */
  public send<T = unknown>(
    event: "player_ready" | "webrtc_signal" | "score_update" | "match_finish" | "tab_ping",
    payload: T
  ): void {
    if (this.isDestroyed || !this.channel) {
      return;
    }

    const message: LocalSignalEvent<T> = {
      event,
      senderId: this.userId,
      payload,
      timestamp: Date.now(),
    };

    try {
      this.channel.postMessage(message);
    } catch (err) {
      console.warn("[LocalBroadcastSignaling] Broadcast postMessage error:", err);
    }
  }

  /**
   * Registers an event callback for a specific signaling message type.
   * Returns an unregister cleanup function.
   */
  public on<T = any>(
    event: "player_ready" | "webrtc_signal" | "score_update" | "match_finish" | "tab_ping",
    callback: (payload: T, senderId: string) => void
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    const listenerSet = this.listeners.get(event)!;
    listenerSet.add(callback as EventListener);

    return () => {
      listenerSet.delete(callback as EventListener);
    };
  }

  /**
   * Routes incoming messages to registered event callbacks.
   * Filters out self-originating messages.
   */
  private handleIncomingMessage(message: LocalSignalEvent): void {
    if (!message || message.senderId === this.userId) {
      return;
    }

    const listeners = this.listeners.get(message.event);
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener(message.payload, message.senderId);
        } catch (err) {
          console.error(`[LocalBroadcastSignaling] Error in listener for ${message.event}:`, err);
        }
      });
    }
  }

  /**
   * Closes the BroadcastChannel and cleans up all event listeners.
   */
  public close(): void {
    this.isDestroyed = true;
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
    this.listeners.clear();
  }

  public getChannelName(): string {
    return this.channelName;
  }
}

/**
 * Checks whether the environment supports the BroadcastChannel API.
 */
export function isLocalMeshAvailable(): boolean {
  return typeof window !== "undefined" && "BroadcastChannel" in window;
}

