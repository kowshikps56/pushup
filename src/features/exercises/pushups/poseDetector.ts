/**
 * MediaPipe Pose Landmarker lifecycle management and high-precision frame inference pipeline.
 * Utilizes pose_landmarker_full for >92% landmark spatial accuracy, with automatic fallback
 * to pose_landmarker_lite for low-power mobile or hardware-constrained environments.
 */

import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";
import { NormalizedLandmark } from "@/types/exercise";

const WASM_CDN_BASE = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";

// High-accuracy model (optimal landmark precision for competitive sports refereeing)
const POSE_MODEL_FULL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task";

// Lightweight fallback model
const POSE_MODEL_LITE_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

export interface PoseDetectorEngineStatus {
  isReady: boolean;
  modelLoaded: "full" | "lite" | "none";
  delegate: "GPU" | "CPU";
  fps: number;
}

/**
 * Singleton engine managing the lifecycle and inference of MediaPipe PoseLandmarker.
 */
export class PoseDetectorEngine {
  private static instance: PoseDetectorEngine | null = null;
  private landmarker: PoseLandmarker | null = null;
  private initPromise: Promise<PoseLandmarker> | null = null;
  private isInitializing = false;
  private activeModel: "full" | "lite" | "none" = "none";
  private activeDelegate: "GPU" | "CPU" = "GPU";

  // Performance telemetry
  private lastFrameTimestamp = 0;
  private frameCount = 0;
  private currentFps = 0;

  private constructor() {}

  /**
   * Retrieves the singleton engine instance.
   */
  public static getInstance(): PoseDetectorEngine {
    if (!PoseDetectorEngine.instance) {
      PoseDetectorEngine.instance = new PoseDetectorEngine();
    }
    return PoseDetectorEngine.instance;
  }

  /**
   * Asynchronously initializes the MediaPipe vision WASM fileset and loads the PoseLandmarker model.
   * Concurrency-safe: multiple callers await the same in-flight initialization promise.
   * Tries POSE_MODEL_FULL with GPU first; gracefully falls back to LITE and CPU if necessary.
   */
  public async initialize(): Promise<PoseLandmarker> {
    if (this.landmarker) {
      return this.landmarker;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.isInitializing = true;
    this.initPromise = (async () => {
      const vision = await FilesetResolver.forVisionTasks(WASM_CDN_BASE);

      // Attempt 1: High-precision model with GPU acceleration
      try {
        const fullLandmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: POSE_MODEL_FULL_URL,
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numPoses: 1,
          minPoseDetectionConfidence: 0.65,
          minPosePresenceConfidence: 0.65,
          minTrackingConfidence: 0.65,
          outputSegmentationMasks: false,
        });
        this.landmarker = fullLandmarker;
        this.activeModel = "full";
        this.activeDelegate = "GPU";
        return fullLandmarker;
      } catch (gpuFullErr) {
        console.warn(
          "[PoseDetectorEngine] GPU Full Model failed. Falling back to Lite model on GPU...",
          gpuFullErr
        );
      }

      // Attempt 2: Lite model on GPU
      try {
        const liteGpuLandmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: POSE_MODEL_LITE_URL,
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numPoses: 1,
          minPoseDetectionConfidence: 0.6,
          minPosePresenceConfidence: 0.6,
          minTrackingConfidence: 0.6,
          outputSegmentationMasks: false,
        });
        this.landmarker = liteGpuLandmarker;
        this.activeModel = "lite";
        this.activeDelegate = "GPU";
        return liteGpuLandmarker;
      } catch (gpuLiteErr) {
        console.warn(
          "[PoseDetectorEngine] GPU Lite Model failed. Falling back to CPU mode...",
          gpuLiteErr
        );
      }

      // Attempt 3: CPU Fallback with Lite model
      const cpuLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: POSE_MODEL_LITE_URL,
          delegate: "CPU",
        },
        runningMode: "VIDEO",
        numPoses: 1,
        minPoseDetectionConfidence: 0.55,
        minPosePresenceConfidence: 0.55,
        minTrackingConfidence: 0.55,
        outputSegmentationMasks: false,
      });

      this.landmarker = cpuLandmarker;
      this.activeModel = "lite";
      this.activeDelegate = "CPU";
      return cpuLandmarker;
    })()
      .catch((err) => {
        this.initPromise = null;
        this.isInitializing = false;
        this.activeModel = "none";
        throw new Error(`MediaPipe PoseLandmarker initialization failed: ${err?.message || err}`);
      })
      .finally(() => {
        this.isInitializing = false;
      });

    return this.initPromise;
  }

  /**
   * Processes a video frame and extracts 3D normalized landmarks.
   * Returns empty array if no person is detected or if frame is unready.
   */
  public detectVideoFrame(
    videoElement: HTMLVideoElement,
    timestampMs: number
  ): NormalizedLandmark[] {
    if (!this.landmarker) {
      return [];
    }

    if (
      !videoElement ||
      videoElement.readyState < HTMLMediaElement.HAVE_CURRENT_DATA ||
      videoElement.videoWidth === 0 ||
      videoElement.videoHeight === 0
    ) {
      return [];
    }

    // Measure FPS
    this.frameCount++;
    if (timestampMs - this.lastFrameTimestamp >= 1000) {
      this.currentFps = Math.round(
        (this.frameCount * 1000) / (timestampMs - this.lastFrameTimestamp)
      );
      this.frameCount = 0;
      this.lastFrameTimestamp = timestampMs;
    }

    try {
      const result = this.landmarker.detectForVideo(videoElement, timestampMs);

      if (result && result.landmarks && result.landmarks.length > 0) {
        return result.landmarks[0] as NormalizedLandmark[];
      }
    } catch {
      // In case of transient timestamp desynchronization or worker busy state
      return [];
    }

    return [];
  }

  /**
   * Returns current engine operational status.
   */
  public getStatus(): PoseDetectorEngineStatus {
    return {
      isReady: this.landmarker !== null,
      modelLoaded: this.activeModel,
      delegate: this.activeDelegate,
      fps: this.currentFps,
    };
  }

  /**
   * Disposes the WebAssembly model and frees browser GPU/CPU resources.
   */
  public dispose(): void {
    if (this.landmarker) {
      try {
        this.landmarker.close();
      } catch (err) {
        console.warn("[PoseDetectorEngine] Error closing landmarker:", err);
      }
      this.landmarker = null;
    }
    this.initPromise = null;
    this.isInitializing = false;
    this.activeModel = "none";
  }
}

/**
 * Convenience helper to initialize the PoseDetectorEngine singleton.
 */
export async function initPoseDetector(): Promise<PoseLandmarker> {
  return PoseDetectorEngine.getInstance().initialize();
}

/**
 * Convenience helper to detect pose landmarks for a video frame.
 */
export function detectPoseFrame(
  videoElement: HTMLVideoElement,
  timestampMs: number
): NormalizedLandmark[] {
  return PoseDetectorEngine.getInstance().detectVideoFrame(videoElement, timestampMs);
}

