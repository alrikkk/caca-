import {
  ExtractedProjectRequirements,
  SkillNormalizationResult,
  TeamGapExplanation,
} from '@/types/ai';
import { Project } from '@/types/project';
import { TeamCompositionResult } from '@/types/matching';
import { AIProvider } from './provider';

/**
 * Mock AI Provider for local testing and deterministic hackathon demos
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

    if (['figma', 'ui design', 'ux'].includes(trimmed)) {
      return {
        rawInput: rawSkillName,
        canonicalName: 'UI/UX Design',
        category: 'design',
        aliases: ['Figma', 'Product Design'],
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
}

export function getAIProvider(): AIProvider {
  // Provider factory supporting configuration switch
  return new MockAIProvider();
}
