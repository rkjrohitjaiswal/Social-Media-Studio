import { NextResponse } from "next/server";
import {
  getScheduleById,
  updateScheduledTime,
  cancelScheduledPublication,
} from "@/lib/queue/instagram-scheduler-worker";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; scheduleId: string }> }
) {
  try {
    const { scheduleId } = await params;
    const schedule = getScheduleById(scheduleId);

    if (!schedule) {
      return NextResponse.json({ success: false, error: "Schedule not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      schedule,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Failed to fetch schedule details";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; scheduleId: string }> }
) {
  try {
    const { scheduleId } = await params;
    const body = await request.json();
    const { scheduledFor, timezone } = body;

    if (!scheduledFor) {
      return NextResponse.json(
        { success: false, error: "scheduledFor date/time is required" },
        { status: 400 }
      );
    }

    const updated = updateScheduledTime(scheduleId, scheduledFor, timezone);

    return NextResponse.json({
      success: true,
      schedule: updated,
      message: "Schedule updated successfully",
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Failed to update schedule";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 400 });
  }
}

export async function DELETE(
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
