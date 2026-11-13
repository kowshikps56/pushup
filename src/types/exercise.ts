/**
 * Kinematic models, coordinate representations, and finite state machine types
 * for AI-powered push-up tracking and form verification.
 */

/**
 * 3D spatial coordinate vector.
 */
export interface Point3D {
  x: number;
  y: number;
  z: number;
}

/**
 * MediaPipe-compatible normalized landmark coordinate with confidence visibility.
 * Coordinates are normalized to [0.0, 1.0] across video dimensions.
 */
export interface NormalizedLandmark extends Point3D {
  visibility?: number;
  presence?: number;
}

/**
 * Finite State Machine stages for a single push-up repetition cycle.
 * CALIBRATING: Initial orientation, establishing visibility and plank baseline.
 * TOP_POSITION: Arms extended (elbow angle >= 160°), body straight.
 * DESCENDING: Arms flexing, lowering chest towards ground.
 * BOTTOM_POSITION: Optimal depth achieved (elbow angle <= 90°).
 * ASCENDING: Arms extending upward towards plank position.
 * REP_COMPLETE: Full extension reached, telemetry finalized.
 */
export type PushUpPhase =
  | "CALIBRATING"
  | "TOP_POSITION"
  | "DESCENDING"
  | "BOTTOM_POSITION"
  | "ASCENDING"
  | "REP_COMPLETE";

/**
 * Categorized kinematic form fouls and anomaly tripwires.
 */
export type FormViolationType =
  | "INSUFFICIENT_DEPTH"
  | "BODY_SAGGING"
  | "BODY_PIKING"
  | "HIP_SAG"
  | "HIP_PIKE"
  | "LOW_CONFIDENCE"
  | "RAPID_CYCLE_JITTER"
  | "ASYMMETRIC_ELBOW"
  | "UNSTABLE_PACE";

export interface FormViolation {
  type: FormViolationType;
  message: string;
  timestamp: number;
  value?: number;
  threshold?: number;
}

/**
 * Immutable telemetry payload emitted upon completion of each valid repetition.
 */
export interface RepTelemetry {
  repNumber: number;
  durationMs: number;
  minElbowAngle: number;
  hipAlignmentScore: number;
  timestamp: number;
  violations?: FormViolation[];
}

/**
 * Frame-by-frame kinematic analysis emitted by the pose evaluation pipeline.
 */
export interface PoseFrameAnalysis {
  timestamp: number;
  phase: PushUpPhase;
  leftElbowAngle: number;
  rightElbowAngle: number;
  primaryElbowAngle: number;
  hipAlignmentAngle: number;
  isAligned: boolean;
  hasAdequateDepth: boolean;
  activeViolations: FormViolation[];
  landmarks: NormalizedLandmark[];
  confidence: number;
}

/**
 * MediaPipe Pose Landmarker key landmark indices (BlazePose 33-point topology).
 */
export const POSE_LANDMARKS = {
  NOSE: 0,
  LEFT_EYE_INNER: 1,
  LEFT_EYE: 2,
  LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4,
  RIGHT_EYE: 5,
  RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  MOUTH_LEFT: 9,
  MOUTH_RIGHT: 10,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_PINKY: 17,
  RIGHT_PINKY: 18,
  LEFT_INDEX: 19,
  RIGHT_INDEX: 20,
  LEFT_THUMB: 21,
  RIGHT_THUMB: 22,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32,
} as const;

export type PoseLandmarkIndex = (typeof POSE_LANDMARKS)[keyof typeof POSE_LANDMARKS];

/**
 * Configurable thresholds for kinematic push-up validation.
 */
export interface PushUpThresholds {
  minConfidence: number;
  topElbowAngle: number;
  bottomElbowAngle: number;
  minHipAngle: number;
  maxHipAngle: number;
  minCycleDurationMs: number;
}

export const DEFAULT_PUSHUP_THRESHOLDS: PushUpThresholds = {
  minConfidence: 0.65,
  topElbowAngle: 160.0,
  bottomElbowAngle: 90.0,
  minHipAngle: 150.0,
  maxHipAngle: 195.0,
  minCycleDurationMs: 600,
};

