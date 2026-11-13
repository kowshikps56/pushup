/**
 * Mathematical Elo Rating Calculation Engine for PushUp Arena.
 * Standard FIDE/USCF logistics formulation with dynamic provisional K-factors.
 */

import { TierType } from "@/types/database";

export type CompetitiveTier = TierType;

/**
 * Calculates the expected probability outcome E_A for Player A against Player B:
 * E_A = 1 / (1 + 10^((R_B - R_A) / 400))
 * @returns Expected score in range (0.0, 1.0)
 */
export function calculateExpectedScore(ratingA: number, ratingB: number): number {
  return 1.0 / (1.0 + Math.pow(10.0, (ratingB - ratingA) / 400.0));
}

/**
 * Calculates the rating shift for Player A after a match:
 * ΔR_A = K * (S_A - E_A)
 * @param ratingA Current rating of Player A
 * @param ratingB Current rating of Player B
 * @param actualScore 1 for win, 0.5 for draw, 0 for loss
 * @param matchesPlayed Total matches played by Player A to determine K-factor
 * @returns Rating change rounded to 2 decimal places
 */
export function calculateRatingDelta(
  ratingA: number,
  ratingB: number,
  actualScore: 1 | 0.5 | 0,
  matchesPlayed: number
): number {
  const kFactor = matchesPlayed < 20 ? 32 : 16;
  const expected = calculateExpectedScore(ratingA, ratingB);
  const delta = kFactor * (actualScore - expected);
  return Math.round(delta * 100) / 100;
}

/**
 * Maps an Elo rating score to a competitive division tier.
 */
export function getTierFromRating(rating: number): CompetitiveTier {
  if (rating >= 2300) return "Master";
  if (rating >= 2000) return "Diamond";
  if (rating >= 1700) return "Platinum";
  if (rating >= 1400) return "Gold";
  if (rating >= 1100) return "Silver";
  return "Bronze";
}

/**
 * Computes prospective win and loss deltas for pre-match odds previews.
 */
export function calculateProspectiveDeltas(
  ratingA: number,
  ratingB: number,
  matchesPlayedA: number
): { winDelta: number; lossDelta: number; winProbability: number } {
  const winDelta = calculateRatingDelta(ratingA, ratingB, 1, matchesPlayedA);
  const lossDelta = calculateRatingDelta(ratingA, ratingB, 0, matchesPlayedA);
  const winProbability = Math.round(calculateExpectedScore(ratingA, ratingB) * 100);

  return { winDelta, lossDelta, winProbability };
}

