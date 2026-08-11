import { NextResponse } from "next/server";
import { retrySingleJobInRun } from "@/lib/queue/generation-worker";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await params;
    const body = await request.json();
    const { runId, jobId } = body;

    if (!runId || !jobId) {
      return NextResponse.json(
        { success: false, error: "Missing runId or jobId for job retry" },
        { status: 400 }
      );
    }

    const result = await retrySingleJobInRun(runId, jobId);

    if (!result) {
      return NextResponse.json(
        { success: false, error: "Job retry failed or job was not in FAILED state" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Job ${jobId} retried successfully`,
      run: result.run,
      job: result.job,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Failed to retry generation job";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
