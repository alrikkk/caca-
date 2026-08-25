import {
  ExtractedProjectRequirements,
  GroundedMatchExplanation,
  SearchIntentResult,
  SkillNormalizationResult,
  SquadRecommendationResult,
  TeamGapExplanation,
  TeamSynergyExplanation,
} from '@/types/ai';
import { Project } from '@/types/project';
import { StudentProfile } from '@/types/user';
import { TeamCompositionResult } from '@/types/matching';
import { AIProvider } from './provider';
import { defaultMatchingEngine } from '@/matching/engine';

/**
 * Mock AI Provider for deterministic hackathon demos and bulletproof local fallback.
 * Uses the deterministic MatchingEngine as the ground truth foundation.
 */
export class MockAIProvider implements AIProvider {
  async extractProjectRequirements(
    rawDescription: string
  ): Promise<ExtractedProjectRequirements> {
    const text = rawDescription.toLowerCase();

    const isML = text.includes('ml') || text.includes('ai') || text.includes('model') || text.includes('vision');
    const isMobile = text.includes('mobile') || text.includes('ios') || text.includes('android') || text.includes('flutter');
    const isHardware = text.includes('robot') || text.includes('hardware') || text.includes('sensor') || text.includes('iot');

    const skills = [
      {
        name: isML ? 'PyTorch' : 'TypeScript',
        category: isML ? 'ml_ai' : 'frontend',
        requiredProficiency: 4,
        importance: 'required' as const,
        rationale: 'Core architecture and primary runtime framework',
      },
      {
        name: isMobile ? 'React Native' : 'Next.js',
        category: 'frontend',
        requiredProficiency: 3,
        importance: 'required' as const,
        rationale: 'Responsive interface for end-user discovery and interactions',
      },
      {
        name: 'PostgreSQL',
        category: 'backend',
        requiredProficiency: 3,
        importance: 'preferred' as const,
        rationale: 'Relational data modeling, querying, and user state storage',
      },
      {
        name: 'UI/UX Design',
        category: 'design',
        requiredProficiency: 3,
        importance: 'nice_to_have' as const,
        rationale: 'High fidelity wireframing, branding, and user research',
      },
    ];

    if (isHardware) {
      skills.push({
        name: 'Embedded C/C++',
        category: 'hardware',
        requiredProficiency: 4,
        importance: 'required' as const,
        rationale: 'Microcontroller firmware and sensor communication',
      });
    }

    return {
      suggestedTitle: 'Intelligent Campus System',
      tagline: 'Autonomous student-driven innovation initiative',
      category: isML ? 'AI / Machine Learning' : isHardware ? 'Robotics & IoT' : 'Web & Cloud Systems',
      estimatedDurationWeeks: 8,
      recommendedTeamSize: 4,
      recommendedHoursPerWeek: 12,
      skills,
      rolesNeeded: [
        'Lead Full-Stack Engineer',
        isML ? 'ML / Data Scientist' : 'Backend Systems Engineer',
        'Product & UI Designer',
      ],
    };
  }

  async normalizeSkill(rawSkillName: string): Promise<SkillNormalizationResult> {
    const trimmed = rawSkillName.trim().toLowerCase();

    if (['react', 'reactjs', 'react.js'].includes(trimmed)) {
      return {
        rawInput: rawSkillName,
        canonicalName: 'React',
        category: 'frontend',
        aliases: ['React.js', 'ReactJS'],
      };
    }

    if (['py', 'python3', 'python'].includes(trimmed)) {
      return {
        rawInput: rawSkillName,
        canonicalName: 'Python',
        category: 'backend',
        aliases: ['Python 3', 'PyPy'],
      };
    }

    if (['figma', 'ui design', 'ux', 'ui/ux'].includes(trimmed)) {
      return {
        rawInput: rawSkillName,
        canonicalName: 'UI/UX Design',
        category: 'design',
        aliases: ['Figma', 'Product Design', 'UI/UX'],
      };
    }

    return {
      rawInput: rawSkillName,
      canonicalName: rawSkillName.trim(),
      category: 'general',
      aliases: [],
    };
  }

  async explainTeamGaps(
    project: Project,
    composition: TeamCompositionResult
  ): Promise<TeamGapExplanation> {
    const missing = composition.gaps.missingSkills;
    const hasGaps = missing.length > 0;

    return {
      summary: hasGaps
        ? `Team has strong core capabilities but lacks coverage for ${missing.join(', ')}.`
        : 'Team has excellent cross-functional coverage across all primary requirements.',
      missingCapabilities: missing,
      recommendedNextHire: hasGaps
        ? `Recruit a student specializing in ${missing[0]} to unblock execution.`
        : 'All required technical roles are filled. Ready to kick off development.',
      synergyHighlights: [
        'Balanced distribution of frontend and systems background',
        'Matching weekly time commitments and availability windows',
      ],
    };
  }

  async recommendSquad(
    project: Project,
    candidates: StudentProfile[],
    currentMembers: StudentProfile[] = []
  ): Promise<SquadRecommendationResult> {
    const teamResult = defaultMatchingEngine.buildRecommendedSquad(candidates, project, currentMembers);

    const recommendedSquad = teamResult.recommendedMembers.map((member) => {
      const match = defaultMatchingEngine.calculateIndividualMatch(member.student, project);
      const matched = match.matchedSkills.map((s) => s.skillName);
      const missing = match.missingSkills;

      let role = member.assignedRole;
      if (!role || role === 'Contributor') {
        if (matched.some((s) => /react|next|typescript|vue|css/i.test(s))) {
          role = 'Frontend / App Architect';
        } else if (matched.some((s) => /pytorch|python|ml|cuda|model/i.test(s))) {
          role = 'ML & AI Lead';
        } else if (matched.some((s) => /design|figma|ux|ui/i.test(s))) {
          role = 'UI/UX & HCI Designer';
        } else if (matched.some((s) => /rust|c\+\+|systems|docker|postgres/i.test(s))) {
          role = 'Backend Systems Engineer';
        } else {
          role = member.student.headline || 'Squad Contributor';
        }
      }

      return {
        candidateId: member.student.id,
        candidateName: member.student.fullName,
        college: member.student.college,
        major: member.student.major,
        assignedRole: role,
        fitScore: match.overallScore,
        matchedSkills: matched,
        missingSkills: missing,
        rationale: match.explanation.join(' • ') || `Strong foundation in ${member.student.major}`,
        availabilityMatch: `${member.student.availability?.hoursPerWeek || 10}h/wk (${
          (member.student.availability?.hoursPerWeek || 10) >= project.hoursPerWeek ? 'Full match' : 'Partial match'
        })`,
        workingStyleFit: `${member.student.workingStyle.toUpperCase()} style`,
      };
    });

    const keyStrengths: string[] = [];
    if (teamResult.skillCoverages.some((s) => s.isCovered)) {
      const covered = teamResult.skillCoverages.filter((s) => s.isCovered).map((s) => s.skillName);
      keyStrengths.push(`Covers critical requirements: ${covered.join(', ')}`);
    }
    if (teamResult.availabilityOverlapScore >= 80) {
      keyStrengths.push('Combined weekly hours exceed minimum project requirements');
    }
    if (teamResult.roleDiversityScore >= 70) {
      keyStrengths.push('Complementary skill domains across UI, backend, and machine learning');
    }

    return {
      projectId: project.id,
      projectName: project.title,
      projectCategory: project.category,
      recommendedSquad,
      predictedSynergyScore: teamResult.teamScore,
      synergySummary:
        teamResult.gaps.missingSkills.length === 0
          ? 'Squad achieves 100% skill requirement coverage with balanced schedule overlap.'
          : `Squad fills ${teamResult.skillCoverages.filter((s) => s.isCovered).length} of ${
              teamResult.skillCoverages.length
            } capabilities; recruit ${teamResult.gaps.missingSkills[0]} to close final gap.`,
      keyStrengths,
      potentialRisks: teamResult.gaps.riskNotes,
    };
  }

  async explainIndividualMatch(
    project: Project,
    student: StudentProfile
  ): Promise<GroundedMatchExplanation> {
    const match = defaultMatchingEngine.calculateIndividualMatch(student, project);

    const whyYouMatch = (match.whyYouMatch || []).map((w) => ({
      label: w.title,
      detail: w.detail,
      type: w.type,
    }));

    const missingCapabilities = (match.missingPoints || []).map((m) => ({
      label: m.title,
      detail: m.detail,
    }));

    let roleSuitability = 'Solid general contributor across team priorities.';
    if (match.breakdown.skillScore >= 85) {
      roleSuitability = 'Primary technical driver for core project stack.';
    } else if (match.breakdown.interestScore >= 90) {
      roleSuitability = 'High domain motivation with fast ramp-up potential.';
    }

    return {
      overallFitScore: match.overallScore,
      summary:
        match.overallScore >= 85
          ? `Strong ${match.overallScore}% match driven by proficiency in ${match.matchedSkills
              .map((s) => s.skillName)
              .join(', ')} and schedule alignment.`
          : `Moderate ${match.overallScore}% match with complementary skills and active interest in ${project.category}.`,
      whyYouMatch,
      missingCapabilities,
      roleSuitability,
      growthOpportunities:
        match.missingSkills.length > 0
          ? [`Opportunity to learn ${match.missingSkills.join(', ')} alongside teammates.`]
          : ['Ready to mentor peers and lead sub-system modules.'],
    };
  }

  async explainTeamSynergy(
    project: Project,
    teamMembers: StudentProfile[]
  ): Promise<TeamSynergyExplanation> {
    const synergy = defaultMatchingEngine.evaluateTeamSynergy(teamMembers, project);
    const breakdown = synergy.synergyBreakdown || {
      skillCoverage: Math.round(synergy.skillCoverageRatio * 100),
      roleDiversity: synergy.roleDiversityScore,
      availabilityOverlap: synergy.availabilityOverlapScore,
      workingStyleHarmony: 90,
      experienceBalance: 85,
    };

    const covered = synergy.skillCoverages.filter((s) => s.isCovered).map((s) => s.skillName);
    const uncovered = synergy.gaps.missingSkills;

    const strengths: string[] = [];
    if (breakdown.skillCoverage >= 75) strengths.push('Broad technical coverage of primary stack requirements');
    if (breakdown.roleDiversity >= 70) strengths.push('Multi-disciplinary mix of frontend, backend, and domain roles');
    if (breakdown.availabilityOverlap >= 80) strengths.push('Sufficient weekly committed hours to hit project roadmap milestones');

    const recommendations: string[] = [];
    if (uncovered.length > 0) {
      recommendations.push(`Recruit a teammate with ${uncovered.join(', ')} proficiency to unblock delivery`);
    } else {
      recommendations.push('Team composition is complete. Ready to establish sprint cadence.');
    }

    return {
      synergyScore: synergy.teamScore,
      breakdown,
      summary:
        synergy.teamScore >= 85
          ? `High team synergy (${synergy.teamScore}%) with strong cross-functional balance.`
          : `Moderate team synergy (${synergy.teamScore}%); addressing open technical gaps will optimize output.`,
      coveredCapabilities: covered,
      uncoveredGaps: uncovered,
      strengths: strengths.length > 0 ? strengths : ['Collaborative core foundation'],
      recommendations,
    };
  }

  async parseSearchIntent(rawQuery: string): Promise<SearchIntentResult> {
    const lower = rawQuery.toLowerCase();

    const knownSkills = [
      'python', 'react', 'typescript', 'next.js', 'pytorch', 'figma', 'rust',
      'c++', 'docker', 'postgresql', 'tailwind', 'machine learning', 'ai', 'ux', 'ui'
    ];
    const knownRoles = [
      'designer', 'developer', 'engineer', 'researcher', 'architect', 'lead'
    ];
    const knownCategories = [
      'healthcare', 'vision', 'assistive', 'systems', 'edtech', 'biotech', 'robotics', 'fintech'
    ];

    const extractedSkills = knownSkills.filter((s) => lower.includes(s));
    const extractedRoles = knownRoles.filter((r) => lower.includes(r));
    const extractedCategories = knownCategories.filter((c) => lower.includes(c));

    const prefersEvenings = lower.includes('evening') || lower.includes('night');
    const prefersWeekends = lower.includes('weekend');
    let minHours: number | undefined = undefined;
    const hoursMatch = lower.match(/(\d+)\s*(h|hrs|hours)/);
    if (hoursMatch) {
      minHours = parseInt(hoursMatch[1], 10);
    }

    let experiencePreference: string | undefined = undefined;
    if (lower.includes('student') || lower.includes('beginner') || lower.includes('freshman')) {
      experiencePreference = 'junior';
    } else if (lower.includes('senior') || lower.includes('experienced') || lower.includes('grad')) {
      experiencePreference = 'senior';
    }

    const keywords = rawQuery
      .split(/\s+/)
      .map((w) => w.trim().replace(/[^\w]/g, ''))
      .filter((w) => w.length > 2);

    return {
      rawQuery,
      extractedSkills,
      extractedRoles,
      extractedCategories,
      experiencePreference,
      availabilityPreference: {
        minHours,
        prefersEvenings,
        prefersWeekends,
      },
      keywords,
    };
  }
}

export function getAIProvider(): AIProvider {
  return new MockAIProvider();
}
