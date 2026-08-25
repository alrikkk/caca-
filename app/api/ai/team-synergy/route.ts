import { NextRequest, NextResponse } from "next/server";
import { serverAIProvider } from "@/ai/server-provider";
import { Project } from "@/types/project";
import { StudentProfile } from "@/types/user";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { project, teamMembers } = body as {
      project: Project;
      teamMembers: StudentProfile[];
    };

    if (!project || !teamMembers || !Array.isArray(teamMembers)) {
      return NextResponse.json(
        { error: "Invalid payload: 'project' and 'teamMembers' required." },
        { status: 400 }
      );
    }

    const result = await serverAIProvider.explainTeamSynergy(project, teamMembers);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[API /api/ai/team-synergy] Error:", err);
    return NextResponse.json(
      { error: "Failed to evaluate team synergy" },
      { status: 500 }
    );
  }
}
