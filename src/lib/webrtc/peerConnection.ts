/**
 * WebRTC PeerConnection Manager for low-latency P2P video/audio streaming.
 * Handles ICE candidate negotiation, stream attachments, and track hot-swapping.
 */

export interface WebRTCCallbacks {
  onRemoteStream: (stream: MediaStream) => void;
  onIceCandidate: (candidate: RTCIceCandidate) => void;
  onConnectionStateChange: (state: RTCPeerConnectionState) => void;
}

const DEFAULT_RTC_CONFIGURATION: RTCConfiguration = {
  iceServers: [
    {
      urls: [
        "stun:stun.l.google.com:19302",
        "stun:stun1.l.google.com:19302",
        "stun:stun2.l.google.com:19302",
      ],
    },
  ],
  iceCandidatePoolSize: 10,
};

export class WebRTCPeerConnectionManager {
  private peerConnection: RTCPeerConnection | null = null;
  private pendingIceCandidates: RTCIceCandidateInit[] = [];
  private remoteStream: MediaStream | null = null;
  private localStream: MediaStream | null = null;
  private callbacks: WebRTCCallbacks;

  constructor(callbacks: WebRTCCallbacks) {
    this.callbacks = callbacks;
  }

  /**
   * Initializes the RTCPeerConnection, attaches local tracks (if provided),
   * and registers lifecycle event handlers.
   */
  public initialize(localStream?: MediaStream): void {
    if (this.peerConnection) {
      this.destroy();
    }

    this.localStream = localStream ?? null;
    this.remoteStream = new MediaStream();
    this.pendingIceCandidates = [];

    this.peerConnection = new RTCPeerConnection(DEFAULT_RTC_CONFIGURATION);

    // Attach local tracks
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        if (this.peerConnection && localStream) {
          this.peerConnection.addTrack(track, localStream);
        }
      });
    }

    // Handle inbound remote media tracks
    this.peerConnection.ontrack = (event: RTCTrackEvent) => {
      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0];
        this.callbacks.onRemoteStream(event.streams[0]);
      } else if (this.remoteStream) {
        this.remoteStream.addTrack(event.track);
        this.callbacks.onRemoteStream(this.remoteStream);
      }
    };

    // Forward ICE candidate to remote peer via signaling channel
    this.peerConnection.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
      if (event.candidate) {
        this.callbacks.onIceCandidate(event.candidate);
      }
    };

    // Monitor P2P connectivity state
    this.peerConnection.onconnectionstatechange = () => {
      if (this.peerConnection) {
        this.callbacks.onConnectionStateChange(this.peerConnection.connectionState);
      }
    };

    // Handle ICE connection state as fallback
    this.peerConnection.oniceconnectionstatechange = () => {
      if (!this.peerConnection) return;
      if (
        this.peerConnection.iceConnectionState === "failed" ||
        this.peerConnection.iceConnectionState === "disconnected"
      ) {
        this.callbacks.onConnectionStateChange("failed");
      }
    };
  }

  /**
   * Creates an SDP Offer and sets it as the local description.
   */
  public async createOffer(): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) {
      throw new Error("[WebRTC] RTCPeerConnection is not initialized.");
    }

    const offer = await this.peerConnection.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });

    await this.peerConnection.setLocalDescription(offer);
    return offer;
  }

  /**
   * Ingests an inbound SDP Offer from the remote peer, applies it,
   * flushes any queued ICE candidates, creates an SDP Answer, and returns it.
   */
  public async handleOffer(
    offer: RTCSessionDescriptionInit
  ): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) {
      throw new Error("[WebRTC] RTCPeerConnection is not initialized.");
    }

    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    await this.flushPendingCandidates();

    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    return answer;
  }

  /**
   * Ingests an inbound SDP Answer from the remote peer and flushes queued candidates.
   */
  public async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peerConnection) {
      throw new Error("[WebRTC] RTCPeerConnection is not initialized.");
    }

    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    await this.flushPendingCandidates();
  }

  /**
   * Adds an ICE candidate or queues it if remote description is not yet set.
   */
  public async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.peerConnection) {
      this.pendingIceCandidates.push(candidate);
      return;
    }

    if (this.peerConnection.remoteDescription && this.peerConnection.remoteDescription.type) {
      try {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.warn("[WebRTC] Error adding ICE candidate:", err);
      }
    } else {
      this.pendingIceCandidates.push(candidate);
    }
  }

  /**
   * Flushes all queued ICE candidates once the remote description is active.
   */
  private async flushPendingCandidates(): Promise<void> {
    if (!this.peerConnection || !this.peerConnection.remoteDescription) {
      return;
    }

    while (this.pendingIceCandidates.length > 0) {
      const candidate = this.pendingIceCandidates.shift();
      if (candidate) {
        try {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.warn("[WebRTC] Error adding queued ICE candidate:", err);
        }
      }
    }
  }

  /**
   * Swaps the active track in the corresponding transceiver when camera or microphone is toggled.
   */
  public async replaceTrack(
    newTrack: MediaStreamTrack | null,
    kind: "video" | "audio"
  ): Promise<void> {
    if (!this.peerConnection) {
      return;
    }

    const senders = this.peerConnection.getSenders();
    const sender = senders.find((s) => s.track && s.track.kind === kind);

    if (sender) {
      await sender.replaceTrack(newTrack);
    } else if (newTrack && this.localStream) {
      this.peerConnection.addTrack(newTrack, this.localStream);
    }
  }

  /**
   * Disposes all active tracks, listeners, and closes the peer connection.
   */
  public destroy(): void {
    if (this.peerConnection) {
      this.peerConnection.onicecandidate = null;
      this.peerConnection.ontrack = null;
      this.peerConnection.onconnectionstatechange = null;
      this.peerConnection.oniceconnectionstatechange = null;

      try {
        const senders = this.peerConnection.getSenders();
        senders.forEach((sender) => {
          if (sender.track) {
            sender.track.stop();
          }
        });
      } catch (err) {
        console.warn("[WebRTC] Error stopping senders:", err);
      }

      this.peerConnection.close();
      this.peerConnection = null;
    }

    this.remoteStream = null;
    this.localStream = null;
    this.pendingIceCandidates = [];
  }

  public getConnectionState(): RTCPeerConnectionState {
    return this.peerConnection?.connectionState ?? "closed";
  }
}

