import {
  IndividualMatchResult,
  MatchingWeights,
  StructuredMatchWhy,
  TeamCompositionCandidate,
  TeamCompositionResult,
  TeamSkillCoverage,
  TeamSynergyBreakdown,
} from '@/types/matching';
import { Project, ProjectSkillRequirement } from '@/types/project';
import { StudentProfile } from '@/types/user';
import { MATCHING_WEIGHTS } from './config';

/**
 * Deterministic Matching Engine for Caca
 * Separates Individual Compatibility Scoring from Holistic Team Composition Optimization.
 *
 * Fixed Weights:
 * - Skill Match: 35%
 * - Experience: 20%
 * - Availability: 15%
 * - Interest Alignment: 15%
 * - Role Compatibility: 10%
 * - Working Style: 5%
 */
export class MatchingEngine {
  private weights: MatchingWeights;

  constructor(weights: MatchingWeights = MATCHING_WEIGHTS) {
    this.weights = weights;
  }

  /**
   * Calculates individual student compatibility with a project.
   */
  public calculateIndividualMatch(
    student: StudentProfile,
    project: Project
  ): IndividualMatchResult {
    // 1. Skill Score Calculation (35%)
    let skillScore = 0;
    const matchedSkills: IndividualMatchResult['matchedSkills'] = [];
    const missingSkills: string[] = [];

    if (!project.requiredSkills || project.requiredSkills.length === 0) {
      skillScore = 80;
    } else {
      let totalWeight = 0;
      let earnedWeight = 0;

      for (const req of project.requiredSkills) {
        const weightMultiplier =
          req.importance === 'required'
            ? 3
            : req.importance === 'preferred'
            ? 2
            : 1;

        totalWeight += weightMultiplier;

        const userSkill = student.skills?.find(
          (s) =>
            s.name.toLowerCase() === req.skill.name.toLowerCase() ||
            s.id === req.skill.id
        );

        if (userSkill) {
          const ratio = Math.min(
            1.0,
            userSkill.proficiency / req.requiredProficiency
          );
          earnedWeight += ratio * weightMultiplier;

          matchedSkills.push({
            skillName: req.skill.name,
            userProficiency: userSkill.proficiency,
            requiredProficiency: req.requiredProficiency,
            importance: req.importance,
            matchRatio: ratio,
          });
        } else {
          missingSkills.push(req.skill.name);
        }
      }

      skillScore = totalWeight > 0 ? (earnedWeight / totalWeight) * 100 : 0;
    }

    // 2. Experience Level Suitability (20%)
    const experienceLevelMap: Record<string, number> = {
      freshman: 1,
      sophomore: 2,
      junior: 3,
      senior: 4,
      grad: 5,
      alumni: 5,
    };
    const studentExp = experienceLevelMap[student.experienceLevel] || 2;
    const targetExp = project.durationWeeks > 8 ? 3 : 2;
    const expDiff = Math.abs(studentExp - targetExp);
    const experienceScore = Math.max(40, 100 - expDiff * 20);

    // 3. Availability Compatibility (15%)
    let availabilityScore = 100;
    const studentHours = student.availability?.hoursPerWeek || 10;
    if (studentHours < project.hoursPerWeek) {
      const availRatio = studentHours / Math.max(1, project.hoursPerWeek);
      availabilityScore = Math.round(availRatio * 100);
    }

    // 4. Interest Alignment (15%)
    let interestScore = 50;
    const projectCategoryLower = (project.category || '').toLowerCase();
    const hasCategoryInterest = (student.interests || []).some(
      (i) =>
        i.name.toLowerCase().includes(projectCategoryLower) ||
        projectCategoryLower.includes(i.name.toLowerCase()) ||
        i.category.toLowerCase() === projectCategoryLower
    );
    if (hasCategoryInterest) {
      interestScore = 95;
    }

    // 5. Role Compatibility (10%)
    const roleScore = matchedSkills.length > 0 ? 90 : 50;

    // 6. Working Style (5%)
    const workingStyleScoreMap: Record<string, number> = {
      collaborative: 95,
      structured: 90,
      'fast-paced': 85,
      independent: 80,
      'mentor-oriented': 90,
    };
    const workingStyleScore =
      workingStyleScoreMap[student.workingStyle] || 85;

    // Weighted Overall Score
    const overallScore = Math.round(
      skillScore * this.weights.skillMatch +
        experienceScore * this.weights.experience +
        availabilityScore * this.weights.availability +
        interestScore * this.weights.interestAlignment +
        roleScore * this.weights.roleCompatibility +
        workingStyleScore * this.weights.workingStyle
    );

    const explanation: string[] = [];
    const whyYouMatch: StructuredMatchWhy[] = [];
    const missingPoints: StructuredMatchWhy[] = [];

    // Construct grounded "WHY YOU MATCH" items
    matchedSkills.forEach((s) => {
      whyYouMatch.push({
        type: 'skill',
        title: s.skillName,
        detail: `Proficiency ${s.userProficiency}/5 meets ${s.requiredProficiency}/5 requirement (${s.importance})`,
        isPositive: true,
      });
    });

    if (studentHours >= project.hoursPerWeek) {
      whyYouMatch.push({
        type: 'availability',
        title: 'Availability Match',
        detail: `${studentHours}h/wk commitment satisfies project requirement (${project.hoursPerWeek}h/wk)`,
        isPositive: true,
      });
      explanation.push(`${studentHours}h/wk commitment match`);
    } else {
      missingPoints.push({
        type: 'availability',
        title: 'Time Commitment Gap',
        detail: `Available for ${studentHours}h/wk vs ${project.hoursPerWeek}h/wk target`,
        isPositive: false,
      });
    }

    if (hasCategoryInterest) {
      whyYouMatch.push({
        type: 'interest',
        title: 'Domain Interest Alignment',
        detail: `Verified interest in ${project.category}`,
        isPositive: true,
      });
      explanation.push(`Aligned domain interest in ${project.category}`);
    }

    if (student.workingStyle) {
      whyYouMatch.push({
        type: 'style',
        title: 'Working Style Fit',
        detail: `${student.workingStyle.toUpperCase()} style compatible with team cadence`,
        isPositive: true,
      });
    }

    // Construct grounded "MISSING" items
    missingSkills.forEach((skName) => {
      missingPoints.push({
        type: 'skill',
        title: skName,
        detail: `Project requires proficiency in ${skName}`,
        isPositive: false,
      });
    });

    if (matchedSkills.length > 0) {
      const topSkills = matchedSkills.slice(0, 3).map((s) => s.skillName);
      explanation.unshift(`Proficient in ${topSkills.join(', ')}`);
    }

    // Phase 5: Generate deterministic grounded summary & insight badges
    const topSkillNames = matchedSkills.map((s) => s.skillName);
    let groundedSummary = '';
    if (overallScore >= 85) {
      if (topSkillNames.length > 0) {
        groundedSummary = `You're a strong ${overallScore}% match because your ${topSkillNames.join(
          ' and '
        )} experience directly satisfies the project's primary technical requirements, and your ${studentHours}h/wk schedule fits the target cadence.`;
      } else {
        groundedSummary = `You're a strong ${overallScore}% match driven by aligned domain interest in ${project.category} and compatible schedule.`;
      }
    } else if (overallScore >= 70) {
      if (topSkillNames.length > 0) {
        groundedSummary = `You have a moderate ${overallScore}% match with core proficiency in ${topSkillNames.join(
          ', '
        )}; addressing open requirements will optimize project fit.`;
      } else {
        groundedSummary = `You have a moderate ${overallScore}% match with active domain alignment in ${project.category}.`;
      }
    } else {
      groundedSummary = `You have a ${overallScore}% baseline match. Participating will be a great growth opportunity to develop new skills alongside teammates.`;
    }

    const strongestOverlap =
      topSkillNames.length > 0
        ? `Your strongest overlap is ${topSkillNames.slice(0, 2).join(' + ')}.`
        : `Your strongest alignment is ${project.category} domain interest.`;

    const roleGapInsight =
      project.missingRoles && project.missingRoles.length > 0
        ? `This project still needs a ${project.missingRoles[0]} contributor.`
        : undefined;

    const scheduleOverlapInsight =
      studentHours >= project.hoursPerWeek
        ? `Your ${studentHours}h/wk availability satisfies the ${project.hoursPerWeek}h/wk target.`
        : `Available for ${studentHours}h/wk vs ${project.hoursPerWeek}h/wk project commitment.`;

    return {
      userId: student.id,
      projectId: project.id,
      overallScore: Math.min(100, Math.max(0, overallScore)),
      breakdown: {
        skillScore: Math.round(skillScore),
        experienceScore: Math.round(experienceScore),
        availabilityScore: Math.round(availabilityScore),
        interestScore: Math.round(interestScore),
        roleScore: Math.round(roleScore),
        workingStyleScore: Math.round(workingStyleScore),
      },
      matchedSkills,
      missingSkills,
      explanation,
      whyYouMatch,
      missingPoints,
      groundedSummary,
      strongestOverlap,
      roleGapInsight,
      scheduleOverlapInsight,
    };
  }

  /**
   * Ranks candidate profiles for a specific missing role or skillset.
   */
  public rankCandidatesForRole(
    candidates: StudentProfile[],
    roleTitle: string,
    requiredSkills: string[],
    project: Project
  ): Array<{
    candidate: StudentProfile;
    fitScore: number;
    matchedSkills: string[];
    missingSkills: string[];
    rationale: string;
  }> {
    const roleLower = roleTitle.toLowerCase();
    const reqLower = requiredSkills.map((s) => s.toLowerCase());

    const scored = candidates.map((cand) => {
      const ind = this.calculateIndividualMatch(cand, project);

      // Check role specific skill matching
      const userSkillNames = (cand.skills || []).map((s) => s.name.toLowerCase());
      const roleMatchedSkills = (cand.skills || [])
        .filter((s) =>
          reqLower.some((req) => s.name.toLowerCase().includes(req) || req.includes(s.name.toLowerCase()))
        )
        .map((s) => s.name);

      const roleMissingSkills = requiredSkills.filter(
        (req) => !userSkillNames.some((u) => u.includes(req.toLowerCase()) || req.toLowerCase().includes(u))
      );

      // Calculate role relevance boost
      let roleRelevance = 0;
      if (requiredSkills.length > 0) {
        roleRelevance = (roleMatchedSkills.length / requiredSkills.length) * 100;
      } else {
        const headlineLower = (cand.headline || '').toLowerCase();
        const majorLower = (cand.major || '').toLowerCase();
        if (headlineLower.includes(roleLower) || majorLower.includes(roleLower)) {
          roleRelevance = 90;
        } else {
          roleRelevance = 70;
        }
      }

      // Combine individual overall score (70%) with direct role skill relevance (30%)
      const fitScore = Math.min(100, Math.round(ind.overallScore * 0.7 + roleRelevance * 0.3));

      let rationale = '';
      if (roleMatchedSkills.length > 0) {
        rationale = `Strong background in ${roleMatchedSkills.join(', ')} (${cand.experienceLevel} level)`;
      } else if (ind.matchedSkills.length > 0) {
        rationale = `Brings complementary skills: ${ind.matchedSkills.map((s) => s.skillName).join(', ')}`;
      } else {
        rationale = `${cand.major} student with ${cand.availability?.hoursPerWeek || 10}h/wk availability`;
      }

      return {
        candidate: cand,
        fitScore,
        matchedSkills: roleMatchedSkills.length > 0 ? roleMatchedSkills : ind.matchedSkills.map((s) => s.skillName),
        missingSkills: roleMissingSkills,
        rationale,
      };
    });

    return scored.sort((a, b) => b.fitScore - a.fitScore);
  }

  /**
   * Evaluates holistic team synergy with transparent, explainable component math.
   *
   * Synergy weights:
   * - Skill Coverage: 50%
   * - Role Diversity & Coverage: 20%
   * - Availability Overlap: 15%
   * - Working Style Harmony: 10%
   * - Experience Balance: 5%
   */
  public evaluateTeamSynergy(
    teamMembers: StudentProfile[],
    project: Project
  ): TeamCompositionResult {
    if (!teamMembers || teamMembers.length === 0) {
      return {
        projectId: project.id,
        teamScore: 0,
        skillCoverageRatio: 0,
        roleDiversityScore: 0,
        availabilityOverlapScore: 0,
        synergyBreakdown: {
          skillCoverage: 0,
          roleDiversity: 0,
          availabilityOverlap: 0,
          workingStyleHarmony: 0,
          experienceBalance: 0,
        },
        recommendedMembers: [],
        skillCoverages: [],
        gaps: {
          missingSkills: (project.requiredSkills || []).map((s) => s.skill.name),
          missingRoles: project.missingRoles || [],
          riskNotes: ['Team has no members assigned yet'],
        },
      };
    }

    // 1. Skill Coverage (50%)
    const skillCoverages: TeamSkillCoverage[] = [];
    const missingSkills: string[] = [];
    const partiallyCoveredSkills: string[] = [];

    for (const req of project.requiredSkills || []) {
      let bestCoverer: StudentProfile | null = null;
      let highestProf = 0;

      for (const member of teamMembers) {
        const found = (member.skills || []).find(
          (s) =>
            s.name.toLowerCase() === req.skill.name.toLowerCase() ||
            s.id === req.skill.id
        );
        if (found && found.proficiency > highestProf) {
          highestProf = found.proficiency;
          bestCoverer = member;
        }
      }

      if (bestCoverer && highestProf >= req.requiredProficiency) {
        skillCoverages.push({
          skillName: req.skill.name,
          importance: req.importance,
          isCovered: true,
          status: 'covered',
          currentProficiency: highestProf,
          coveredBy: {
            userId: bestCoverer.id,
            userName: bestCoverer.fullName,
            proficiency: highestProf,
          },
        });
      } else if (bestCoverer && highestProf > 0) {
        skillCoverages.push({
          skillName: req.skill.name,
          importance: req.importance,
          isCovered: false,
          status: 'partially_covered',
          currentProficiency: highestProf,
          coveredBy: {
            userId: bestCoverer.id,
            userName: bestCoverer.fullName,
            proficiency: highestProf,
          },
        });
        partiallyCoveredSkills.push(req.skill.name);
        missingSkills.push(req.skill.name);
      } else {
        skillCoverages.push({
          skillName: req.skill.name,
          importance: req.importance,
          isCovered: false,
          status: 'missing',
          currentProficiency: 0,
        });
        missingSkills.push(req.skill.name);
      }
    }

    const coveredCount = skillCoverages.filter((s) => s.isCovered).length;
    const totalRequired = skillCoverages.length || 1;
    const skillCoverageScore = Math.round((coveredCount / totalRequired) * 100);
    const skillCoverageRatio = coveredCount / totalRequired;

    // 2. Role Diversity & Coverage (20%)
    const uniqueCategories = new Set<string>();
    teamMembers.forEach((m) =>
      (m.skills || []).forEach((s) => uniqueCategories.add(s.category))
    );
    const targetCategories = Math.min(3, project.maxTeamSize);
    const roleDiversityScore = Math.min(
      100,
      Math.round((uniqueCategories.size / Math.max(1, targetCategories)) * 100)
    );

    // 3. Availability Overlap & Total Hours (15%)
    const totalHours = teamMembers.reduce(
      (acc, m) => acc + (m.availability?.hoursPerWeek || 10),
      0
    );
    const neededHours = project.hoursPerWeek * Math.min(teamMembers.length, project.maxTeamSize);
    const availabilityOverlapScore = Math.min(
      100,
      Math.round((totalHours / Math.max(1, neededHours)) * 100)
    );

    // 4. Working Style Harmony (10%)
    const styles = teamMembers.map((m) => m.workingStyle || 'collaborative');
    const hasCollaborative = styles.some((s) => s === 'collaborative' || s === 'mentor-oriented');
    const allIndependent = styles.every((s) => s === 'independent');
    const workingStyleHarmony = allIndependent ? 70 : hasCollaborative ? 95 : 85;

    // 5. Experience Balance (5%)
    const expLevels = teamMembers.map((m) => m.experienceLevel);
    const hasSeniorOrGrad = expLevels.some((e) => ['junior', 'senior', 'grad', 'alumni'].includes(e));
    const experienceBalance = hasSeniorOrGrad ? 95 : 80;

    // Aggregate Synergy Score
    const teamScore = Math.min(
      100,
      Math.max(
        0,
        Math.round(
          skillCoverageScore * 0.50 +
            roleDiversityScore * 0.20 +
            availabilityOverlapScore * 0.15 +
            workingStyleHarmony * 0.10 +
            experienceBalance * 0.05
        )
      )
    );

    const synergyBreakdown: TeamSynergyBreakdown = {
      skillCoverage: skillCoverageScore,
      roleDiversity: roleDiversityScore,
      availabilityOverlap: availabilityOverlapScore,
      workingStyleHarmony,
      experienceBalance,
    };

    const recommendedMembers: TeamCompositionCandidate[] = teamMembers.map(
      (m) => {
        const ind = this.calculateIndividualMatch(m, project);
        const topContr = ind.matchedSkills.map((s) => s.skillName);
        return {
          student: m,
          assignedRole: m.headline || 'Contributor',
          individualMatchScore: ind.overallScore,
          primaryContributions: topContr,
          matchedSkills: topContr,
          fitRationale: ind.explanation.join(' • ') || `${m.major} contributor`,
        };
      }
    );

    const riskNotes: string[] = [];
    if (missingSkills.length > 0) {
      riskNotes.push(`Uncovered critical skills: ${missingSkills.join(', ')}`);
    }
    if (availabilityOverlapScore < 80) {
      riskNotes.push(`Team committed hours (${totalHours}h/wk) is below ideal target (${neededHours}h/wk)`);
    }
    if (riskNotes.length === 0) {
      riskNotes.push('Excellent full cross-functional coverage and balanced schedule');
    }

    // Phase 5: Generate deterministic grounded team insight summary
    let teamInsightSummary = '';
    if (teamScore >= 85 && missingSkills.length === 0) {
      teamInsightSummary = `Your squad achieves 100% cross-functional role coverage with strong weekly schedule alignment (${totalHours}h/wk total) and balanced experience levels.`;
    } else if (missingSkills.length > 0) {
      teamInsightSummary = `Your squad covers ${coveredCount} of ${totalRequired} core requirements. Recruiting a specialist in ${missingSkills[0]} will optimize delivery.`;
    } else {
      teamInsightSummary = `Squad has solid baseline synergy (${teamScore}%). Schedule commitment stands at ${totalHours}h/wk total.`;
    }

    return {
      projectId: project.id,
      teamScore,
      skillCoverageRatio,
      roleDiversityScore,
      availabilityOverlapScore,
      synergyBreakdown,
      recommendedMembers,
      skillCoverages,
      gaps: {
        missingSkills,
        missingRoles: missingSkills.map((s) => `Specialist: ${s}`),
        riskNotes,
      },
      teamInsightSummary,
    };
  }

  /**
   * Deterministically composes an optimal squad recommendation for a project from candidate pool.
   */
  public buildRecommendedSquad(
    candidates: StudentProfile[],
    project: Project,
    currentMembers: StudentProfile[] = []
  ): TeamCompositionResult {
    const currentIds = new Set(currentMembers.map((m) => m.id));
    const availablePool = candidates.filter((c) => !currentIds.has(c.id));
    const targetTeamSize = project.maxTeamSize || 4;
    const neededCount = Math.max(1, targetTeamSize - currentMembers.length);

    // Identify project skills that still need coverage
    const coveredSkills = new Set<string>();
    currentMembers.forEach((m) =>
      (m.skills || []).forEach((s) => coveredSkills.add(s.name.toLowerCase()))
    );

    const projectReqs = project.requiredSkills || [];
    const selectedSquad: StudentProfile[] = [...currentMembers];
    const candidatePool = [...availablePool];

    // Iteratively pick the candidate providing the highest marginal synergy gain
    for (let slot = 0; slot < neededCount && candidatePool.length > 0; slot++) {
      let bestCandidate: StudentProfile | null = null;
      let highestGain = -1;
      let bestIndex = -1;

      for (let i = 0; i < candidatePool.length; i++) {
        const candidate = candidatePool[i];
        const prospectiveTeam = [...selectedSquad, candidate];
        const synergy = this.evaluateTeamSynergy(prospectiveTeam, project);

        // Phase 5: Heavy marginal synergy bonus for filling uncovered skills & roles
        let unfulfilledSkillBonus = 0;
        (candidate.skills || []).forEach((s) => {
          const sLower = s.name.toLowerCase();
          if (!coveredSkills.has(sLower) && projectReqs.some((r) => r.skill.name.toLowerCase() === sLower)) {
            unfulfilledSkillBonus += 25; // Priority boost for filling missing capability track
          }
        });

        // Bonus for complementary working style
        if (candidate.workingStyle === 'collaborative' || candidate.workingStyle === 'mentor-oriented') {
          unfulfilledSkillBonus += 5;
        }

        const totalScore = synergy.teamScore + unfulfilledSkillBonus;
        if (totalScore > highestGain) {
          highestGain = totalScore;
          bestCandidate = candidate;
          bestIndex = i;
        }
      }

      if (bestCandidate && bestIndex >= 0) {
        selectedSquad.push(bestCandidate);
        (bestCandidate.skills || []).forEach((s) => coveredSkills.add(s.name.toLowerCase()));
        candidatePool.splice(bestIndex, 1);
      }
    }

    return this.evaluateTeamSynergy(selectedSquad, project);
  }

  /**
   * Compatibility wrapper for existing callers.
   */
  public evaluateTeamComposition(
    teamMembers: StudentProfile[],
    project: Project
  ): TeamCompositionResult {
    return this.evaluateTeamSynergy(teamMembers, project);
  }
}

export const defaultMatchingEngine = new MatchingEngine();
