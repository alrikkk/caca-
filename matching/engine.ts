import {
  IndividualMatchResult,
  MatchingWeights,
  TeamCompositionCandidate,
  TeamCompositionResult,
  TeamSkillCoverage,
} from '@/types/matching';
import { Project } from '@/types/project';
import { StudentProfile } from '@/types/user';
import { MATCHING_WEIGHTS } from './config';

/**
 * Deterministic Matching Engine for Caca
 * Separates Individual Compatibility Scoring from Holistic Team Composition Optimization.
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

        const userSkill = student.skills.find(
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
    if (student.availability.hoursPerWeek < project.hoursPerWeek) {
      const availRatio =
        student.availability.hoursPerWeek / project.hoursPerWeek;
      availabilityScore = Math.round(availRatio * 100);
    }

    // 4. Interest Alignment (15%)
    let interestScore = 50;
    const projectCategoryLower = project.category.toLowerCase();
    const hasCategoryInterest = student.interests.some(
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
    if (matchedSkills.length > 0) {
      const topSkills = matchedSkills.slice(0, 3).map((s) => s.skillName);
      explanation.push(`Proficient in ${topSkills.join(', ')}`);
    }
    if (availabilityScore >= 90) {
      explanation.push(
        `${student.availability.hoursPerWeek}h/wk commitment match`
      );
    }
    if (hasCategoryInterest) {
      explanation.push(`Aligned domain interest in ${project.category}`);
    }

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
    };
  }

  /**
   * Evaluates holistic team composition coverage and synergy.
   */
  public evaluateTeamComposition(
    teamMembers: StudentProfile[],
    project: Project
  ): TeamCompositionResult {
    const skillCoverages: TeamSkillCoverage[] = [];
    const missingSkills: string[] = [];

    for (const req of project.requiredSkills || []) {
      let bestCoverer: StudentProfile | null = null;
      let highestProf = 0;

      for (const member of teamMembers) {
        const found = member.skills.find(
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
          coveredBy: {
            userId: bestCoverer.id,
            userName: bestCoverer.fullName,
            proficiency: highestProf,
          },
        });
      } else {
        skillCoverages.push({
          skillName: req.skill.name,
          importance: req.importance,
          isCovered: false,
        });
        missingSkills.push(req.skill.name);
      }
    }

    const coveredCount = skillCoverages.filter((s) => s.isCovered).length;
    const totalRequired = skillCoverages.length || 1;
    const skillCoverageRatio = coveredCount / totalRequired;

    const uniqueCategories = new Set<string>();
    teamMembers.forEach((m) =>
      m.skills.forEach((s) => uniqueCategories.add(s.category))
    );
    const roleDiversityScore = Math.min(
      100,
      Math.round((uniqueCategories.size / Math.max(1, project.maxTeamSize)) * 100)
    );

    const totalHours = teamMembers.reduce(
      (acc, m) => acc + m.availability.hoursPerWeek,
      0
    );
    const neededHours = project.hoursPerWeek * project.maxTeamSize;
    const availabilityOverlapScore = Math.min(
      100,
      Math.round((totalHours / Math.max(1, neededHours)) * 100)
    );

    const teamScore = Math.round(
      skillCoverageRatio * 50 +
        (roleDiversityScore / 100) * 30 +
        (availabilityOverlapScore / 100) * 20
    );

    const recommendedMembers: TeamCompositionCandidate[] = teamMembers.map(
      (m) => {
        const ind = this.calculateIndividualMatch(m, project);
        const topContr = ind.matchedSkills.map((s) => s.skillName);
        return {
          student: m,
          assignedRole: m.headline || 'Contributor',
          individualMatchScore: ind.overallScore,
          primaryContributions: topContr,
        };
      }
    );

    return {
      projectId: project.id,
      teamScore: Math.min(100, Math.max(0, teamScore)),
      skillCoverageRatio,
      roleDiversityScore,
      availabilityOverlapScore,
      recommendedMembers,
      skillCoverages,
      gaps: {
        missingSkills,
        missingRoles: missingSkills.map((s) => `Specialist: ${s}`),
        riskNotes:
          missingSkills.length > 0
            ? [`Uncovered skills: ${missingSkills.join(', ')}`]
            : ['All required skills covered'],
      },
    };
  }
}

export const defaultMatchingEngine = new MatchingEngine();
