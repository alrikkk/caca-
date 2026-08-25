import { MatchingWeights } from "@/types/matching";

/**
 * Centralized Configuration for Caca Matching & Optimization Engine
 * Weighted components:
 * - Skill Match: 35%
 * - Experience: 20%
 * - Availability: 15%
 * - Interest Alignment: 15%
 * - Role Compatibility: 10%
 * - Working Style: 5%
 */
export const MATCHING_WEIGHTS: MatchingWeights = {
  skillMatch: 0.35,
  experience: 0.20,
  availability: 0.15,
  interestAlignment: 0.15,
  roleCompatibility: 0.10,
  workingStyle: 0.05,
};

export const MATCHING_THRESHOLDS = {
  highCompatibility: 85,
  moderateCompatibility: 70,
  minimumRecommended: 50,
};
