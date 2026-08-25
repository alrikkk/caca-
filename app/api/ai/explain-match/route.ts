import { NextRequest, NextResponse } from "next/server";
import { serverAIProvider } from "@/ai/server-provider";
import { Project } from "@/types/project";
import { StudentProfile } from "@/types/user";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { project, student } = body as {
      project: Project;
      student: StudentProfile;
    };

    if (!project || !student) {
      return NextResponse.json(
        { error: "Invalid payload: 'project' and 'student' required." },
        { status: 400 }
      );
    }

    const result = await serverAIProvider.explainIndividualMatch(project, student);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[API /api/ai/explain-match] Error:", err);
    return NextResponse.json(
      { error: "Failed to generate match explanation" },
      { status: 500 }
    );
  }
}
