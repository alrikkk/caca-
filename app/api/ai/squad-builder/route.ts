import { NextRequest, NextResponse } from "next/server";
import { serverAIProvider } from "@/ai/server-provider";
import { Project } from "@/types/project";
import { StudentProfile } from "@/types/user";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { project, candidates, currentMembers } = body as {
      project: Project;
      candidates: StudentProfile[];
      currentMembers?: StudentProfile[];
    };

    if (!project || !candidates || !Array.isArray(candidates)) {
      return NextResponse.json(
        { error: "Invalid payload: 'project' and 'candidates' array required." },
        { status: 400 }
      );
    }

    const result = await serverAIProvider.recommendSquad(
      project,
      candidates,
      currentMembers || []
    );

    return NextResponse.json(result);
  } catch (err) {
    console.error("[API /api/ai/squad-builder] Error:", err);
    return NextResponse.json(
      { error: "Failed to generate squad recommendations" },
      { status: 500 }
    );
  }
}
