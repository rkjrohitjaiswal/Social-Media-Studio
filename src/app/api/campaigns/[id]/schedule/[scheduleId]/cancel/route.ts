import { NextResponse } from "next/server";
import { cancelScheduledPublication } from "@/lib/queue/instagram-scheduler-worker";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; scheduleId: string }> }
) {
  try {
    const { scheduleId } = await params;
    const cancelled = cancelScheduledPublication(scheduleId);

    return NextResponse.json({
      success: true,
      schedule: cancelled,
      message: "Schedule cancelled successfully",
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Failed to cancel schedule";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
